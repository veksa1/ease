/**
 * Location Context Service - Ticket 028
 * 
 * Client for n8n webhook that extracts location from calendar
 * and fetches weather forecast for that location.
 */

export interface LocationContextRequest {
  userId: string;
  date: string; // YYYY-MM-DD
  calendarUrl: string;
}

export interface LocationContextResponse {
  userId: string;
  date: string;
  location: {
    source: 'calendar_event' | 'fallback';
    raw: string;
    geocoded: {
      lat: number;
      lon: number;
      city: string;
      country: string;
    };
  } | null;
  weather: {
    current: {
      temperature: number;
      pressure: number;
      humidity: number;
      aqi: number;
    };
    forecast_24h: Array<{
      hour: number;
      temperature: number;
      pressure: number;
      pressure_change: number;
      humidity: number;
      aqi: number;
    }>;
  } | null;
  calendarEvents: Array<{
    title: string;
    start: string;
    end: string;
    location?: string;
  }>;
  timestamp: string;
}

class LocationContextService {
  private n8nWebhook = 'https://playerplanet.app.n8n.cloud/webhook/aline/location-context';

  /**
   * Get location and weather context from calendar
   */
  async getLocationContext(
    request: LocationContextRequest
  ): Promise<LocationContextResponse | null> {
    try {
      console.log('[LocationContextService] Calling n8n webhook:', {
        userId: request.userId,
        date: request.date,
        calendarUrl: request.calendarUrl.substring(0, 50) + '...'
      });

      const response = await fetch(this.n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.error('[LocationContextService] n8n webhook failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[LocationContextService] Received context:', {
        location: data.location?.geocoded?.city || 'unknown',
        events: data.calendarEvents?.length || 0,
        hasWeather: !!data.weather
      });

      return data;
    } catch (error) {
      console.error('[LocationContextService] Error calling n8n location-context:', error);
      return null;
    }
  }

  /**
   * Extract weather features from n8n response
   * Returns arrays suitable for feature matrix construction
   */
  extractWeatherFeatures(response: LocationContextResponse): {
    pressure: number[];
    pressure_change: number[];
    temperature: number[];
    humidity: number[];
    aqi: number[];
  } {
    if (!response.weather || !response.weather.forecast_24h) {
      console.log('[LocationContextService] No weather data, using defaults');
      // Return defaults if no weather data
      return {
        pressure: new Array(24).fill(1013.25),
        pressure_change: new Array(24).fill(0),
        temperature: new Array(24).fill(20),
        humidity: new Array(24).fill(50),
        aqi: new Array(24).fill(50),
      };
    }

    const { forecast_24h } = response.weather;

    return {
      pressure: forecast_24h.map(h => h.pressure),
      pressure_change: forecast_24h.map(h => h.pressure_change),
      temperature: forecast_24h.map(h => h.temperature),
      humidity: forecast_24h.map(h => h.humidity),
      aqi: forecast_24h.map(h => h.aqi),
    };
  }

  /**
   * Check if location context service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testRequest: LocationContextRequest = {
        userId: 'health-check',
        date: new Date().toISOString().split('T')[0],
        calendarUrl: 'https://example.com/calendar.ics'
      };

      const response = await fetch(this.n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRequest),
      });

      // Even if it returns an error, if we get a response, the service is up
      return response.status < 500;
    } catch (error) {
      console.error('[LocationContextService] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const locationContextService = new LocationContextService();
