/**
 * User Features Service
 * 
 * Collects real user data to build 35-feature matrix for ALINE.
 * Replaces all generateMockFeatures() calls throughout the app.
 * 
 * Data Sources:
 * - SQLite: Quick Check entries, timeline events
 * - Calendar: Events for context
 * - Weather: Environmental factors (from cache)
 * - Biometrics: Sleep, HRV (when available)
 */

import { sqliteService } from './sqliteService';
import { calendarService } from './calendarService';

export interface UserFeatureContext {
  userId: string;
  date: Date;
  includeCalendar?: boolean;
  includeWeather?: boolean;
}

export interface FeatureSource {
  index: number;
  name: string;
  value: number;
  source: 'user_input' | 'calendar' | 'weather' | 'biometric' | 'default';
  confidence: number; // 0-1, how reliable this value is
}

interface QuickCheckEntry {
  timestamp: string;
  data: string; // JSON string
}

class UserFeaturesService {
  private featureCount = 35;
  
  // Feature name to index mapping (from feature_order.yaml)
  private featureMap: Record<string, number> = {
    'Sleep Duration (hours)': 0,
    'Sleep Quality (1-10)': 1,
    'Sleep Consistency Score': 2,
    'Stress Level (1-10)': 3,
    'Work Hours': 4,
    'Anxiety Score (1-10)': 5,
    'Caffeine Intake (mg)': 6,
    'Water Intake (L)': 7,
    'Meal Regularity (1-10)': 8,
    'Exercise Duration (min)': 9,
    'Physical Activity Level (1-10)': 10,
    'Neck Tension (1-10)': 11,
    'Screen Time (hours)': 12,
    'Weather Pressure (hPa)': 13,
    'Noise Level (dB)': 14,
    'Hormone Fluctuation Index': 15,
    'Menstrual Cycle Day': 16,
    'Alcohol Consumption (units)': 17,
    'Smoking (cigarettes/day)': 18,
    'Meditation Time (min)': 19,
    'day_of_week_sin': 20,
    'day_of_week_cos': 21,
    'week_of_year_sin': 22,
    'week_of_year_cos': 23,
    'HRV': 24,
    'Resting Heart Rate': 25,
    'Body Temperature Change': 26,
    'Barometric Pressure Change': 27,
    'Air Quality Index': 28,
    'Altitude': 29,
    'Prodrome Symptoms': 30,
    'Age': 31,
    'Body Weight': 32,
    'BMI': 33,
    'Migraine History Years': 34,
  };

  // Default values from priors.yaml
  private defaultValues: Record<number, number> = {
    0: 7.0,    // Sleep Duration
    1: 6.5,    // Sleep Quality
    2: 6.0,    // Sleep Consistency
    3: 6.0,    // Stress Level
    4: 8.5,    // Work Hours
    5: 5.5,    // Anxiety Score
    6: 200,    // Caffeine (mg)
    7: 2.0,    // Water (L)
    8: 6.5,    // Meal Regularity
    9: 30,     // Exercise Duration
    10: 5.5,   // Physical Activity
    11: 4.5,   // Neck Tension
    12: 8.0,   // Screen Time
    13: 1013,  // Weather Pressure
    14: 55,    // Noise Level
    15: 5.0,   // Hormone Fluctuation
    16: 14,    // Menstrual Cycle Day
    17: 1.6,   // Alcohol
    18: 0,     // Smoking
    19: 0,     // Meditation
    20: 0,     // day_of_week_sin
    21: 0,     // day_of_week_cos
    22: 0,     // week_of_year_sin
    23: 0,     // week_of_year_cos
    24: 50,    // HRV
    25: 70,    // Resting Heart Rate
    26: 0,     // Body Temperature Change
    27: 0,     // Barometric Pressure Change
    28: 50,    // Air Quality Index
    29: 0,     // Altitude
    30: 0,     // Prodrome Symptoms
    31: 35,    // Age
    32: 70,    // Body Weight
    33: 23,    // BMI
    34: 5,     // Migraine History Years
  };

  /**
   * Build 24-hour feature matrix from real user data
   * 
   * @returns [24, 35] matrix ready for ALINE API
   */
  async get24HourFeatures(context: UserFeatureContext): Promise<number[][]> {
    const features: number[][] = [];
    
    // Get user's recent Quick Check data
    const recentChecks = await this.getRecentQuickChecks(context.userId, context.date);
    
    // Get calendar events for the day
    const calendarEvents = context.includeCalendar
      ? await calendarService.getCalendarEvents(context.userId, context.date)
      : [];
    
    console.log(`[UserFeaturesService] Building features from ${recentChecks.length} checks, ${calendarEvents.length} events`);
    
    // Build hourly feature vectors
    for (let hour = 0; hour < 24; hour++) {
      const hourlyFeatures = await this.buildHourlyFeatures({
        hour,
        date: context.date,
        recentChecks,
        calendarEvents,
      });
      
      features.push(hourlyFeatures);
    }
    
    return features;
  }

