/**
 * Calendar Service - Ticket 019
 * 
 * Client-side service for calendar integration
 * Manages ICS/WebCal URL connections and status
 */

import { apiClient } from '../utils/api';

/**
 * CORS proxy for development - fetches ICS calendars that block direct browser access
 * In production, this should be handled by your backend
 */
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Parse ICS calendar data and extract events
 */
function parseIcsData(icsText: string, targetDate: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icsText.split(/\r?\n/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  let currentField = '';
  
  // Get date range for filtering (target date in local time)
  // Set to start of day in local timezone
  const targetStart = new Date(targetDate);
  targetStart.setHours(0, 0, 0, 0);
  
  const targetEnd = new Date(targetDate);
  targetEnd.setHours(23, 59, 59, 999);
  
  console.log('[parseIcsData] Looking for events on:', targetDate.toDateString());
  console.log('[parseIcsData] Date range (local):', targetStart.toString(), 'to', targetEnd.toString());
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle line continuation
    while (i + 1 < lines.length && lines[i + 1].startsWith(' ')) {
      i++;
      line += lines[i].trim();
    }
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = { id: '', title: '', start: '', end: '' };
    } else if (line === 'END:VEVENT' && currentEvent) {
      // Check if event is on target date
      if (currentEvent.start && currentEvent.end) {
        const eventStart = new Date(currentEvent.start);
        const eventEnd = new Date(currentEvent.end);
        
        console.log('[parseIcsData] Event:', currentEvent.title);
        console.log('[parseIcsData]   Start:', eventStart.toString());
        console.log('[parseIcsData]   End:', eventEnd.toString());
        console.log('[parseIcsData]   Target range:', targetStart.toString(), 'to', targetEnd.toString());
        
        // Include event if it overlaps with target date (using local time comparison)
        if (eventStart <= targetEnd && eventEnd >= targetStart) {
          console.log('[parseIcsData] ✓ Event matches target date');
          events.push(currentEvent as CalendarEvent);
        } else {
          console.log('[parseIcsData] ✗ Event does not match target date');
        }
      }
      currentEvent = null;
    } else if (currentEvent) {
      const [field, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      
      if (field.startsWith('DTSTART')) {
        currentEvent.start = parseIcsDate(value);
        currentEvent.id = currentEvent.id || value;
      } else if (field.startsWith('DTEND')) {
        currentEvent.end = parseIcsDate(value);
      } else if (field === 'SUMMARY') {
        currentEvent.title = value.replace(/\\n/g, ' ').replace(/\\,/g, ',');
      } else if (field === 'LOCATION') {
        currentEvent.location = value.replace(/\\n/g, ' ').replace(/\\,/g, ',');
      } else if (field === 'DESCRIPTION') {
        currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
      } else if (field === 'UID') {
        currentEvent.id = value;
      }
    }
  }
  
  return events;
}

/**
 * Parse ICS date format to ISO string
 */
function parseIcsDate(icsDate: string): string {
  // Handle both DATE and DATE-TIME formats
  // Examples: 20241115T090000Z or 20241115T090000 or 20241115
  const clean = icsDate.replace(/[^0-9TZ]/g, '');
  
  if (clean.length === 8) {
    // All-day event (YYYYMMDD)
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00`;
  } else if (clean.includes('T')) {
    // Date with time
    const [datePart, timePart] = clean.split('T');
    const isUTC = timePart.endsWith('Z');
    const time = timePart.replace('Z', '');
    
    const isoString = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}T` +
                     `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}${isUTC ? 'Z' : ''}`;
    return isoString;
  }
  
  return icsDate;
}

/**
 * Validate and test ICS calendar URL
 */
async function validateIcsUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  // Normalize webcal:// to https://
  const normalizedUrl = url.replace(/^webcal:\/\//, 'https://');
  
  // Validate URL format
  try {
    const urlObj = new URL(normalizedUrl);
    if (!normalizedUrl.endsWith('.ics')) {
      return { valid: false, error: 'URL must end with .ics' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Try to fetch the ICS file to validate it
  try {
    const proxyUrl = CORS_PROXY + encodeURIComponent(normalizedUrl);
    const response = await fetch(proxyUrl, {
      method: 'HEAD',
      headers: { 'Accept': 'text/calendar' }
    });
    
    if (!response.ok) {
      return { valid: false, error: `Calendar URL returned ${response.status}` };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Cannot access calendar URL. Please check the URL is public and accessible.` 
    };
  }
}

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
    // Validate the ICS URL first
    const validation = await validateIcsUrl(calendarUrl);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid calendar URL');
    }

    // Normalize webcal:// to https://
    const normalizedUrl = calendarUrl.replace(/^webcal:\/\//, 'https://');

    const response = await apiClient.post<CalendarConnectionResponse>(
      '/user/calendar',
      { userId, calendarUrl: normalizedUrl }
    );

    if (response.error) {
      // If backend is not available, store locally for demo purposes
      if (response.status === 0 || response.status >= 500) {
        console.warn('Backend not available, using local storage');
        localStorage.setItem(`calendar_${userId}`, normalizedUrl);
        localStorage.setItem(`calendar_${userId}_verified`, new Date().toISOString());
        return {
          status: 'success',
          userId,
          lastVerifiedAt: new Date().toISOString(),
          message: 'Calendar connected (local mode)'
        };
      }
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
      // Check local storage as fallback
      const localUrl = localStorage.getItem(`calendar_${userId}`);
      const localVerified = localStorage.getItem(`calendar_${userId}_verified`);
      
      if (localUrl) {
        return {
          connected: true,
          userId,
          lastVerifiedAt: localVerified || undefined
        };
      }
      
      // If not in local storage either, return not connected
      return {
        connected: false,
        userId
      };
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
   * Fetches and parses ICS data from the connected calendar URL
   */
  async getCalendarEvents(
    userId: string,
    date: Date
  ): Promise<CalendarEvent[]> {
    try {
      console.log('[CalendarService] Getting events for userId:', userId, 'date:', date);
      
      // Get the calendar URL from localStorage or backend
      let calendarUrl = localStorage.getItem(`calendar_${userId}`);
      console.log('[CalendarService] Calendar URL from localStorage:', calendarUrl);
      
      if (!calendarUrl) {
        // Try to get from backend
        const response = await apiClient.get<{ calendarUrl: string }>(
          `/user/calendar/${userId}/url`
        );
        if (response.data?.calendarUrl) {
          calendarUrl = response.data.calendarUrl;
          console.log('[CalendarService] Calendar URL from backend:', calendarUrl);
        }
      }
      
      if (!calendarUrl) {
        console.log('[CalendarService] No calendar URL found, using mock data');
        return this.generateMockEvents(date);
      }
      
      console.log('[CalendarService] Fetching ICS from:', calendarUrl);
      
      // Fetch ICS data through CORS proxy
      const proxyUrl = CORS_PROXY + encodeURIComponent(calendarUrl);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.error('[CalendarService] Failed to fetch calendar:', response.status);
        return this.generateMockEvents(date);
      }
      
      const icsText = await response.text();
      console.log('[CalendarService] ICS data length:', icsText.length, 'chars');
      console.log('[CalendarService] ICS preview:', icsText.substring(0, 200));
      
      const events = parseIcsData(icsText, date);
      
      console.log(`[CalendarService] Parsed ${events.length} real events for ${date.toDateString()}`);
      if (events.length > 0) {
        console.log('[CalendarService] First event:', events[0]);
      }
      return events;
      
    } catch (error) {
      console.error('[CalendarService] Error fetching calendar events:', error);
      // Fallback to mock events on error
      return this.generateMockEvents(date);
    }
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
