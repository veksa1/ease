# ☁️ Ticket 023 – OpenWeather API Integration for Environmental Data

**Date:** 2025-11-16  
**Owner:** Backend/Integration  
**Status:** 🔧 To Do  
**Priority:** Medium  
**Effort:** Medium (1-2 days)

---

## 🎯 Objective

Automatically fetch real-time weather data to populate environmental features (barometric pressure, temperature, humidity, AQI) without manual user input. Reduce user burden and improve data quality.

---

## 📊 Background

**Current State:**
- Environmental features require manual input or are missing
- Users unlikely to know barometric pressure changes
- Missing data degrades prediction quality

**Target Features from `migraine_features.json`:**
- Barometric Pressure Change (High weight: 1.0)
- Base Pressure (Medium weight: 0.6)
- Temperature (Medium weight: 0.6)
- Humidity (Low-Med weight: 0.4)
- Air Quality Index (Medium weight: 0.6)

**Solution:**
- Use OpenWeather API to auto-fetch based on user location
- Cache results to minimize API calls
- Fall back gracefully if API unavailable

---

## 🧩 Tasks

### 1. Set Up OpenWeather Account

**Action Items:**
- Sign up at https://openweathermap.org/api
- Generate API key
- Choose plan:
  - **Free tier**: 1,000 calls/day, 60 calls/min
  - **Startup tier**: $40/month, 100,000 calls/day (if needed)

**For MVP:** Free tier sufficient for demo (1000 users × 1 call/day = within limits)

Add to environment variables:

**File:** `.env.production`

```bash
# OpenWeather API
OPENWEATHER_API_KEY=your_api_key_here
OPENWEATHER_CACHE_TTL=3600  # 1 hour cache
```

### 2. Create Weather Service Module

**File:** `service/weather.py`

```python
import httpx
import os
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    """
    OpenWeather API client for fetching environmental data.
    
    API Documentation: https://openweathermap.org/api/one-call-3
    """
    
    BASE_URL = "https://api.openweathermap.org/data/3.0/onecall"
    API_KEY = os.getenv("OPENWEATHER_API_KEY")
    CACHE_TTL = int(os.getenv("OPENWEATHER_CACHE_TTL", 3600))
    
    def __init__(self):
        self.cache = {}  # Simple in-memory cache {(lat, lon): (timestamp, data)}
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def get_current_weather(
        self, 
        lat: float, 
        lon: float
    ) -> Dict[str, float]:
        """
        Fetch current weather conditions.
        
        Args:
            lat: Latitude
            lon: Longitude
        
        Returns:
            {
                "pressure": 1013.25,  # hPa
                "temperature": 22.5,  # °C
                "humidity": 65,  # %
                "aqi": 45  # Air Quality Index
            }
        """
        # Check cache
        cache_key = (round(lat, 2), round(lon, 2))
        if cache_key in self.cache:
            timestamp, data = self.cache[cache_key]
            if datetime.now() - timestamp < timedelta(seconds=self.CACHE_TTL):
                logger.info(f"Weather cache hit for {cache_key}")
                return data
        
        # Fetch from API
        try:
            response = await self.client.get(
                self.BASE_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": self.API_KEY,
                    "units": "metric",
                    "exclude": "minutely,daily"  # Only need current + hourly
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Parse response
            current = data['current']
            weather_data = {
                "pressure": current['pressure'],  # hPa
                "temperature": current['temp'],  # °C
                "humidity": current['humidity'],  # %
                "aqi": data.get('current', {}).get('air_quality', {}).get('aqi', 50)  # Default 50
            }
            
            # Cache result
            self.cache[cache_key] = (datetime.now(), weather_data)
            logger.info(f"Weather fetched for {cache_key}")
            
            return weather_data
            
        except httpx.HTTPError as e:
            logger.error(f"OpenWeather API error: {e}")
            return self._get_default_weather()
    
    async def get_pressure_change(
        self, 
        lat: float, 
        lon: float
    ) -> float:
        """
        Calculate barometric pressure change over last 3 hours.
        
        Returns:
            Pressure delta in hPa (positive = rising, negative = falling)
        """
        try:
            response = await self.client.get(
                self.BASE_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": self.API_KEY,
                    "units": "metric"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            current_pressure = data['current']['pressure']
            hourly = data['hourly']
            
            # Find pressure 3 hours ago
            if len(hourly) >= 3:
                past_pressure = hourly[2]['pressure']  # 3 hours ago
                delta = current_pressure - past_pressure
                return delta
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Error calculating pressure change: {e}")
            return 0.0
    
    async def get_forecast(
        self, 
        lat: float, 
        lon: float, 
        hours: int = 24
    ) -> list:
        """
        Get hourly forecast for next N hours.
        
        Returns:
            List of dicts with pressure, temp, humidity for each hour
        """
        try:
            response = await self.client.get(
                self.BASE_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": self.API_KEY,
                    "units": "metric"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            forecast = []
            for hour_data in data['hourly'][:hours]:
                forecast.append({
                    "timestamp": hour_data['dt'],
                    "pressure": hour_data['pressure'],
                    "temperature": hour_data['temp'],
                    "humidity": hour_data['humidity']
                })
            
            return forecast
            
        except Exception as e:
            logger.error(f"Error fetching forecast: {e}")
            return []
    
    def _get_default_weather(self) -> Dict[str, float]:
        """Fallback values if API unavailable."""
        return {
            "pressure": 1013.25,  # Standard atmospheric pressure
            "temperature": 20.0,
            "humidity": 50.0,
            "aqi": 50
        }
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Singleton instance
weather_service = WeatherService()
```

### 3. Add Weather Endpoints

**File:** `service/main.py`

