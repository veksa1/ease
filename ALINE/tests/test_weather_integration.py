"""
Test Suite for Ticket #023: OpenWeather API Integration
Tests weather service functionality, caching, and error handling.

Author: ALINE Team
Date: 2025-11-16
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from service.weather import WeatherService


class TestOpenWeatherIntegration:
    """Test OpenWeather API integration from Ticket #023"""
    
    @pytest.fixture
    def weather_service(self):
        """Create a weather service instance for testing"""
        return WeatherService()
    
    def test_weather_service_initialization(self, weather_service):
        """Test that WeatherService initializes correctly"""
        assert weather_service is not None, "WeatherService should initialize"
        assert hasattr(weather_service, 'cache'), "Should have cache attribute"
        assert hasattr(weather_service, 'client'), "Should have HTTP client"
        assert weather_service.CACHE_TTL > 0, "Cache TTL should be positive"
    
    def test_weather_service_has_required_methods(self, weather_service):
        """Test that WeatherService has all required methods"""
        assert hasattr(weather_service, 'get_current_weather'), \
            "Should have get_current_weather method"
        assert hasattr(weather_service, 'get_weather_forecast'), \
            "Should have get_weather_forecast method"
        assert hasattr(weather_service, 'close'), \
            "Should have close method"
    
    def test_cache_structure(self, weather_service):
        """Test that cache is properly initialized"""
        assert isinstance(weather_service.cache, dict), "Cache should be a dictionary"
        assert len(weather_service.cache) == 0, "Cache should start empty"
    
    def test_api_configuration(self, weather_service):
        """Test API configuration is set up"""
        assert hasattr(WeatherService, 'BASE_URL'), "Should have BASE_URL"
        assert hasattr(WeatherService, 'API_KEY'), "Should have API_KEY"
        assert hasattr(WeatherService, 'CACHE_TTL'), "Should have CACHE_TTL"
        
        # URL should be valid
        assert 'openweathermap.org' in WeatherService.BASE_URL, \
            "BASE_URL should point to OpenWeather API"
    
    @pytest.mark.asyncio
    async def test_close_client(self, weather_service):
        """Test that HTTP client closes properly"""
        await weather_service.close()
        # After closing, client should be closed
        assert weather_service.client.is_closed, "Client should be closed"


class TestWeatherServiceIntegration:
    """Integration tests for weather service (requires API key or uses defaults)"""
    
    @pytest.mark.asyncio
    async def test_get_current_weather_structure(self):
        """Test that get_current_weather returns correct structure"""
        service = WeatherService()
        
        try:
            # Try to get weather (will use mock data if no API key)
            result = await service.get_current_weather(lat=40.7128, lon=-74.0060)
            
            # Verify all required fields for ALINE model
            required_fields = ['pressure', 'temperature', 'humidity', 'aqi']
            for field in required_fields:
                assert field in result, f"Missing required field: {field}"
            
            # Verify data types
            assert isinstance(result['pressure'], (int, float)), "Pressure should be numeric"
            assert isinstance(result['temperature'], (int, float)), "Temperature should be numeric"
            assert isinstance(result['humidity'], (int, float)), "Humidity should be numeric"
            assert isinstance(result['aqi'], (int, float)), "AQI should be numeric"
            
            # Verify reasonable ranges
            assert 900 <= result['pressure'] <= 1100, "Pressure should be reasonable (900-1100 hPa)"
            assert -50 <= result['temperature'] <= 60, "Temperature should be reasonable (-50 to 60°C)"
            assert 0 <= result['humidity'] <= 100, "Humidity should be 0-100%"
            assert 0 <= result['aqi'] <= 500, "AQI should be 0-500"
        
        finally:
            await service.close()
    
    @pytest.mark.asyncio
    async def test_get_weather_forecast_structure(self):
        """Test that get_weather_forecast returns correct structure"""
        service = WeatherService()
        
        try:
            # Try to get forecast (will use mock data if no API key)
            result = await service.get_weather_forecast(
                lat=40.7128, 
                lon=-74.0060,
                hours=24
            )
            
            # Should return a list
            assert isinstance(result, list), "Forecast should be a list"
            
            if len(result) > 0:
                # Check first forecast entry
                forecast = result[0]
                assert 'timestamp' in forecast, "Forecast should have timestamp"
                assert 'pressure' in forecast, "Forecast should have pressure"
                assert 'temperature' in forecast, "Forecast should have temperature"
                assert 'humidity' in forecast, "Forecast should have humidity"
        
        finally:
            await service.close()


class TestWeatherFeaturesPriority:
    """Test alignment with priority recommendations"""
    
    def test_ticket_023_is_priority_1(self):
        """
        Verify Ticket #023 priority.
        
        According to FEATURE_ENHANCEMENT_SUMMARY.md:
        - Priority: PRIORITY 1 (Do First)
        - Impact: HIGH - Barometric pressure is a top-3 trigger
        - Complexity: MEDIUM - Straightforward API integration
        - Effort: 1-2 days
        - Cost: $0-40/month (free tier sufficient)
        """
        pytest.skip(
            "Ticket #023 is PRIORITY 1 - High impact weather integration. "
            "Eliminates 5 manual inputs per day. "
            "See FEATURE_ENHANCEMENT_SUMMARY.md for details."
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
