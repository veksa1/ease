/**
 * Calendar Events Display - Shows user's calendar events
 * 
 * Displays events from the user's connected calendar
 * to provide context for migraine predictions
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { calendarService } from '../services/calendarService';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: number;
  isAllDay?: boolean;
}

interface CalendarEventsDisplayProps {
  userId: string;
  date?: Date;
  compact?: boolean;
  onNavigateToProfile?: () => void;
}

export function CalendarEventsDisplay({ userId, date = new Date(), compact = false, onNavigateToProfile }: CalendarEventsDisplayProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Debug: Log what's in localStorage
  useEffect(() => {
    console.log('[CalendarEventsDisplay] Checking localStorage for userId:', userId);
    console.log('[CalendarEventsDisplay] calendar_demo-user:', localStorage.getItem('calendar_demo-user'));
    console.log('[CalendarEventsDisplay] All localStorage keys:', Object.keys(localStorage));
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [userId, date]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      // First check if calendar is connected
      const status = await calendarService.getCalendarStatus(userId);
      console.log('Calendar status:', status);
      setIsConnected(status.connected);

      if (!status.connected) {
        setLoading(false);
        return;
      }

      // Fetch calendar events for the selected date
      console.log('Fetching events for date:', date);
      const events = await calendarService.getCalendarEvents(userId, date);
      console.log('Received events:', events);
      setEvents(events);
      setLoading(false);
    } catch (err) {
      console.error('Calendar events error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar events');
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <h3 className="text-label font-medium text-foreground mb-1">
              No Calendar Connected
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Connect your calendar to see upcoming events and get better predictions.
            </p>
            <button 
              onClick={onNavigateToProfile}
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
            >
              Connect Calendar
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="text-sm text-destructive font-medium">Failed to load events</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-6 text-center bg-muted/30 rounded-lg border border-border">
        <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No events scheduled for this day</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-2.5 md:p-3 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-foreground truncate mb-1">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 md:gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(event.start)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center justify-between mb-1 md:mb-2">
        <h3 className="text-sm md:text-label font-medium text-foreground flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Calendar Events
        </h3>
        <span className="text-xs text-muted-foreground">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div className="space-y-2 md:space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-3 md:p-4 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-2.5 md:gap-3">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm md:text-base font-medium text-foreground mb-1.5 md:mb-2">
                  {event.title}
                </h4>
                
                <div className="space-y-1 md:space-y-1.5">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    <span>
                      {formatTime(event.start)} - {formatTime(event.end)}
                    </span>
                    <span className="text-xs hidden md:inline">
                      ({formatDuration(event.start, event.end)})
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  
                  {event.attendees && event.attendees > 1 && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                      <span>{event.attendees} attendees</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
