/**
 * Tomorrow Prediction Service - Ticket 028
 * 
 * Combines calendar context with risk prediction to forecast tomorrow.
 * Uses REAL user data - no mock features.
 */

import { calendarService } from './calendarService';
import { userFeaturesService } from './userFeaturesService';
import { riskPredictionService } from './riskPredictionService';
import { locationContextService, type LocationContextResponse } from './locationContextService';

export interface TomorrowRiskBreakdown {
  totalRisk: number;
  baselineRisk: number;
  contributors: {
    label: string;
    delta: number; // How much this adds/subtracts from baseline
    icon: string;
  }[];
}

export interface TomorrowPrediction {
  date: string;
  risk: number;
  bounds: { lower: number; upper: number };
  breakdown: TomorrowRiskBreakdown;
  calendarEvents: any[];
  suggestions: string[];
  timestamp: string;
}

class TomorrowPredictionService {
  /**
   * Generate tomorrow's risk prediction with calendar context
   */
  async getTomorrowRisk(userId: string): Promise<TomorrowPrediction | null> {
    try {
      // 1. Check if user has calendar connected
      const calendarStatus = await calendarService.getCalendarStatus(userId);
      
      if (!calendarStatus.connected) {
        console.log('[TomorrowPredictionService] No calendar connected - using baseline prediction only');
        return this.getBaselineTomorrowRisk(userId);
      }

      // 2. Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      
      // Get user's calendar URL
      const userCalendarUrl = await this.getCalendarUrl(userId);
      
      if (!userCalendarUrl) {
        console.log('[TomorrowPredictionService] No calendar URL found - using baseline prediction');
        return this.getBaselineTomorrowRisk(userId);
      }
      
      // 3. Call n8n webhook for location + weather + calendar
      const locationContext = await locationContextService.getLocationContext({
        userId,
        date: tomorrowDate,
        calendarUrl: userCalendarUrl,
      });
      
      if (!locationContext) {
        console.error('[TomorrowPredictionService] Failed to get location context from n8n');
        // Fallback to local calendar parsing
        return this.getTomorrowRiskFromLocalCalendar(userId, tomorrow);
      }
      
      const events = locationContext.calendarEvents;
      console.log(`[TomorrowPredictionService] Found ${events.length} events for tomorrow`);
      console.log(`[TomorrowPredictionService] Location: ${locationContext.location?.geocoded.city || 'unknown'}`);

      // 4. Build tomorrow's feature matrix using real user data
      console.log('[TomorrowPredictionService] Building tomorrow\'s features from real user data...');
      
      // Get today's baseline features
      const todayFeatures = await userFeaturesService.get24HourFeatures({
        userId,
        date: new Date(),
        includeCalendar: true,
        includeWeather: true,
      });
      
      // Project tomorrow's features using n8n data
      const weatherFeatures = locationContext.weather 
        ? locationContextService.extractWeatherFeatures(locationContext)
        : null;
      
      const tomorrowFeatures = await this.projectTomorrowFeatures({
        todayFeatures,
        tomorrowEvents: events,
        weatherForecast: weatherFeatures,
        userId,
      });
      
      // Validate feature matrix
      const validation = userFeaturesService.validateFeatures(tomorrowFeatures);
      if (!validation.valid) {
        console.error('[TomorrowPredictionService] Invalid tomorrow features:', validation.errors);
        return this.getBaselineTomorrowRisk(userId);
      }

      // 5. Get risk prediction using real features
      const riskPrediction = await riskPredictionService.getDailyRisk(
        userId,
        tomorrowFeatures
      );

      if (!riskPrediction) {
        return this.getBaselineTomorrowRisk(userId);
      }

      // 6. Build breakdown of risk contributors
      const breakdown = this.buildRiskBreakdown(
        events,
        weatherFeatures,
        riskPrediction.mean_probability
      );

      // 7. Generate actionable suggestions
      const suggestions = this.generateSuggestions(
        riskPrediction.mean_probability,
        events,
        weatherFeatures
      );

      return {
        date: tomorrow.toISOString(),
        risk: riskPrediction.mean_probability,
        bounds: {
          lower: riskPrediction.lower_bound,
          upper: riskPrediction.upper_bound,
        },
        breakdown,
        calendarEvents: events,
        suggestions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TomorrowPredictionService] Exception in getTomorrowRisk:', error);
      return null;
    }
  }

