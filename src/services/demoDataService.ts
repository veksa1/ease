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
import { sqliteService } from './sqliteService';
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

  constructor() {
    this.data = demoData as DemoDataset;
    // Initialize SQLite database
    sqliteService.init().catch(err => {
      console.error('Failed to initialize database:', err);
    });
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
  async addTimelineEntry(date: string, type: string, data: any) {
    await sqliteService.addTimelineEntry(date, type, data);
  }

  /**
   * Get timeline entries for a date
   * @param date ISO date string
   */
  async getTimelineEntries(date: string): Promise<UserTimelineEntry[]> {
    return await sqliteService.getTimelineEntries(date);
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
   * Reset demo (clear database)
   */
  async resetDemo() {
    await sqliteService.resetDatabase();
  }
}

// Export singleton instance
export const demoDataService = new DemoDataService();
