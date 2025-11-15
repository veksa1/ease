"""
Pydantic Schemas - Ticket 010 & 011

Request/Response models for the FastAPI service.
Aligns with JSON contract for the UI.

Author: ALINE Team
Date: 2025-11-15
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Health endpoint
class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    model_loaded: bool


# Daily risk endpoint
class DailyRiskRequest(BaseModel):
    """Request for daily risk prediction"""
    user_id: str = Field(..., description="User ID")
    features: List[List[float]] = Field(..., description="24 hours of features, shape [24, n_features]")


class DailyRiskResponse(BaseModel):
    """Response with daily risk prediction"""
    user_id: str
    mean_probability: float = Field(..., description="Mean migraine probability")
    lower_bound: float = Field(..., description="5th percentile")
    upper_bound: float = Field(..., description="95th percentile")
    timestamp: str


# Hourly posterior endpoint
class PosteriorRequest(BaseModel):
    """Request for hourly posterior"""
    user_id: str
    features: List[List[float]] = Field(..., description="24 hours of features")


class HourlyPosterior(BaseModel):
    """Posterior for a single hour"""
    hour: int
    mean: List[float] = Field(..., description="Mean latent state [z_dim]")
    std: List[float] = Field(..., description="Std latent state [z_dim]")


class PosteriorResponse(BaseModel):
    """Response with hourly posteriors"""
    user_id: str
    hourly_posteriors: List[HourlyPosterior]
    timestamp: str


# Policy top-k endpoint
class PolicyRequest(BaseModel):
    """Request for policy recommendations"""
    user_id: str
    features: List[List[float]] = Field(..., description="24 hours of features")
    k: int = Field(3, description="Number of hours to select", ge=1, le=24)


class SelectedHour(BaseModel):
    """A selected hour with its score"""
    hour: int
    priority_score: float


class PolicyResponse(BaseModel):
    """Response with policy recommendations"""
    user_id: str
    selected_hours: List[SelectedHour]
    k: int
    timestamp: str


# Calendar integration endpoints (Ticket 019)
class CalendarConnectionRequest(BaseModel):
    """Request to save calendar connection"""
    userId: str = Field(..., description="User ID")
    calendarUrl: str = Field(..., description="ICS/WebCal URL")


class CalendarConnectionResponse(BaseModel):
    """Response after saving calendar connection"""
    status: str
    userId: str
    lastVerifiedAt: Optional[str] = None
    message: Optional[str] = None


class CalendarStatusResponse(BaseModel):
    """Response with calendar connection status"""
    connected: bool
    userId: str
    lastVerifiedAt: Optional[str] = None


class ContextGenerationRequest(BaseModel):
    """Request for generating context from calendar"""
    userId: str = Field(..., description="User ID")
    priors: dict = Field(..., description="Prior distributions for features")


class ContextGenerationResponse(BaseModel):
    """Response with generated posteriors"""
    userId: str
    posteriors: dict = Field(..., description="Updated posterior distributions")
    features: List[dict] = Field(..., description="Feature details with prior/posterior")
    timestamp: str
