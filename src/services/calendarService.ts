/**
 * Calendar Service - Ticket 019
 * 
 * Client-side service for calendar integration
 * Manages ICS/WebCal URL connections and status
 */

import { apiClient } from '../utils/api';

export interface CalendarConnectionRequest {
  userId: string;
  calendarUrl: string;
}

export interface CalendarConnectionResponse {
  status: string;
  userId: string;
  lastVerifiedAt?: string;
  message?: string;
}

export interface CalendarStatusResponse {
  connected: boolean;
  userId: string;
  lastVerifiedAt?: string;
}

export interface ContextGenerationRequest {
  userId: string;
  priors: Record<string, { a: number; b: number }>;
}

export interface ContextGenerationResponse {
  userId: string;
  posteriors: Record<string, { a: number; b: number }>;
  features: Array<{
    feature: string;
    prior: { a: number; b: number };
    posterior: { a: number; b: number };
    meanPrior: number;
    meanPosterior: number;
  }>;
  timestamp: string;
}

class CalendarService {
  /**
   * Save calendar connection for a user
   */
  async saveCalendarConnection(
    userId: string,
    calendarUrl: string
  ): Promise<CalendarConnectionResponse> {
    const response = await apiClient.post<CalendarConnectionResponse>(
      '/user/calendar',
      { userId, calendarUrl }
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  /**
   * Get calendar connection status
   */
  async getCalendarStatus(userId: string): Promise<CalendarStatusResponse> {
    const response = await apiClient.get<CalendarStatusResponse>(
      `/user/calendar/${userId}`
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  /**
   * Delete calendar connection
   */
  async deleteCalendarConnection(userId: string): Promise<void> {
    const response = await apiClient.delete(`/user/calendar/${userId}`);

    if (response.error) {
      throw new Error(response.error);
    }
  }

  /**
   * Generate context from calendar and priors
   */
  async generateContext(
    userId: string,
    priors: Record<string, { a: number; b: number }>
  ): Promise<ContextGenerationResponse> {
    const response = await apiClient.post<ContextGenerationResponse>(
      '/aline/generate-context',
      { userId, priors }
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  /**
   * Get provider-specific instructions for obtaining ICS URL
   */
  getProviderInstructions(provider: string): {
    title: string;
    steps: string[];
  } {
    const instructions = {
      google: {
        title: 'Google Calendar',
        steps: [
          'Open Google Calendar on your computer',
          'Click Settings (gear icon) → Settings',
          'Select the calendar you want to connect',
          'Scroll to "Integrate calendar"',
          'Copy the "Secret address in iCal format"',
          'Paste it below',
        ],
      },
      outlook: {
        title: 'Outlook / Office 365',
        steps: [
          'Open Outlook Calendar on the web',
          'Click Settings → View all Outlook settings',
          'Go to Calendar → Shared calendars',
          'Under "Publish a calendar", select your calendar',
          'Click "Publish"',
          'Copy the ICS link',
          'Paste it below',
        ],
      },
      apple: {
        title: 'Apple iCloud Calendar',
        steps: [
          'Open the Calendar app on your Mac',
          'Right-click the calendar you want to share',
          'Select "Share Calendar"',
          'Check "Public Calendar"',
          'Copy the link provided',
          'Paste it below',
        ],
      },
      other: {
        title: 'Other Calendar (Manual)',
        steps: [
          'Find your calendar\'s sharing or export settings',
          'Look for "ICS", "iCal", or "WebCal" URL',
          'The URL should end with .ics or start with webcal://',
          'Copy the URL',
          'Paste it below',
        ],
      },
    };

    return instructions[provider as keyof typeof instructions] || instructions.other;
  }
}

export const calendarService = new CalendarService();
