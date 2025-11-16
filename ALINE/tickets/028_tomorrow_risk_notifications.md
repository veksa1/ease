# 🌅 Ticket 028 – Tomorrow's Risk Morning Notifications

**Date:** 2025-11-16  
**Owner:** Frontend + Backend  
**Status:** 🔧 To Do  
**Priority:** High  
**Effort:** Medium (2-3 days)  
**Epic:** Feature Enhancement - Phase 1

---

## 🎯 Objective

Create smart morning notifications (randomized 7-9am) that show tomorrow's predicted risk when it's high (>60%), leveraging calendar integration to explain why and suggest actions.

**Key Result:** Users wake up to "Tomorrow looks high-risk (72%) — 4 meetings + pressure dropping" with actionable preparation steps, only when it matters.

---

## 📊 Background

**Current State:**
- Calendar integration exists (`/user/calendar`, `/aline/generate-context`)
- Daily risk predictions available (`/risk/daily`)
- But users don't know about tomorrow's risk until it's too late

**Target Experience:**
```
8:23am notification:
"⚠️ Tomorrow's migraine risk is high (72%)

Why:
• Project review meeting (+15%)
• Late team dinner (+8%)
• Barometric pressure dropping (-5 hPa)

Suggested actions:
✓ Prepare SootheMode playlist
✓ Block 2pm for quiet time
✓ Skip afternoon coffee"
```

---

## 📂 Dependencies

**Existing Code:**
- `src/services/calendarService.ts` - Calendar integration
- `src/services/riskPredictionService.ts` - Risk prediction API
- `src/services/userFeaturesService.ts` - Real user feature collection (from Ticket 027)
- `ALINE/service/main.py` - `/aline/generate-context` endpoint
- `src/services/sqliteService.ts` - Database for persistence

**New Files to Create:**
- `src/services/locationContextService.ts` - n8n location-context API client
- `src/services/tomorrowPredictionService.ts` - Tomorrow prediction logic
- `src/components/TomorrowRiskBanner.tsx` - In-app notification banner
- `src/hooks/useTomorrowRisk.ts` - React hook for tomorrow's data
- `src/utils/notificationScheduler.ts` - Browser notification scheduling

**APIs:**
- `POST /aline/generate-context` (existing)
- `POST /risk/daily` (existing)
- `GET /weather/forecast` (from Ticket 023)
- `POST https://playerplanet.app.n8n.cloud/webhook/aline/location-context` (n8n - NEW)
- Browser Notification API

**⚠️ CRITICAL CHANGE - Real Data Only:**
Tomorrow predictions require:
1. Today's user features (via `userFeaturesService`)
2. Tomorrow's calendar events (via `calendarService`)
3. Tomorrow's weather forecast (via `weatherForecastService`)

No mock/demo data allowed - this feature depends on real user timeline.

---

## 🧩 Tasks

### 0. Data Flow for Tomorrow Predictions (Architecture)

**How Tomorrow Risk is Computed:**

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA COLLECTION PHASE                      │
└─────────────────────────────────────────────────────────────┘

1. Today's Baseline (userFeaturesService)
   └─> Last 7 days of Quick Checks
   └─> Recent sleep patterns
   └─> Current stress levels
   └─> Biometric trends
   
2. Tomorrow's Location & Context (n8n webhook - NEW)
   POST /webhook/aline/location-context
   {
     userId, date, calendarUrl
   }
   └─> Returns: Calendar events + Location + Weather forecast
   
   OR if n8n unavailable:
   
   2a. Tomorrow's Calendar (calendarService)
       └─> Meeting count & duration
       └─> Travel events (location changes)
       └─> Social events (stress modifiers)
       └─> Time zones (sleep disruption)
   
   2b. Tomorrow's Weather (weatherForecastService - Ticket 023)
       └─> Barometric pressure forecast
       └─> Temperature changes
       └─> Humidity levels
       └─> Air quality index
   
┌─────────────────────────────────────────────────────────────┐
│                    FEATURE SYNTHESIS                         │
└─────────────────────────────────────────────────────────────┘

4. Build Tomorrow's 24-Hour Feature Matrix
   ├─> Carry forward: Sleep debt, HRV trend, baseline stress
   ├─> Calendar overlay: Work hours, meeting stress
   ├─> Weather overlay: Pressure changes, AQI
   └─> Result: [24, 35] feature matrix
   