  /**
   * Build single hour's feature vector (35 features)
   */
  private async buildHourlyFeatures(params: {
    hour: number;
    date: Date;
    recentChecks: QuickCheckEntry[];
    calendarEvents: any[];
  }): Promise<number[]> {
    const features = new Array(this.featureCount).fill(0);
    const sources: FeatureSource[] = [];
    
    // Extract from Quick Check data
    const qcFeatures = this.extractQuickCheckFeatures(params.recentChecks, params.hour);
    
    // Extract from calendar
    const calendarFeatures = this.extractCalendarFeatures(params.calendarEvents, params.hour);
    
    // Extract temporal features
    const temporalFeatures = this.extractTemporalFeatures(params.date, params.hour);
    
    // Merge with priority: user_input > calendar > temporal > default
    for (let i = 0; i < this.featureCount; i++) {
      if (qcFeatures[i] !== undefined) {
        features[i] = qcFeatures[i]!;
        sources.push({
          index: i,
          name: this.getFeatureName(i),
          value: qcFeatures[i]!,
          source: 'user_input',
          confidence: 1.0,
        });
      } else if (calendarFeatures[i] !== undefined) {
        features[i] = calendarFeatures[i]!;
        sources.push({
          index: i,
          name: this.getFeatureName(i),
          value: calendarFeatures[i]!,
          source: 'calendar',
          confidence: 0.7,
        });
      } else if (temporalFeatures[i] !== undefined) {
        features[i] = temporalFeatures[i]!;
        sources.push({
          index: i,
          name: this.getFeatureName(i),
          value: temporalFeatures[i]!,
          source: 'default',
          confidence: 1.0,
        });
      } else {
        // Use smart default (population mean)
        features[i] = this.getDefaultValue(i);
        sources.push({
          index: i,
          name: this.getFeatureName(i),
          value: features[i],
          source: 'default',
          confidence: 0.3,
        });
      }
    }
    
    // Log feature coverage for debugging
    const userInputCount = sources.filter(s => s.source === 'user_input').length;
    const coverage = userInputCount / this.featureCount;
    
    if (params.hour === 0) {
      console.log(`[UserFeaturesService] Feature coverage: ${(coverage * 100).toFixed(0)}% (${userInputCount}/35 from user input)`);
    }
    
    return features;
  }

