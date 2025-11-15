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

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: number;
  isAllDay?: boolean;
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
   * Get calendar events for a specific date
   * 
   * Note: This is a mock implementation until the backend endpoint is ready.
   * Once the backend provides a /user/calendar/{userId}/events endpoint,
   * this can be updated to fetch real calendar events.
   */
  async getCalendarEvents(
    userId: string,
    date: Date
  ): Promise<CalendarEvent[]> {
    // TODO: Replace with actual API call when backend endpoint is available
    // const dateStr = date.toISOString().split('T')[0];
    // const response = await apiClient.get<{ events: CalendarEvent[] }>(
    //   `/user/calendar/${userId}/events?date=${dateStr}`
    // );
    // return response.data?.events || [];

    // Mock implementation for now
    return this.generateMockEvents(date);
  }

  /**
   * Generate mock calendar events for demo purposes
   * This will be removed once real calendar API is available
   */
  private generateMockEvents(date: Date): CalendarEvent[] {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    // Weekend events
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return [
        {
          id: `${dateStr}-1`,
          title: 'Morning Yoga',
          start: `${dateStr}T08:00:00`,
          end: `${dateStr}T09:00:00`,
          location: 'Home',
        },
        {
          id: `${dateStr}-2`,
          title: 'Family Brunch',
          start: `${dateStr}T11:00:00`,
          end: `${dateStr}T13:00:00`,
          location: 'Cafe Downtown',
          attendees: 4,
        },
      ];
    }
    
    // Weekday events
    const events: CalendarEvent[] = [
      {
        id: `${dateStr}-1`,
        title: 'Team Standup',
        start: `${dateStr}T09:00:00`,
        end: `${dateStr}T09:30:00`,
        location: 'Zoom',
        attendees: 8,
      },
      {
        id: `${dateStr}-2`,
        title: 'Project Planning',
        start: `${dateStr}T10:00:00`,
        end: `${dateStr}T11:30:00`,
        location: 'Conference Room B',
        attendees: 5,
      },
    ];

    // Add afternoon event on some days
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      events.push({
        id: `${dateStr}-3`,
        title: 'Client Meeting',
        start: `${dateStr}T14:00:00`,
        end: `${dateStr}T15:00:00`,
        location: 'Zoom',
        attendees: 3,
      });
    }

    // Add gym on specific days
    if (dayOfWeek === 2 || dayOfWeek === 4) {
      events.push({
        id: `${dateStr}-4`,
        title: 'Gym Workout',
        start: `${dateStr}T18:00:00`,
        end: `${dateStr}T19:00:00`,
        location: 'Fitness Center',
      });
    }

    return events;
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
