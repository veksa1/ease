"""
FastAPI Service - Ticket 010

REST API service for ALINE migraine prediction model.
Provides endpoints for:
- /health - Health check
- /risk/daily - Daily migraine risk prediction
- /posterior/hourly - Hourly posterior distributions
- /policy/topk - Top-k hour recommendations

Author: ALINE Team
Date: 2025-11-15
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import torch
import yaml
import logging
from datetime import datetime
from typing import List

from models.aline import SimpleALINE
from models.policy_utils import compute_priority_scores, select_topk_hours
from service.schemas import (
    HealthResponse,
    DailyRiskRequest,
    DailyRiskResponse,
    PosteriorRequest,
    PosteriorResponse,
    HourlyPosterior,
    PolicyRequest,
    PolicyResponse,
    SelectedHour,
    CalendarConnectionRequest,
    CalendarConnectionResponse,
    CalendarStatusResponse,
    ContextGenerationRequest,
    ContextGenerationResponse,
    FeedbackRequest,
    FeedbackResponse,
    AccuracyResponse,
    FeedbackHistoryItem,
    FeedbackHistoryResponse
)
from service.database import db
from service.calendar import calendar_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state
app_state = {
    'model': None,
    'device': None,
    'config': None,
    'migraine_weights': None,
    'migraine_bias': None,
    'model_loaded': False
}


def load_model_and_config():
    """Load model and configuration at startup"""
    try:
        import os
        import re
        
        # Load service config
        config_path = Path(__file__).parent.parent / 'configs' / 'service.yaml'
        with open(config_path) as f:
            config_content = f.read()
            # Expand environment variables in format ${VAR:default}
            def expand_env_var(match):
                var_expr = match.group(1)
                if ':' in var_expr:
                    var_name, default = var_expr.split(':', 1)
                    return os.getenv(var_name.strip(), default.strip())
                else:
                    return os.getenv(var_expr.strip(), '')
            config_content = re.sub(r'\$\{([^}]+)\}', expand_env_var, config_content)
            service_config = yaml.safe_load(config_content)
        
        # Load model config
        model_config_path = Path(__file__).parent.parent / service_config['model']['config_path']
        with open(model_config_path) as f:
            model_config = yaml.safe_load(f)
        
        # Determine device
        device_setting = service_config['model']['device']
        if device_setting == 'auto':
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            device = torch.device(device_setting)
        
        logger.info(f"Using device: {device}")
        
        # Load model
        checkpoint_path = Path(__file__).parent.parent / service_config['model']['checkpoint_path']
        
        if not checkpoint_path.exists():
            logger.warning(f"Model checkpoint not found at {checkpoint_path}")
            logger.warning("Service will start but model predictions will be unavailable")
            app_state['model_loaded'] = False
            app_state['config'] = service_config
            return
        
        checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
        
        model = SimpleALINE(
            in_dim=model_config['in_dim'],
            z_dim=model_config['z_dim'],
            d_model=model_config['d_model'],
            nhead=model_config['nhead'],
            nlayers=model_config['nlayers']
        )
        model.load_state_dict(checkpoint['model_state_dict'])
        model.to(device)
        model.eval()
        
        logger.info(f"Model loaded successfully from {checkpoint_path}")
        logger.info(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
        
        # Store in global state
        app_state['model'] = model
        app_state['device'] = device
        app_state['config'] = service_config
        app_state['migraine_weights'] = torch.tensor(
            service_config['migraine_model']['weights'],
            device=device
        )
        app_state['migraine_bias'] = service_config['migraine_model']['bias']
        app_state['model_loaded'] = True
        
        logger.info("✓ Service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    import os
    logger.info(f"Starting ALINE service on port {os.getenv('PORT', '8000')}")
    logger.info(f"Host: {os.getenv('HOST', '0.0.0.0')}")
    try:
        load_model_and_config()
        logger.info("✓ Startup completed successfully")
    except Exception as e:
        logger.error(f"✗ Startup failed: {e}", exc_info=True)
        raise
    
    yield
    
    # Shutdown (cleanup if needed)
    logger.info("Shutting down ALINE service")
    await weather_service.close()
    logger.info("✓ Weather service closed")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="ALINE Migraine Prediction API",
    description="API for daily migraine risk prediction with active querying policy",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        model_loaded=app_state['model_loaded']
    )


@app.post("/risk/daily", response_model=DailyRiskResponse)
async def risk_daily(request: DailyRiskRequest):
    """
    Predict daily migraine risk from 24 hours of data.
    
    Returns mean probability and 90% confidence interval.
    """
    if not app_state['model_loaded']:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Validate input
        if len(request.features) != 24:
            raise HTTPException(
                status_code=400,
                detail=f"Expected 24 hours of features, got {len(request.features)}"
            )
        
        # Convert to tensor
        features = torch.FloatTensor(request.features).unsqueeze(0)  # [1, 24, n_features]
        features = features.to(app_state['device'])
        
        # Model inference
        model = app_state['model']
        with torch.no_grad():
            posterior, _ = model(features)
            
            # Sample from posterior to get uncertainty
            n_samples = 1000
            mu = posterior.mean[0, -1, :]  # Last time step
            sigma = posterior.stddev[0, -1, :]
            
            samples = torch.randn(n_samples, len(mu), device=app_state['device']) * sigma + mu
            probs = torch.sigmoid((samples @ app_state['migraine_weights']) + app_state['migraine_bias'])
            
            mean_prob = probs.mean().item()
            lower_bound = torch.quantile(probs, 0.05).item()
            upper_bound = torch.quantile(probs, 0.95).item()
        
        return DailyRiskResponse(
            user_id=request.user_id,
            mean_probability=mean_prob,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Error in risk_daily: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/posterior/hourly", response_model=PosteriorResponse)
async def posterior_hourly(request: PosteriorRequest):
    """
    Get hourly posterior distributions over latent states.
    
    Returns mean and std for each hour.
    """
    if not app_state['model_loaded']:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Validate input
        if len(request.features) != 24:
            raise HTTPException(
                status_code=400,
                detail=f"Expected 24 hours of features, got {len(request.features)}"
            )
        
        # Convert to tensor
        features = torch.FloatTensor(request.features).unsqueeze(0)
        features = features.to(app_state['device'])
        
        # Model inference
        model = app_state['model']
        with torch.no_grad():
            posterior, _ = model(features)
            means = posterior.mean[0].cpu().numpy()  # [24, z_dim]
            stds = posterior.stddev[0].cpu().numpy()  # [24, z_dim]
        
        # Build response
        hourly_posteriors = [
            HourlyPosterior(
                hour=i,
                mean=means[i].tolist(),
                std=stds[i].tolist()
            )
            for i in range(24)
        ]
        
        return PosteriorResponse(
            user_id=request.user_id,
            hourly_posteriors=hourly_posteriors,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Error in posterior_hourly: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/policy/topk", response_model=PolicyResponse)
async def policy_topk(request: PolicyRequest):
    """
    Recommend top-k hours to sample/query based on priority scores.
    
    Uses uncertainty and impact to select most informative hours.
    """
    if not app_state['model_loaded']:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Validate input
        if len(request.features) != 24:
            raise HTTPException(
                status_code=400,
                detail=f"Expected 24 hours of features, got {len(request.features)}"
            )
        
        # Convert to tensor
        features = torch.FloatTensor(request.features).unsqueeze(0)
        features = features.to(app_state['device'])
        
        # Model inference
        model = app_state['model']
        with torch.no_grad():
            posterior, _ = model(features)
            
            # Compute priority scores
            priority_scores = compute_priority_scores(
                posterior.mean[0],
                posterior.stddev[0],
                app_state['migraine_weights'],
                app_state['migraine_bias'],
                lambda1=app_state['config']['policy']['lambda1'],
                lambda2=app_state['config']['policy']['lambda2'],
                lambda3=app_state['config']['policy']['lambda3']
            )
            
            # Select top-k
            indices, scores = select_topk_hours(priority_scores, request.k, return_scores=True)
        
        # Build response
        selected_hours = [
            SelectedHour(
                hour=int(indices[i].item()),
                priority_score=float(scores[i].item())
            )
            for i in range(len(indices))
        ]
        
        return PolicyResponse(
            user_id=request.user_id,
            selected_hours=selected_hours,
            k=request.k,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Error in policy_topk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Calendar Integration Endpoints (Ticket 019)
# ============================================================================

@app.post("/user/calendar", response_model=CalendarConnectionResponse)
async def save_calendar_connection(request: CalendarConnectionRequest):
    """
    Save user's calendar ICS/WebCal URL
    
    Validates the URL and stores it for future context generation.
    """
    try:
        # Validate and normalize URL
        validation_result = await calendar_service.validate_and_normalize(request.calendarUrl)
        
        if not validation_result['valid']:
            raise HTTPException(
                status_code=400,
                detail=validation_result['error']
            )
        
        # Save to database
        connection = db.save_calendar_connection(
            user_id=request.userId,
            calendar_url=request.calendarUrl,
            normalized_url=validation_result['normalizedUrl']
        )
        
        # Update verification timestamp
        db.update_verification_time(request.userId)
        
        return CalendarConnectionResponse(
            status="ok",
            userId=request.userId,
            lastVerifiedAt=connection['updatedAt'],
            message="Calendar connected successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving calendar connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user/calendar/{user_id}", response_model=CalendarStatusResponse)
async def get_calendar_status(user_id: str):
    """
    Get calendar connection status for a user
    """
    try:
        connection = db.get_calendar_connection(user_id)
        
        if connection:
            return CalendarStatusResponse(
                connected=True,
                userId=user_id,
                lastVerifiedAt=connection.get('lastVerifiedAt')
            )
        else:
            return CalendarStatusResponse(
                connected=False,
                userId=user_id
            )
    
    except Exception as e:
        logger.error(f"Error getting calendar status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/user/calendar/{user_id}")
async def delete_calendar_connection(user_id: str):
    """
    Delete calendar connection for a user
    """
    try:
        deleted = db.delete_calendar_connection(user_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Calendar connection not found")
        
        return {"status": "ok", "message": "Calendar connection deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting calendar connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/aline/generate-context", response_model=ContextGenerationResponse)
async def generate_context(request: ContextGenerationRequest):
    """
    Generate context posteriors from calendar and priors
    
    Sends calendar URL and prior distributions to n8n workflow,
    which analyzes calendar events and returns updated posteriors.
    """
    try:
        # Get user's calendar connection
        connection = db.get_calendar_connection(request.userId)
        
        if not connection:
            raise HTTPException(
                status_code=404,
                detail="No calendar connected for this user"
            )
        
        # Get n8n webhook URL from config
        n8n_url = app_state['config'].get('n8n', {}).get('webhook_url')
        if not n8n_url:
            raise HTTPException(
                status_code=500,
                detail="n8n webhook URL not configured"
            )
        
        # Call n8n workflow
        result = await calendar_service.generate_context_with_calendar(
            user_id=request.userId,
            calendar_url=connection['normalizedUrl'],
            priors=request.priors,
            n8n_webhook_url=n8n_url
        )
        
        # Update verification timestamp
        db.update_verification_time(request.userId)
        
        return ContextGenerationResponse(
            userId=request.userId,
            posteriors=result.get('posteriors', {}),
            features=result.get('features', []),
            timestamp=datetime.now().isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Weather Endpoints (Ticket 023)
# ============================================================================

from service.weather import weather_service
from pydantic import BaseModel, Field


class WeatherResponse(BaseModel):
    """Current weather conditions response"""
    pressure: float = Field(..., description="Barometric pressure in hPa")
    temperature: float = Field(..., description="Temperature in °C")
    humidity: float = Field(..., description="Humidity in %")
    aqi: float = Field(..., description="Air Quality Index")
    location: dict = Field(..., description="Location coordinates")


class PressureChangeResponse(BaseModel):
    """Barometric pressure change response"""
    pressure_change: float = Field(..., description="Pressure change in hPa")
    trend: str = Field(..., description="Trend: rising/falling/stable")
    significance: str = Field(..., description="Significance: low/moderate/high")


class ForecastResponse(BaseModel):
    """Weather forecast response"""
    forecast: List[dict] = Field(..., description="Hourly forecast data")


@app.get("/weather/current", response_model=WeatherResponse)
async def get_current_weather(lat: float, lon: float):
    """
    Get current weather conditions for location.
    
    Args:
        lat: Latitude (-90 to 90)
        lon: Longitude (-180 to 180)
    
    Returns:
        Current weather data including pressure, temperature, humidity, and AQI
    
    Example:
        GET /weather/current?lat=40.7128&lon=-74.0060
    """
    try:
        weather = await weather_service.get_current_weather(lat, lon)
        return WeatherResponse(
            **weather,
            location={"lat": lat, "lon": lon}
        )
    except Exception as e:
        logger.error(f"Error fetching current weather: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch weather: {str(e)}")


@app.get("/weather/pressure_change", response_model=PressureChangeResponse)
async def get_pressure_change(lat: float, lon: float, hours_ago: int = 3):
    """
    Get barometric pressure change over last N hours.
    
    Args:
        lat: Latitude
        lon: Longitude
        hours_ago: Number of hours to look back (default: 3)
    
    Returns:
        Pressure change data with trend and significance
    
    Example:
        GET /weather/pressure_change?lat=40.7128&lon=-74.0060&hours_ago=3
    """
    try:
        delta = await weather_service.get_pressure_change(lat, lon, hours_ago)
        
        # Classify trend and significance
        if abs(delta) < 1:
            trend, significance = "stable", "low"
        elif abs(delta) < 3:
            trend = "rising" if delta > 0 else "falling"
            significance = "moderate"
        else:
            trend = "rising" if delta > 0 else "falling"
            significance = "high"
        
        return PressureChangeResponse(
            pressure_change=delta,
            trend=trend,
            significance=significance
        )
    except Exception as e:
        logger.error(f"Error fetching pressure change: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch pressure change: {str(e)}")


@app.get("/weather/forecast", response_model=ForecastResponse)
async def get_weather_forecast(lat: float, lon: float, hours: int = 24):
    """
    Get hourly weather forecast.
    
    Args:
        lat: Latitude
        lon: Longitude
        hours: Number of hours to forecast (default: 24, max: 48)
    
    Returns:
        Hourly forecast data
    
    Example:
        GET /weather/forecast?lat=40.7128&lon=-74.0060&hours=24
    """
    try:
        hours = min(hours, 48)  # Cap at 48 hours
        forecast = await weather_service.get_forecast(lat, lon, hours)
        return ForecastResponse(forecast=forecast)
    except Exception as e:
        logger.error(f"Error fetching forecast: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch forecast: {str(e)}")


# ============================================================================
# FEEDBACK ENDPOINTS (Ticket 026)
# ============================================================================

@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Submit migraine outcome feedback.
    
    Args:
        request: FeedbackRequest with user_id, date, had_migraine, severity, notes
    
    Returns:
        FeedbackResponse with success, message, updated_accuracy, num_feedback_points
    
    Example:
        POST /feedback
        {
            "user_id": "user123",
            "date": "2025-11-15",
            "had_migraine": true,
            "severity": 7
        }
    """
    try:
        # TODO: Retrieve prediction for that date if exists
        predicted_prob = None  # Would query from prediction history
        
        # Store feedback
        feedback_id = db.add_feedback(
            user_id=request.user_id,
            date=request.date,
            had_migraine=request.had_migraine,
            severity=request.severity,
            predicted_prob=predicted_prob,
            notes=request.notes
        )
        
        # Get user's updated accuracy
        accuracy_stats = db.get_user_accuracy(request.user_id)
        
        logger.info(f"Feedback submitted for user {request.user_id}: {feedback_id}")
        
        return FeedbackResponse(
            success=True,
            message="Feedback recorded. Your model will improve with more data!",
            updated_accuracy=accuracy_stats['accuracy'],
            num_feedback_points=accuracy_stats['num_predictions']
        )
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


