/**
 * Demo Data Service - Ticket 014
 * 
 * Client-side data service that loads pre-computed demo predictions
 * and provides typed access to ALINE data throughout the app.
 * 
 * Features:
 * - Loads demoUserAlex.json with TypeScript types
 * - Provides methods for querying predictions by date
 * - Manages user timeline with localStorage persistence
 * - Simulates realistic loading delays for polish
 */

import demoData from '../data/demoUserAlex.json';
import type { 
  DemoDataset, 
  DailyPrediction, 
  Correlation, 
  CalendarDay,
  HourlyRisk,
  UserTimelineEntry
} from '../types/aline';

class DemoDataService {
  private data: DemoDataset;
  private userTimeline: Map<string, UserTimelineEntry[]>;

  constructor() {
    this.data = demoData as DemoDataset;
    this.loadTimeline();
  }

  /**
   * Load user timeline from localStorage
   */
  private loadTimeline() {
    const stored = localStorage.getItem('ease_user_timeline');
    if (stored) {
      try {
        const entries = JSON.parse(stored);
        this.userTimeline = new Map(entries);
      } catch {
        this.userTimeline = new Map();
      }
    } else {
      this.userTimeline = new Map();
    }
  }

  /**
   * Save timeline to localStorage
   */
  private saveTimeline() {
    try {
      localStorage.setItem(
        'ease_user_timeline',
        JSON.stringify(Array.from(this.userTimeline.entries()))
      );
    } catch (error) {
      console.error('Failed to save timeline:', error);
    }
  }

  /**
   * Get prediction for a specific date
   * @param date ISO date string (YYYY-MM-DD)
   */
  getPredictionByDate(date: string): DailyPrediction | null {
    const dateOnly = date.split('T')[0];
    return this.data.predictions.find(p => p.date.startsWith(dateOnly)) || null;
  }

  /**
   * Get current risk (latest prediction)
   */
  getCurrentRisk(): { risk: number; lower: number; upper: number } {
    const latest = this.data.predictions[this.data.predictions.length - 1];
    return {
      risk: latest.daily_risk.mean,
      lower: latest.daily_risk.lower,
      upper: latest.daily_risk.upper
    };
  }

  /**
   * Get hourly risk for a date
   * @param date ISO date string
   */
  getHourlyRisk(date: string): HourlyRisk[] {
    const prediction = this.getPredictionByDate(date);
    return prediction?.hourly_risks || [];
  }

  /**
   * Get calendar data for a month
   * @param year Year number (e.g., 2025)
   * @param month Month number (0-11)
   */
  getCalendarMonth(year: number, month: number): CalendarDay[] {
    return this.data.calendar.filter(day => {
      const d = new Date(day.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  /**
   * Get all correlations
   */
  getCorrelations(): Correlation[] {
    return this.data.correlations;
  }

  /**
   * Add entry to user timeline
   * @param date ISO date string
   * @param type Entry type
   * @param data Entry data
   */
  addTimelineEntry(date: string, type: string, data: any) {
    const dateKey = date.split('T')[0];
    if (!this.userTimeline.has(dateKey)) {
      this.userTimeline.set(dateKey, []);
    }
    this.userTimeline.get(dateKey)!.push({ 
      type: type as any, 
      data, 
      timestamp: new Date().toISOString() 
    });
    this.saveTimeline();
  }

  /**
   * Get timeline entries for a date
   * @param date ISO date string
   */
  getTimelineEntries(date: string): UserTimelineEntry[] {
    const dateKey = date.split('T')[0];
    return this.userTimeline.get(dateKey) || [];
  }

  /**
   * Get all predictions
   */
  getAllPredictions(): DailyPrediction[] {
    return this.data.predictions;
  }

  /**
   * Get demo user info
   */
  getUser() {
    return this.data.user;
  }

  /**
   * Reset demo (clear localStorage)
   */
  resetDemo() {
    localStorage.removeItem('ease_user_timeline');
    localStorage.removeItem('ease_streak_count');
    localStorage.removeItem('ease_experiments');
    localStorage.removeItem('ease_has_seen_onboarding');
    this.userTimeline.clear();
  }
}

// Export singleton instance
export const demoDataService = new DemoDataService();