  /**
   * Extract features from Quick Check entries
   */
  private extractQuickCheckFeatures(checks: QuickCheckEntry[], hour: number): Partial<Record<number, number>> {
    const features: Partial<Record<number, number>> = {};
    
    if (checks.length === 0) return features;
    
    // Find most recent check before or at this hour
    const relevantCheck = checks
      .filter(c => {
        const checkDate = new Date(c.timestamp);
        const checkHour = checkDate.getHours();
        return checkHour <= hour;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!relevantCheck) return features;
    
    try {
      const checkData = JSON.parse(relevantCheck.data);
      
      // Map Quick Check data to feature indices
      // Sleep features
      if (checkData.sleep?.hours !== undefined) {
        features[0] = checkData.sleep.hours; // Sleep Duration
      }
      if (checkData.sleep?.quality !== undefined) {
        features[1] = checkData.sleep.quality; // Sleep Quality
      }
      
      // Stress/Mental
      if (checkData.stress?.level !== undefined) {
        features[3] = checkData.stress.level; // Stress Level
      }
      if (checkData.anxiety?.level !== undefined) {
        features[5] = checkData.anxiety.level; // Anxiety Score
      }
      
      // Diet/Nutrition
      if (checkData.caffeine?.level !== undefined) {
        features[6] = this.mapCaffeineLevel(checkData.caffeine.level); // Caffeine
      }
      if (checkData.water?.amount !== undefined) {
        features[7] = this.mapWaterAmount(checkData.water.amount); // Water
      }
      if (checkData.food?.regularity !== undefined) {
        features[8] = checkData.food.regularity; // Meal Regularity
      }
      
      // Physical
      if (checkData.exercise?.duration !== undefined) {
        features[9] = checkData.exercise.duration; // Exercise Duration
      }
      if (checkData.exercise?.intensity !== undefined) {
        features[10] = checkData.exercise.intensity; // Physical Activity Level
      }
      if (checkData.neckTension?.level !== undefined) {
        features[11] = checkData.neckTension.level; // Neck Tension
      }
      
      // Lifestyle
      if (checkData.screenTime?.hours !== undefined) {
        features[12] = checkData.screenTime.hours; // Screen Time
      }
      
    } catch (error) {
      console.error('[UserFeaturesService] Error parsing check data:', error);
    }
    
    return features;
  }

  /**
   * Extract features from calendar events
   */
  private extractCalendarFeatures(events: any[], hour: number): Partial<Record<number, number>> {
    const features: Partial<Record<number, number>> = {};
    
    if (events.length === 0) return features;
    
    // Find events during this hour
    const activeEvents = events.filter(e => {
      const start = new Date(e.start).getHours();
      const end = new Date(e.end).getHours();
      return hour >= start && hour <= end;
    });
    
    if (activeEvents.length === 0) return features;
    
    // Index 4: Work Hours (count meetings as work)
    const workEvents = activeEvents.filter(e => {
      const title = e.title?.toLowerCase() || '';
      return (
        title.includes('meeting') ||
        title.includes('call') ||
        title.includes('review') ||
        title.includes('sync') ||
        title.includes('standup')
      );
    });
    features[4] = workEvents.length > 0 ? 1 : 0;
    
    // Index 3: Stress Level (more events = potentially higher stress)
    // Only increment stress if not already set by user input
    if (activeEvents.length > 2) {
      features[3] = Math.min(10, 5 + activeEvents.length);
    }
    
    return features;
  }

  /**
   * Extract temporal features (cyclical encoding)
   */
  private extractTemporalFeatures(date: Date, hour: number): Partial<Record<number, number>> {
    const features: Partial<Record<number, number>> = {};
    
    // Day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = date.getDay();
    features[20] = Math.sin(2 * Math.PI * dayOfWeek / 7); // day_of_week_sin
    features[21] = Math.cos(2 * Math.PI * dayOfWeek / 7); // day_of_week_cos
    
    // Week of year
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekOfYear = Math.floor(dayOfYear / 7);
    features[22] = Math.sin(2 * Math.PI * weekOfYear / 52); // week_of_year_sin
    features[23] = Math.cos(2 * Math.PI * weekOfYear / 52); // week_of_year_cos
    
    return features;
  }

  /**
   * Get recent Quick Check entries from SQLite
   */
  private async getRecentQuickChecks(userId: string, date: Date): Promise<QuickCheckEntry[]> {
    try {
      await sqliteService.init();
      const db = sqliteService['db']; // Access private db instance
      
      if (!db) {
        console.error('[UserFeaturesService] Database not initialized');
        return [];
      }
      
      const query = `
        SELECT timestamp, data FROM user_timeline
        WHERE user_id = ?
          AND type = 'quick_check'
          AND date(timestamp) >= date(?, '-7 days')
        ORDER BY timestamp DESC
        LIMIT 10
      `;
      
      const results = db.exec(query, [userId, date.toISOString()]);
      
      if (!results || results.length === 0 || !results[0].values) {
        return [];
      }
      
      return results[0].values.map((row: any) => ({
        timestamp: row[0] as string,
        data: row[1] as string,
      }));
    } catch (error) {
      console.error('[UserFeaturesService] Error fetching Quick Checks:', error);
      return [];
    }
  }

  private mapCaffeineLevel(level: string): number {
    const map: Record<string, number> = { 
      'none': 0, 
      'low': 100, 
      'medium': 200, 
      'high': 400 
    };
    return map[level] || 0;
  }

  private mapWaterAmount(amount: string): number {
    const map: Record<string, number> = { 
      'low': 0.5, 
      'medium': 1.5, 
      'high': 2.5 
    };
    return map[amount] || 1.5;
  }

  private getDefaultValue(featureIndex: number): number {
    return this.defaultValues[featureIndex] || 0;
  }

  private getFeatureName(index: number): string {
    const entry = Object.entries(this.featureMap).find(([_, idx]) => idx === index);
    return entry ? entry[0] : `Feature ${index}`;
  }

  /**
   * Validate feature matrix before sending to API
   */
  validateFeatures(features: number[][]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (features.length !== 24) {
      errors.push(`Expected 24 hours, got ${features.length}`);
    }
    
    features.forEach((hourFeatures, hour) => {
      if (hourFeatures.length !== this.featureCount) {
        errors.push(`Hour ${hour}: Expected ${this.featureCount} features, got ${hourFeatures.length}`);
      }
      
      // Check for NaN or Infinity
      hourFeatures.forEach((value, idx) => {
        if (!isFinite(value)) {
          errors.push(`Hour ${hour}, Feature ${idx}: Invalid value ${value}`);
        }
      });
    });
    
    return { valid: errors.length === 0, errors };
  }
}

// Export singleton
export const userFeaturesService = new UserFeaturesService();