@app.get("/user/{user_id}/accuracy", response_model=AccuracyResponse)
async def get_user_accuracy(user_id: str, window_days: int = 30):
    """
    Get user's prediction accuracy over recent window.
    
    Args:
        user_id: User identifier
        window_days: Number of days to look back (default: 30)
    
    Returns:
        AccuracyResponse with accuracy, num_predictions, window_days, confidence
    
    Example:
        GET /user/user123/accuracy?window_days=30
    """
    try:
        stats = db.get_user_accuracy(user_id, window_days)
        
        # Determine confidence based on sample size
        num_predictions = stats['num_predictions']
        if num_predictions < 10:
            confidence = "low"
        elif num_predictions < 30:
            confidence = "medium"
        else:
            confidence = "high"
        
        return AccuracyResponse(
            accuracy=stats['accuracy'],
            num_predictions=num_predictions,
            window_days=window_days,
            confidence=confidence
        )
    except Exception as e:
        logger.error(f"Error getting user accuracy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user accuracy: {str(e)}")


@app.get("/user/{user_id}/feedback_history", response_model=FeedbackHistoryResponse)
async def get_feedback_history(user_id: str, limit: int = 30):
    """
    Get user's feedback history with predictions vs. outcomes.
    
    Args:
        user_id: User identifier
        limit: Maximum number of records to return (default: 30)
    
    Returns:
        FeedbackHistoryResponse with list of feedback items
    
    Example:
        GET /user/user123/feedback_history?limit=30
    """
    try:
        history = db.get_user_feedback_history(user_id, limit)
        
        formatted_history = []
        for record in history:
            predicted_risk = record.get('predicted_risk')
            actual_outcome = bool(record['actual_outcome'])
            
            # Determine if prediction was correct
            correct = None
            if predicted_risk is not None:
                correct = (predicted_risk > 0.5) == actual_outcome
            
            formatted_history.append(FeedbackHistoryItem(
                feedback_date=record['feedback_date'],
                predicted_risk=predicted_risk,
                actual_outcome=actual_outcome,
                severity=record.get('severity'),
                correct=correct
            ))
        
        return FeedbackHistoryResponse(history=formatted_history)
    except Exception as e:
        logger.error(f"Error getting feedback history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get feedback history: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Load config for server settings
    config_path = Path(__file__).parent.parent / 'configs' / 'service.yaml'
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    # Use PORT env var if available (for Cloud Run compatibility)
    host = "0.0.0.0"
    port = int(os.getenv("PORT", config["server"]["port"]))
    
    uvicorn.run(
        "service.main:app",   # <-- CORRECT MODULE PATH
        host=host,
        port=port,
        reload=False,
        workers=1
    )
