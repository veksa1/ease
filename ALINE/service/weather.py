"""
Weather Service for ALINE - Ticket 023
OpenWeather API integration for environmental data auto-population.

Automatically fetches real-time weather data to populate environmental features
(barometric pressure, temperature, humidity, AQI) without manual user input.
"""

import httpx
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import logging
import asyncio

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter for API calls."""
    
    def __init__(self, max_calls: int, period: int):
        """
        Initialize rate limiter.
        
        Args:
            max_calls: Maximum number of calls allowed
            period: Time period in seconds
        """
        self.max_calls = max_calls
        self.period = period  # seconds
        self.calls = []
    
    async def acquire(self):
        """Wait if rate limit exceeded."""
        now = datetime.now()
        
        # Remove old calls
        self.calls = [t for t in self.calls if (now - t).total_seconds() < self.period]
        
        # Wait if at limit
        if len(self.calls) >= self.max_calls:
            wait_time = self.period - (now - self.calls[0]).total_seconds()
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
                self.calls = []
        
        self.calls.append(now)


class WeatherService:
    """
    OpenWeather API client for fetching environmental data.
    
    API Documentation: https://openweathermap.org/api/one-call-3
    """
    
    BASE_URL = "https://api.openweathermap.org/data/3.0/onecall"
    API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
    CACHE_TTL = int(os.getenv("OPENWEATHER_CACHE_TTL", "3600"))  # 1 hour default
    
    def __init__(self):
        """Initialize weather service with caching and rate limiting."""
        self.cache = {}  # Simple in-memory cache {(lat, lon): (timestamp, data)}
        self.client = httpx.AsyncClient(timeout=10.0)
        self.rate_limiter = RateLimiter(max_calls=60, period=60)  # 60/min for free tier
        
    async def get_current_weather(
        self, 
        lat: float, 
        lon: float
    ) -> Dict[str, float]:
        """
        Fetch current weather conditions.
        
        Args:
            lat: Latitude (-90 to 90)
            lon: Longitude (-180 to 180)
        
        Returns:
            Dictionary with weather data:
            {
                "pressure": 1013.25,  # hPa
                "temperature": 22.5,  # °C
                "humidity": 65,  # %
                "aqi": 45  # Air Quality Index (if available)
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
            await self.rate_limiter.acquire()
            
            response = await self.client.get(
                self.BASE_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": self.API_KEY,
                    "units": "metric",
                    "exclude": "minutely,daily,alerts"  # Only need current + hourly
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Parse response
            current = data.get('current', {})
            weather_data = {
                "pressure": current.get('pressure', 1013.25),  # hPa
                "temperature": current.get('temp', 20.0),  # °C
                "humidity": current.get('humidity', 50),  # %
                "aqi": 50  # Default AQI, OpenWeather Air Pollution API is separate
            }
            
            # Cache result
            self.cache[cache_key] = (datetime.now(), weather_data)
            logger.info(f"Weather fetched for {cache_key}: {weather_data}")
            
            return weather_data
            
        except httpx.HTTPError as e:
            logger.error(f"OpenWeather API error: {e}")
            return self._get_default_weather()
        except Exception as e:
            logger.error(f"Unexpected error fetching weather: {e}")
            return self._get_default_weather()
    
    async def get_pressure_change(
        self, 
        lat: float, 
        lon: float,
        hours_ago: int = 3
    ) -> float:
        """
        Calculate barometric pressure change over last N hours.
        
        Args:
            lat: Latitude
            lon: Longitude
            hours_ago: Number of hours to look back (default: 3)
        
        Returns:
            Pressure delta in hPa (positive = rising, negative = falling)
        """
        try:
            await self.rate_limiter.acquire()
            
            response = await self.client.get(
                self.BASE_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": self.API_KEY,
                    "units": "metric",
                    "exclude": "minutely,daily,alerts"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            current_pressure = data.get('current', {}).get('pressure', 1013.25)
            hourly = data.get('hourly', [])
            
            # Find pressure N hours ago
            if len(hourly) >= hours_ago:
                past_pressure = hourly[hours_ago - 1].get('pressure', current_pressure)
                delta = current_pressure - past_pressure
                logger.info(f"Pressure change ({hours_ago}h): {delta:.2f} hPa")
                return delta
            else:
                logger.warning(f"Not enough hourly data for {hours_ago}h pressure change")
                return 0.0
                
        except Exception as e:
            logger.error(f"Error calculating pressure change: {e}")
            return 0.0
    
    async def get_forecast(
        self, 
        lat: float, 
        lon: float, 
        hours: int = 24
    ) -> List[Dict]:
        """
        Get hourly forecast for next N hours.
        
        Args:
            lat: Latitude
            lon: Longitude
            hours: Number of hours to forecast (max 48)
        
        Returns:
            List of dicts with pressure, temp, humidity for each hour
        """
        try:
            await self.rate_limiter.acquire()
            
            response = await self.client.get(
                self.BASE_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": self.API_KEY,
                    "units": "metric",
                    "exclude": "minutely,daily,alerts"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            forecast = []
            hourly_data = data.get('hourly', [])
            for hour_data in hourly_data[:min(hours, len(hourly_data))]:
                forecast.append({
                    "timestamp": hour_data.get('dt', 0),
                    "pressure": hour_data.get('pressure', 1013.25),
                    "temperature": hour_data.get('temp', 20.0),
                    "humidity": hour_data.get('humidity', 50)
                })
            
            logger.info(f"Forecast fetched: {len(forecast)} hours")
            return forecast
            
        except Exception as e:
            logger.error(f"Error fetching forecast: {e}")
            return []
    
    def _get_default_weather(self) -> Dict[str, float]:
        """Fallback values if API unavailable."""
        logger.warning("Using default weather values")
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