  /**
   * Get calendar URL from localStorage or backend
   */
  private async getCalendarUrl(userId: string): Promise<string | null> {
    // Try localStorage first
    const localUrl = localStorage.getItem(`calendar_${userId}`);
    if (localUrl) {
      return localUrl;
    }

    // Try backend
    try {
      const response = await fetch(`/api/user/calendar/${userId}/url`);
      if (response.ok) {
        const data = await response.json();
        return data.calendarUrl || null;
      }
    } catch (error) {
      console.error('[TomorrowPredictionService] Error fetching calendar URL:', error);
    }

    return null;
  }

  /**
   * Fallback: Get tomorrow's risk from local calendar parsing (without n8n)
   */
  private async getTomorrowRiskFromLocalCalendar(
    userId: string,
    tomorrow: Date
  ): Promise<TomorrowPrediction | null> {
    try {
      console.log('[TomorrowPredictionService] Using local calendar fallback');
      
      // Get calendar events locally
      const events = await calendarService.getCalendarEvents(userId, tomorrow);
      
      // Get today's features
      const todayFeatures = await userFeaturesService.get24HourFeatures({
        userId,
        date: new Date(),
        includeCalendar: true,
        includeWeather: true,
      });
      
      // Project tomorrow's features (without weather forecast)
      const tomorrowFeatures = await this.projectTomorrowFeatures({
        todayFeatures,
        tomorrowEvents: events,
        weatherForecast: null,
        userId,
      });
      
      // Get risk prediction
      const riskPrediction = await riskPredictionService.getDailyRisk(
        userId,
        tomorrowFeatures
      );

      if (!riskPrediction) {
        return this.getBaselineTomorrowRisk(userId);
      }

      const breakdown = this.buildRiskBreakdown(events, null, riskPrediction.mean_probability);
      const suggestions = this.generateSuggestions(riskPrediction.mean_probability, events, null);

      return {
        date: tomorrow.toISOString(),
        risk: riskPrediction.mean_probability,
        bounds: {
          lower: riskPrediction.lower_bound,
          upper: riskPrediction.upper_bound,
        },
        breakdown,
        calendarEvents: events,
        suggestions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TomorrowPredictionService] Error in local calendar fallback:', error);
      return this.getBaselineTomorrowRisk(userId);
    }
  }