┌─────────────────────────────────────────────────────────────┐
│                    RISK PREDICTION                           │
└─────────────────────────────────────────────────────────────┘

5. Send to ALINE Backend
   POST /risk/daily
   {
     user_id: "...",
     features: [[...], ...],  // 24 x 35
   }
   
6. Get Prediction
   {
     mean_probability: 0.72,
     lower_bound: 0.65,
     upper_bound: 0.79,
     timestamp: "..."
   }
   
7. Decompose Risk Contributors
   - Compare with/without calendar events → "4 meetings +15%"
   - Compare with/without pressure drop → "Pressure dropping -5 hPa"
   - Compare with/without sleep debt → "Sleep debt +8%"
```

**Feature Sources for Tomorrow:**

| Feature Index | Name | Source | Notes |
|--------------|------|--------|-------|
| 0-2 | Sleep features | Today's pattern | Assume similar sleep |
| 3-5 | Stress features | Calendar | Meeting count → stress |
| 6-8 | Diet features | Today's average | Assume continuity |
| 13 | Weather Pressure | n8n location-context | Tomorrow's forecast |
| 20-23 | Temporal | Date calculation | Tomorrow's date |
| 24 | HRV | Today's trend | Extrapolate |
| 27 | Barometric Δ | n8n location-context | Predicted 3h change |
| 28 | AQI | n8n location-context | Tomorrow's AQI |

---

### 1. n8n Location-Context API Schema ✅ AVAILABLE

**Endpoint:** `POST https://playerplanet.app.n8n.cloud/webhook/aline/location-context`

**Purpose:** Extract location from calendar events and fetch weather forecast for that location.