```python
from service.weather import weather_service

@app.get("/weather/current")
async def get_current_weather(lat: float, lon: float):
    """
    Get current weather conditions for location.
    
    Query params:
        lat: Latitude (-90 to 90)
        lon: Longitude (-180 to 180)
    
    Response:
        {
            "pressure": 1013.25,
            "temperature": 22.5,
            "humidity": 65,
            "aqi": 45,
            "location": {"lat": 40.7128, "lon": -74.0060}
        }
    """
    weather = await weather_service.get_current_weather(lat, lon)
    return {
        **weather,
        "location": {"lat": lat, "lon": lon}
    }

@app.get("/weather/pressure_change")
async def get_pressure_change(lat: float, lon: float):
    """
    Get barometric pressure change over last 3 hours.
    
    Response:
        {
            "pressure_change": -2.5,  # hPa
            "trend": "falling",  # rising/falling/stable
            "significance": "moderate"  # low/moderate/high
        }
    """
    delta = await weather_service.get_pressure_change(lat, lon)
    
    # Classify trend
    if abs(delta) < 1:
        trend, significance = "stable", "low"
    elif abs(delta) < 3:
        trend = "rising" if delta > 0 else "falling"
        significance = "moderate"
    else:
        trend = "rising" if delta > 0 else "falling"
        significance = "high"
    
    return {
        "pressure_change": delta,
        "trend": trend,
        "significance": significance
    }

@app.get("/weather/forecast")
async def get_weather_forecast(lat: float, lon: float, hours: int = 24):
    """
    Get hourly weather forecast.
    
    Response:
        {
            "forecast": [
                {"hour": 0, "pressure": 1013, "temp": 22, "humidity": 65},
                {"hour": 1, "pressure": 1012, "temp": 21, "humidity": 67},
                ...
            ]
        }
    """
    forecast = await weather_service.get_forecast(lat, lon, hours)
    return {"forecast": forecast}

@app.on_event("shutdown")
async def shutdown_event():
    """Close weather service on shutdown."""
    await weather_service.close()
```

### 4. Integrate with Feature Pipeline

**File:** `service/main.py` (extend existing endpoints)

```python
@app.post("/risk/daily")
async def get_daily_risk(request: RiskRequest):
    """
    Calculate migraine risk with auto-populated weather data.
    
    If user provides location, weather features are automatically fetched.
    """
    features = request.features
    
    # Auto-populate weather if location provided
    if request.location:
        lat, lon = request.location['lat'], request.location['lon']
        weather = await weather_service.get_current_weather(lat, lon)
        pressure_change = await weather_service.get_pressure_change(lat, lon)
        
        # Update feature dict
        features['Barometric_Pressure'] = weather['pressure']
        features['Barometric_Pressure_Change'] = pressure_change
        features['Temperature'] = weather['temperature']
        features['Humidity'] = weather['humidity']
        features['Air_Quality_Index'] = weather['aqi']
    
    # Continue with normal risk calculation
    risk = model.predict(features, request.user_id)
    return risk
```

### 5. Add Rate Limiting

**File:** `service/weather.py` (extend)

```python
from datetime import datetime
import asyncio

class RateLimiter:
    """Simple rate limiter for API calls."""
    
    def __init__(self, max_calls: int, period: int):
        self.max_calls = max_calls
        self.period = period  # seconds
        self.calls = []
    
    async def acquire(self):
        """Wait if rate limit exceeded."""
        now = datetime.now()
        
        # Remove old calls
        self.calls = [t for t in self.calls if (now - t).seconds < self.period]
        
        # Wait if at limit
        if len(self.calls) >= self.max_calls:
            wait_time = self.period - (now - self.calls[0]).seconds
            await asyncio.sleep(wait_time)
            self.calls = []
        
        self.calls.append(now)

# Add to WeatherService
class WeatherService:
    def __init__(self):
        # ...
        self.rate_limiter = RateLimiter(max_calls=60, period=60)  # 60/min
    
    async def get_current_weather(self, lat, lon):
        await self.rate_limiter.acquire()
        # ... rest of method
```

---

## ✅ Acceptance Criteria

- [ ] Weather data auto-fills for users who provide location
- [ ] Falls back gracefully if API unavailable (uses default values)
- [ ] Caching reduces API calls by 80%+ for repeated requests
- [ ] Rate limiting prevents exceeding free tier limits
- [ ] Costs <$50/month at 1000 active users
- [ ] Barometric Pressure Change feature populated with real ΔP data
- [ ] API documentation includes weather endpoints
- [ ] Error handling for network failures, invalid coordinates

---

## 📈 Expected Impact

- **Data quality**: Environmental features always populated
- **User burden**: 5 fewer manual inputs per day
- **Prediction accuracy**: +5-8% AUC from accurate weather data
- **Cost**: $0-40/month depending on usage

**Cost Analysis:**
- 1000 users × 1 call/day = 1000 calls/day (within free tier)
- With caching: ~500 actual API calls/day
- Free tier sufficient for MVP

---

## 🔬 Testing Plan

1. **Unit tests**: Mock API responses, test caching logic
2. **Integration tests**: Real API calls (use test account)
3. **Load testing**: Simulate 1000 concurrent users
4. **Fallback testing**: Disconnect network, verify defaults
5. **Cost monitoring**: Track actual API usage over 1 week

---

## 🔗 Related Tickets

- #025: Feature expansion (adds barometric pressure change, AQI, altitude)
- #024: Sensor integration docs (weather is one integration option)

---

## 📚 References

- OpenWeather API docs: https://openweathermap.org/api/one-call-3
- Free tier limits: https://openweathermap.org/price
- Barometric pressure and migraines: Research shows 3-5 hPa change triggers ~30% of cases