  /**
   * Get baseline prediction without calendar context
   */
  private async getBaselineTomorrowRisk(
    userId: string
  ): Promise<TomorrowPrediction | null> {
    try {
      // Get today's features as baseline
      const features = await userFeaturesService.get24HourFeatures({
        userId,
        date: new Date(),
        includeCalendar: false,
        includeWeather: false,
      });

      const prediction = await riskPredictionService.getDailyRisk(userId, features);

      if (!prediction) return null;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        date: tomorrow.toISOString(),
        risk: prediction.mean_probability,
        bounds: {
          lower: prediction.lower_bound,
          upper: prediction.upper_bound,
        },
        breakdown: {
          totalRisk: prediction.mean_probability,
          baselineRisk: prediction.mean_probability,
          contributors: [],
        },
        calendarEvents: [],
        suggestions: this.generateSuggestions(prediction.mean_probability, [], null),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TomorrowPredictionService] Error in baseline prediction:', error);
      return null;
    }
  }

  /**
   * Project tomorrow's features from today's baseline
   */
  private async projectTomorrowFeatures(params: {
    todayFeatures: number[][];
    tomorrowEvents: any[];
    weatherForecast: any;
    userId: string;
  }): Promise<number[][]> {
    const { todayFeatures, tomorrowEvents, weatherForecast } = params;
    
    // Start with today's features as baseline
    const tomorrowFeatures = todayFeatures.map(hour => [...hour]);
    
    // Update temporal features for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    for (let hour = 0; hour < 24; hour++) {
      const currentHour = new Date(tomorrow);
      currentHour.setHours(hour, 0, 0, 0);
      
      // Update day of week encoding (indices 20-21)
      const dayOfWeek = currentHour.getDay();
      tomorrowFeatures[hour][20] = Math.sin(2 * Math.PI * dayOfWeek / 7);
      tomorrowFeatures[hour][21] = Math.cos(2 * Math.PI * dayOfWeek / 7);
      
      // Update week of year encoding (indices 22-23)
      const weekOfYear = this.getWeekOfYear(currentHour);
      tomorrowFeatures[hour][22] = Math.sin(2 * Math.PI * weekOfYear / 52);
      tomorrowFeatures[hour][23] = Math.cos(2 * Math.PI * weekOfYear / 52);
    }
    
    // Update work hours and stress based on calendar events
    if (tomorrowEvents.length > 0) {
      for (const event of tomorrowEvents) {
        const startHour = new Date(event.start).getHours();
        const endHour = new Date(event.end).getHours();
        
        for (let hour = startHour; hour <= endHour && hour < 24; hour++) {
          // Increase work hours (index 4)
          tomorrowFeatures[hour][4] = Math.min(tomorrowFeatures[hour][4] + 1, 16);
          
          // Increase stress level (index 3)
          tomorrowFeatures[hour][3] = Math.min(tomorrowFeatures[hour][3] + 1, 10);
        }
      }
    }
    
    // Update weather features if available
    if (weatherForecast) {
      for (let hour = 0; hour < 24; hour++) {
        // Weather Pressure (index 13)
        tomorrowFeatures[hour][13] = weatherForecast.pressure[hour] || 1013.25;
        
        // Barometric Pressure Change (index 27)
        tomorrowFeatures[hour][27] = weatherForecast.pressure_change[hour] || 0;
        
        // Air Quality Index (index 28)
        tomorrowFeatures[hour][28] = weatherForecast.aqi[hour] || 50;
      }
    }
    
    return tomorrowFeatures;
  }

  /**
   * Get week of year
   */
  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
  }

  /**
   * Build breakdown of what's contributing to tomorrow's risk
   */
  private buildRiskBreakdown(
    events: any[],
    weatherFeatures: any,
    totalRisk: number
  ): TomorrowRiskBreakdown {
    const baseline = 0.3; // Average baseline risk
    const contributors = [];

    // Calendar events contribution
    if (events.length >= 4) {
      contributors.push({
        label: `${events.length} meetings scheduled`,
        delta: 0.15,
        icon: '📅',
      });
    } else if (events.length >= 2) {
      contributors.push({
        label: `${events.length} events scheduled`,
        delta: 0.08,
        icon: '📅',
      });
    }

    // Late events
    const lateEvents = events.filter((e) => {
      const hour = new Date(e.start).getHours();
      return hour >= 19; // After 7pm
    });
    if (lateEvents.length > 0) {
      contributors.push({
        label: 'Late evening event',
        delta: 0.08,
        icon: '🌙',
      });
    }

    // Weather pressure changes
    if (weatherFeatures?.pressure_change) {
      const maxPressureChange = Math.max(...weatherFeatures.pressure_change.map(Math.abs));
      if (maxPressureChange > 3) {
        contributors.push({
          label: `Pressure change (${maxPressureChange.toFixed(1)} hPa)`,
          delta: 0.1,
          icon: '🌤️',
        });
      }
    }

    // Air quality
    if (weatherFeatures?.aqi) {
      const maxAqi = Math.max(...weatherFeatures.aqi);
      if (maxAqi > 100) {
        contributors.push({
          label: 'Poor air quality',
          delta: 0.08,
          icon: '💨',
        });
      }
    }

    return {
      totalRisk,
      baselineRisk: baseline,
      contributors,
    };
  }

  /**
   * Generate actionable suggestions based on risk level
   */
  private generateSuggestions(
    risk: number,
    events: any[],
    weatherFeatures: any
  ): string[] {
    const suggestions = [];

    if (risk > 0.6) {
      suggestions.push('Prepare SootheMode playlist');
      suggestions.push('Consider preventive medication');
      suggestions.push('Block 2pm for quiet time');
    }

    if (events.length >= 3) {
      suggestions.push('Reduce screen time between meetings');
      suggestions.push('Stay hydrated throughout the day');
    }

    if (weatherFeatures?.pressure_change) {
      const maxPressureChange = Math.max(...weatherFeatures.pressure_change.map(Math.abs));
      if (maxPressureChange > 3) {
        suggestions.push('Monitor weather changes');
        suggestions.push('Have rescue meds ready');
      }
    }

    if (weatherFeatures?.aqi) {
      const maxAqi = Math.max(...weatherFeatures.aqi);
      if (maxAqi > 100) {
        suggestions.push('Limit outdoor activities');
        suggestions.push('Use air purifier if available');
      }
    }

    // Stress management
    if (events.length >= 2) {
      suggestions.push('Schedule 10min breathing breaks');
      suggestions.push('Skip afternoon coffee');
    }

    return suggestions.slice(0, 3); // Return top 3
  }

  /**
   * Check if notification should be sent
   * Only send if risk > 60%
   */
  shouldNotify(prediction: TomorrowPrediction | null): boolean {
    if (!prediction) return false;
    return prediction.risk > 0.6;
  }

  /**
   * Get random notification time between 7-9am tomorrow
   */
  getRandomNotificationTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Random hour between 7-9am (420-540 minutes after midnight)
    const randomMinutes = 420 + Math.floor(Math.random() * 120);
    tomorrow.setHours(0, randomMinutes, 0, 0);
    
    return tomorrow;
  }
}

// Export singleton
export const tomorrowPredictionService = new TomorrowPredictionService();