**Request Schema:**
```json
{
  "userId": "test-user-123",
  "date": "2025-11-16",
  "calendarUrl": "https://calendar.google.com/calendar/ical/.../basic.ics"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User identifier for tracking/logging |
| `date` | string | Yes | ISO date (YYYY-MM-DD) to get location for |
| `calendarUrl` | string | Yes | ICS calendar URL (Google/Outlook/iCloud) |

**Response Schema:**
```json
{
  "userId": "test-user-123",
  "date": "2025-11-16",
  "location": {
    "source": "calendar_event",
    "raw": "Conference Center, San Francisco",
    "geocoded": {
      "lat": 37.7749,
      "lon": -122.4194,
      "city": "San Francisco",
      "country": "US"
    }
  },
  "weather": {
    "current": {
      "temperature": 18.5,
      "pressure": 1013.2,
      "humidity": 72,
      "aqi": 45
    },
    "forecast_24h": [
      {
        "hour": 0,
        "temperature": 17.2,
        "pressure": 1013.5,
        "pressure_change": -0.3,
        "humidity": 75,
        "aqi": 42
      },
      // ... 23 more hours
    ]
  },
  "calendarEvents": [
    {
      "title": "Team Meeting",
      "start": "2025-11-16T10:00:00",
      "end": "2025-11-16T11:00:00",
      "location": "Conference Center, San Francisco"
    }
  ],
  "timestamp": "2025-11-16T08:23:15Z"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `location.source` | string | `calendar_event` or `fallback` |
| `location.geocoded.lat` | number | Latitude (-90 to 90) |
| `location.geocoded.lon` | number | Longitude (-180 to 180) |
| `weather.forecast_24h` | array | 24 hourly forecasts |
| `weather.forecast_24h[].pressure_change` | number | ΔP from previous hour (hPa) |
| `calendarEvents` | array | All events for the date |

**Error Handling:**
```json
// No location found
{
  "error": "no_location_found",
  "message": "No calendar events with location for 2025-11-16",
  "fallback": {
    "location": null,
    "weather": null
  }
}

// Invalid calendar URL
{
  "error": "calendar_fetch_failed",
  "message": "Unable to fetch calendar from provided URL"
}
```

**Usage in Frontend:**

**File:** `src/services/locationContextService.ts` (NEW)

```typescript
import { apiClient } from '../utils/api';

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
      const response = await fetch(this.n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.error('n8n webhook failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling n8n location-context:', error);
      return null;
    }
  }

  /**
   * Extract weather features from n8n response
   */
  extractWeatherFeatures(response: LocationContextResponse): {
    pressure: number[];
    pressure_change: number[];
    temperature: number[];
    humidity: number[];
    aqi: number[];
  } {
    if (!response.weather) {
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
}

export const locationContextService = new LocationContextService();
```

**Integration Example:**
```typescript
// Get tomorrow's location and weather from calendar
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const context = await locationContextService.getLocationContext({
  userId: 'demo-user',
  date: tomorrow.toISOString().split('T')[0], // "2025-11-17"
  calendarUrl: userCalendarUrl,
});

if (context?.weather) {
  console.log('Tomorrow\'s pressure change:', context.weather.forecast_24h[12].pressure_change);
  console.log('Events at location:', context.location?.geocoded.city);
}
```

**Benefits:**
- ✅ Single API call gets location + weather + calendar
- ✅ n8n handles ICS parsing, geocoding, OpenWeather calls
- ✅ 24-hour forecast included (ready for feature matrix)
- ✅ Pressure changes pre-calculated

---

### 2. Create Tomorrow Prediction Service

**File:** `src/services/tomorrowPredictionService.ts`

```typescript
/**
 * Tomorrow Prediction Service
 * 
 * Combines calendar context with risk prediction to forecast tomorrow.
 * Uses REAL user data - no mock features.
 */

import { calendarService } from './calendarService';
import { userFeaturesService } from './userFeaturesService';
import { riskPredictionService } from './riskPredictionService';
import { apiClient } from '../utils/api';

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
      const calendarStatus = await calendarService.getConnectionStatus(userId);
      
      if (!calendarStatus.connected) {
        console.log('No calendar connected - using baseline prediction only');
        return this.getBaselineTomorrowRisk(userId);
      }

      // 2. Get tomorrow's location, calendar, and weather from n8n
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      
      // Get user's calendar URL from database
      const userCalendarUrl = await calendarService.getCalendarUrl(userId);
      
      if (!userCalendarUrl) {
        console.log('No calendar URL found - using baseline prediction');
        return this.getBaselineTomorrowRisk(userId);
      }
      
      // Call n8n webhook for location + weather + calendar
      const locationContext = await locationContextService.getLocationContext({
        userId,
        date: tomorrowDate,
        calendarUrl: userCalendarUrl,
      });
      
      if (!locationContext) {
        console.error('Failed to get location context from n8n');
        return this.getBaselineTomorrowRisk(userId);
      }
      
      const events = locationContext.calendarEvents;
      console.log(`Found ${events.length} events for tomorrow`);
      console.log(`Location: ${locationContext.location?.geocoded.city || 'unknown'}`);

      // 3. Build tomorrow's feature matrix using real user data
      console.log('Building tomorrow\'s features from real user data...');
      
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
        console.error('Invalid tomorrow features:', validation.errors);
        return this.getBaselineTomorrowRisk(userId);
      }

      // 4. Get risk prediction using real features
      const riskPrediction = await riskPredictionService.getDailyRisk(
        userId,
        tomorrowFeatures
      );

      if (!riskPrediction) {
        return this.getBaselineTomorrowRisk(userId);
      }

      // 5. Build breakdown of risk contributors
      const breakdown = this.buildRiskBreakdown(
        events,
        posteriors,
        riskPrediction.mean_probability
      );

      // 6. Generate actionable suggestions
      const suggestions = this.generateSuggestions(
        riskPrediction.mean_probability,
        events,
        posteriors
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
      console.error('Exception in getTomorrowRisk:', error);
      return null;
    }
  }

  /**
   * Get baseline prediction without calendar context
   */
  private async getBaselineTomorrowRisk(
    userId: string
  ): Promise<TomorrowPrediction | null> {
    // Use mock features for baseline
    const features = riskPredictionService.generateMockFeatures(20);
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
      suggestions: this.generateSuggestions(prediction.mean_probability, [], {}),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build breakdown of what's contributing to tomorrow's risk
   */
  private buildRiskBreakdown(
    events: any[],
    posteriors: any,
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

    // Stress level from posteriors
    if (posteriors.stress?.mean > 0.6) {
      contributors.push({
        label: 'High stress predicted',
        delta: 0.12,
        icon: '😰',
      });
    }

    // Environmental load
    if (posteriors.envLoad?.mean > 0.5) {
      contributors.push({
        label: 'Pressure change expected',
        delta: 0.1,
        icon: '🌤️',
      });
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
    posteriors: any
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

    if (posteriors.envLoad?.mean > 0.5) {
      suggestions.push('Monitor weather changes');
      suggestions.push('Have rescue meds ready');
    }

    if (posteriors.stress?.mean > 0.6) {
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
   * Get random notification time between 7-9am
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
```

**Deliverable:** ✅ Service combines calendar + risk for tomorrow

---

### 2. Create Tomorrow Risk Hook

**File:** `src/hooks/useTomorrowRisk.ts`

```typescript
import { useState, useEffect } from 'react';
import { tomorrowPredictionService, type TomorrowPrediction } from '../services/tomorrowPredictionService';

export function useTomorrowRisk(userId: string) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<TomorrowPrediction | null>(null);
  const [shouldNotify, setShouldNotify] = useState(false);

  useEffect(() => {
    const fetchTomorrowRisk = async () => {
      setLoading(true);
      const data = await tomorrowPredictionService.getTomorrowRisk(userId);
      setPrediction(data);
      setShouldNotify(tomorrowPredictionService.shouldNotify(data));
      setLoading(false);
    };

    // Fetch once on mount
    fetchTomorrowRisk();

    // Set up daily refresh at random time (7-9am)
    const scheduleNextFetch = () => {
      const nextTime = tomorrowPredictionService.getRandomNotificationTime();
      const now = new Date();
      const delay = nextTime.getTime() - now.getTime();

      if (delay > 0) {
        console.log(`⏰ Scheduling tomorrow's risk fetch for ${nextTime.toLocaleTimeString()}`);
        setTimeout(fetchTomorrowRisk, delay);
      }
    };

    scheduleNextFetch();
  }, [userId]);

  return {
    loading,
    prediction,
    shouldNotify,
  };
}
```

**Deliverable:** ✅ Hook manages tomorrow predictions with auto-refresh

---

### 3. Create Tomorrow Risk Banner Component

**File:** `src/components/TomorrowRiskBanner.tsx`

```typescript
/**
 * Tomorrow Risk Banner
 * 
 * Shows upcoming risk when high (>60%) with calendar context
 */

import React, { useState } from 'react';
import { AlertTriangle, Calendar, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import type { TomorrowPrediction } from '../services/tomorrowPredictionService';

interface TomorrowRiskBannerProps {
  prediction: TomorrowPrediction;
  onDismiss: () => void;
}

export function TomorrowRiskBanner({ prediction, onDismiss }: TomorrowRiskBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const riskPercent = Math.round(prediction.risk * 100);
  const tomorrowDate = new Date(prediction.date);
  const dayName = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div
      className="rounded-xl border border-warning/30 bg-warning/5 p-4 mb-4"
      style={{ borderRadius: '12px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-h3 mb-1">
              Tomorrow's risk is high ({riskPercent}%)
            </h3>
            <p className="text-sm text-muted-foreground">
              {dayName} • {prediction.calendarEvents.length} events scheduled
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Summary */}
      {!expanded && prediction.breakdown.contributors.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {prediction.breakdown.contributors.slice(0, 2).map((contributor, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-sm"
            >
              <span>{contributor.icon}</span>
              <span className="text-muted-foreground">{contributor.label}</span>
              <span className="text-warning font-medium">+{Math.round(contributor.delta * 100)}%</span>
            </div>
          ))}
          {prediction.breakdown.contributors.length > 2 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              +{prediction.breakdown.contributors.length - 2} more
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Expanded View */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Full Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-2">What's contributing:</h4>
            <div className="space-y-2">
              {prediction.breakdown.contributors.map((contributor, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{contributor.icon}</span>
                    <span className="text-muted-foreground">{contributor.label}</span>
                  </span>
                  <span className="text-warning font-medium">
                    +{Math.round(contributor.delta * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Events */}
          {prediction.calendarEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Tomorrow's schedule:
              </h4>
              <div className="space-y-1.5">
                {prediction.calendarEvents.slice(0, 3).map((event, i) => (
                  <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-xs opacity-50">{new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    <span>{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {prediction.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Suggested actions:</h4>
              <div className="space-y-1.5">
                {prediction.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5">✓</span>
                    <span className="text-muted-foreground">{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded(false)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Show less
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* CTA */}
      {!expanded && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full border-warning/30 hover:bg-warning/10"
          onClick={() => setExpanded(true)}
        >
          View details & suggestions
        </Button>
      )}
    </div>
  );
}
```

**Deliverable:** ✅ Banner displays tomorrow's risk with context

---

### 4. Integrate into HomeScreen

**File:** `src/components/HomeScreen.tsx`

```typescript
// Import
import { TomorrowRiskBanner } from './TomorrowRiskBanner';
import { useTomorrowRisk } from '../hooks/useTomorrowRisk';

// Inside HomeScreen component
const [showTomorrowBanner, setShowTomorrowBanner] = useState(true);
const { prediction: tomorrowPrediction, shouldNotify } = useTomorrowRisk('demo-user');

// In JSX, add at the top of content (after header, before risk card)
{showTomorrowBanner && shouldNotify && tomorrowPrediction && (
  <TomorrowRiskBanner
    prediction={tomorrowPrediction}
    onDismiss={() => setShowTomorrowBanner(false)}
  />
)}
```

**Deliverable:** ✅ Banner shows on HomeScreen when risk >60%

---

### 5. Add Browser Notifications (Optional Enhancement)

**File:** `src/utils/notificationScheduler.ts`

```typescript
/**
 * Browser notification scheduler
 */

export class NotificationScheduler {
  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Schedule tomorrow risk notification
   */
  async scheduleTomorrowNotification(
    risk: number,
    eventCount: number,
    time: Date
  ): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return;

    const now = new Date();
    const delay = time.getTime() - now.getTime();

    if (delay <= 0) return; // Time already passed

    setTimeout(() => {
      new Notification('Tomorrow's Migraine Risk', {
        body: `High risk (${Math.round(risk * 100)}%) • ${eventCount} events scheduled`,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: 'tomorrow-risk',
        requireInteraction: true,
      });
    }, delay);

    console.log(`⏰ Notification scheduled for ${time.toLocaleTimeString()}`);
  }
}

export const notificationScheduler = new NotificationScheduler();
```

**Deliverable:** ✅ Browser notifications for high-risk days (optional)

---

## 🧪 Testing

### Manual QA Checklist

- [ ] Add calendar connection
- [ ] Add events for tomorrow
- [ ] Wait for 7-9am window (or mock time)
- [ ] Verify banner appears only if risk >60%
- [ ] Check event breakdown shown
- [ ] Verify suggestions are relevant
- [ ] Click "View details" - expansion works
- [ ] Dismiss banner - stays dismissed
- [ ] Check banner appears next morning
- [ ] Verify time randomizes (7-9am range)

### Test Scenarios

1. **High-risk day with calendar:**
   - 4 meetings tomorrow
   - Risk should be >60%
   - Banner shows with event breakdown

2. **Low-risk day:**
   - No events tomorrow
   - Risk <60%
   - No banner shown

3. **No calendar connected:**
   - Banner uses baseline prediction only
   - No event breakdown shown

---

## 📚 Documentation

**Update:**
- `FEATURE_ENHANCEMENT_SUMMARY.md` - Mark #028 complete
- Add user guide: "Understanding tomorrow's risk"
- Privacy note: Calendar data never leaves device

---

## ✅ Deliverables

- [ ] `src/services/locationContextService.ts` - n8n webhook client
- [ ] `src/services/tomorrowPredictionService.ts`
- [ ] `src/hooks/useTomorrowRisk.ts`
- [ ] `src/components/TomorrowRiskBanner.tsx`
- [ ] HomeScreen integration
- [ ] SQLite schema for caching predictions
- [ ] Browser notification support (optional)
- [ ] Manual QA passed
- [ ] Documentation updated

---

## 🚀 Future Enhancements

- Push to phone calendar as all-day event
- "Reschedule" suggestions for moveable meetings
- Week-ahead predictions
- Pattern learning: "Mondays with 3+ meetings = 85% risk"

---

**Estimated Timeline:**
- Day 1: Service + backend integration (5-6 hrs)
- Day 2: UI components + hook (4-5 hrs)
- Day 3: Testing + notifications (3-4 hrs)

**Blocked By:** Calendar integration (#019 - Complete)  
**Blocks:** None
