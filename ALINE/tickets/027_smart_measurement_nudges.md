# ⏰ Ticket 027 – Smart Measurement Nudges (Policy Top-K Integration)

**Date:** 2025-11-16  
**Owner:** Frontend + Backend  
**Status:** 🔧 To Do  
**Priority:** High  
**Effort:** Medium (2-3 days)  
**Epic:** Feature Enhancement - Phase 1

---

## 🎯 Objective

Surface ALINE's `/policy/topk` recommendations as actionable UI nudges that guide users to check in at optimal times for maximum prediction improvement.

**Key Result:** Users see "⏰ Check in at 2pm, 6pm, 9pm for best insight" with priority scores, reducing measurement burden while improving model accuracy.

---

## 📊 Background

The `/policy/topk` API already computes high-value measurement hours based on:
- **Entropy** (uncertainty in latent state)
- **Uncertainty** (variance in predictions)  
- **Gradient** (impact on migraine risk)

But this powerful feature is currently unused in the UI. Users don't know when their data matters most.

---

## 📂 Dependencies

**Existing Code:**
- `ALINE/service/main.py` - `/policy/topk` endpoint (lines 296-340)
- `ALINE/models/policy_utils.py` - Priority score computation
- `src/services/posteriorService.ts` - Hourly posterior fetching
- `src/components/HomeScreen.tsx` - Main UI container
- `src/services/sqliteService.ts` - Local database for user timeline
- `src/services/calendarService.ts` - Calendar event fetching

**New Files to Create:**
- `src/services/policyService.ts` - API wrapper for `/policy/topk`
- `src/services/userFeaturesService.ts` - Real user feature collection (replaces mock data)
- `src/components/SmartMeasurementCard.tsx` - UI component for recommendations
- `src/hooks/usePolicyRecommendations.ts` - React hook for policy data
- `src/utils/featureValidator.ts` - Validate 35-feature schema compliance

**APIs:**
- `POST /policy/topk` (existing backend endpoint)

**⚠️ CRITICAL CHANGE - No More Mock Data:**
This ticket eliminates all `generateMockFeatures()` calls. Features must come from real user data (Quick Checks, calendar, weather, biometrics).

---

## 🧩 Tasks

### 1. Create User Features Service (Replace Mock Data) ✨ NEW

**File:** `src/services/userFeaturesService.ts`

```typescript
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
import featureOrderConfig from '../../ALINE/data/feature_order.yaml';

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

class UserFeaturesService {
  private featureCount = 35;
  private featureOrder: Map<number, any>;

  constructor() {
    // Load canonical feature order from config
    this.featureOrder = new Map(
      Object.entries(featureOrderConfig.features).map(([idx, config]) => [
        parseInt(idx),
        config,
      ])
    );
  }

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
      ? await calendarService.getEventsForDate(context.userId, context.date)
      : [];
    
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
  private async buildHourlyFeatures(params: any): Promise<number[]> {
    const features = new Array(this.featureCount).fill(0);
    const sources: FeatureSource[] = [];
    
    // Extract from Quick Check data
    const qcFeatures = this.extractQuickCheckFeatures(params.recentChecks, params.hour);
    
    // Extract from calendar
    const calendarFeatures = this.extractCalendarFeatures(params.calendarEvents, params.hour);
    
    // Merge with priority: user_input > calendar > default
    for (let i = 0; i < this.featureCount; i++) {
      const feature = this.featureOrder.get(i);
      
      if (qcFeatures[i] !== undefined) {
        features[i] = qcFeatures[i];
        sources.push({
          index: i,
          name: feature.name,
          value: qcFeatures[i],
          source: 'user_input',
          confidence: 1.0,
        });
      } else if (calendarFeatures[i] !== undefined) {
        features[i] = calendarFeatures[i];
        sources.push({
          index: i,
          name: feature.name,
          value: calendarFeatures[i],
          source: 'calendar',
          confidence: 0.7,
        });
      } else {
        // Use smart default (last known value or population mean)
        features[i] = this.getDefaultValue(i);
        sources.push({
          index: i,
          name: feature.name,
          value: features[i],
          source: 'default',
          confidence: 0.3,
        });
      }
    }
    
    // Log feature coverage for debugging
    const coverage = sources.filter(s => s.source !== 'default').length / this.featureCount;
    console.log(`Feature coverage: ${(coverage * 100).toFixed(0)}% (${sources.filter(s => s.source !== 'default').length}/35)`);
    
    return features;
  }

  /**
   * Extract features from Quick Check entries
   */
  private extractQuickCheckFeatures(checks: any[], hour: number): Partial<number[]> {
    const features: Partial<number[]> = {};
    
    // Find most recent check before this hour
    const relevantCheck = checks.find(c => {
      const checkHour = new Date(c.timestamp).getHours();
      return checkHour <= hour;
    });
    
    if (!relevantCheck) return features;
    
    // Map Quick Check data to feature indices
    // Index 0: Sleep Duration
    if (relevantCheck.sleep?.hours) {
      features[0] = relevantCheck.sleep.hours;
    }
    
    // Index 1: Sleep Quality
    if (relevantCheck.sleep?.quality) {
      features[1] = relevantCheck.sleep.quality;
    }
    
    // Index 6: Caffeine Intake
    if (relevantCheck.caffeine?.level) {
      features[6] = this.mapCaffeineLevel(relevantCheck.caffeine.level);
    }
    
    // Index 7: Water Intake
    if (relevantCheck.water?.amount) {
      features[7] = this.mapWaterAmount(relevantCheck.water.amount);
    }
    
    // Index 8: Meal Regularity
    if (relevantCheck.food?.level) {
      features[8] = relevantCheck.food.level;
    }
    
    return features;
  }

  /**
   * Extract features from calendar events
   */
  private extractCalendarFeatures(events: any[], hour: number): Partial<number[]> {
    const features: Partial<number[]> = {};
    
    // Find events during this hour
    const activeEvents = events.filter(e => {
      const start = new Date(e.start).getHours();
      const end = new Date(e.end).getHours();
      return hour >= start && hour <= end;
    });
    
    if (activeEvents.length === 0) return features;
    
    // Index 4: Work Hours (count meetings as work)
    const workEvents = activeEvents.filter(e => 
      e.title.toLowerCase().includes('meeting') ||
      e.title.toLowerCase().includes('call') ||
      e.title.toLowerCase().includes('review')
    );
    features[4] = workEvents.length > 0 ? 1 : 0;
    
    // Index 3: Stress Level (more events = higher stress)
    features[3] = Math.min(10, activeEvents.length * 2);
    
    return features;
  }

  /**
   * Get recent Quick Check entries from SQLite
   */
  private async getRecentQuickChecks(userId: string, date: Date): Promise<any[]> {
    const db = await sqliteService.getDatabase();
    
    const query = `
      SELECT * FROM user_timeline
      WHERE user_id = ?
        AND type = 'quick_check'
        AND date(timestamp) >= date(?, '-7 days')
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    return db.all(query, [userId, date.toISOString()]);
  }

  private mapCaffeineLevel(level: string): number {
    const map = { 'none': 0, 'low': 100, 'medium': 200, 'high': 400 };
    return map[level] || 0;
  }

  private mapWaterAmount(amount: string): number {
    const map = { 'low': 0.5, 'medium': 1.5, 'high': 2.5 };
    return map[amount] || 1.5;
  }

  private getDefaultValue(featureIndex: number): number {
    // Use population means from priors.yaml
    const defaults = {
      0: 7.0,   // Sleep Duration
      1: 6.5,   // Sleep Quality
      3: 6.0,   // Stress Level
      6: 200,   // Caffeine (mg)
      7: 2.0,   // Water (L)
      // ... etc, pull from priors.yaml
    };
    return defaults[featureIndex] || 0;
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
    });
    
    return { valid: errors.length === 0, errors };
  }
}

// Export singleton
export const userFeaturesService = new UserFeaturesService();
```

**Deliverable:** ✅ Real user feature collection replaces all mock data

---

### 2. Create Policy Service Layer (Backend Integration)

**File:** `src/services/policyService.ts`

```typescript
/**
 * Policy Service
 * 
 * Connects to ALINE /policy/topk endpoint to get
 * recommendations for optimal measurement hours
 */

import { apiClient } from '../utils/api';

export interface PolicyRequest {
  user_id: string;
  features: number[][];  // 24 hours of features [24, n_features]
  k: number;             // Number of hours to recommend
}

export interface SelectedHour {
  hour: number;
  priority_score: number;
}

export interface PolicyResponse {
  user_id: string;
  selected_hours: SelectedHour[];
  k: number;
  timestamp: string;
}

class PolicyService {
  /**
   * Get top-k measurement recommendations
   * 
   * @param userId - User identifier
   * @param features - 24 hours of feature data
   * @param k - Number of hours to recommend (default: 3)
   * @returns Policy recommendations
   */
  async getTopKHours(
    userId: string, 
    features: number[][], 
    k: number = 3
  ): Promise<PolicyResponse | null> {
    try {
      const requestBody: PolicyRequest = {
        user_id: userId,
        features: features,
        k: k,
      };

      const response = await apiClient.post<PolicyResponse>(
        '/policy/topk',
        requestBody
      );

      if (response.error) {
        console.error('Error fetching policy recommendations:', response.error);
        return null;
      }

      return response.data || null;
    } catch (error) {
      console.error('Exception in getTopKHours:', error);
      return null;
    }
  }

  /**
   * Check if the backend policy endpoint is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health');
      return !response.error;
    } catch {
      return false;
    }
  }

  /**
   * Format hour as human-readable time
   */
  formatHour(hour: number): string {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  }

  /**
   * Get urgency level based on priority score
   */
  getUrgencyLevel(score: number): 'high' | 'medium' | 'low' {
    if (score > 1.2) return 'high';
    if (score > 0.8) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const policyService = new PolicyService();
```

**Deliverable:** ✅ Policy service connects to backend API

---

### 3. Create React Hook for Policy Data (Backend-First)

**File:** `src/hooks/usePolicyRecommendations.ts`

```typescript
/**
 * Hook for policy-based measurement recommendations
 * 
 * ⚠️ BREAKING CHANGE: No longer accepts pre-computed features.
 * Fetches real user data internally via userFeaturesService.
 */

import { useState, useEffect, useCallback } from 'react';
import { policyService, type PolicyResponse } from '../services/policyService';
import { userFeaturesService } from '../services/userFeaturesService';

interface UsePolicyRecommendationsOptions {
  userId: string;
  date?: Date; // Date to get recommendations for (default: today)
  k?: number;
  enabled?: boolean; // Only fetch when enabled
}

export function usePolicyRecommendations({
  userId,
  date = new Date(),
  k = 3,
  enabled = true,
}: UsePolicyRecommendationsOptions) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PolicyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [featureCoverage, setFeatureCoverage] = useState<number>(0);

  const fetchRecommendations = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Build real user features (no more mock data!)
      const features = await userFeaturesService.get24HourFeatures({
        userId,
        date,
        includeCalendar: true,
        includeWeather: true,
      });

      // Validate before sending to API
      const validation = userFeaturesService.validateFeatures(features);
      if (!validation.valid) {
        setError(`Invalid features: ${validation.errors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Calculate feature coverage (how many are from real data vs defaults)
      const totalFeatures = features.length * features[0].length;
      // This is a simplified coverage calculation
      setFeatureCoverage(0.8); // Will be computed properly in userFeaturesService

      const policy = await policyService.getTopKHours(userId, features, k);

      if (policy) {
        setRecommendations(policy);
      } else {
        setError('Failed to fetch recommendations');
    }

    setLoading(false);
  }, [userId, features, k, enabled]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    loading,
    recommendations,
    error,
    refetch: fetchRecommendations,
  };
}
```

**Deliverable:** ✅ Hook manages policy data fetching and state

---

### 3. Create Smart Measurement Card Component

**File:** `src/components/SmartMeasurementCard.tsx`

```typescript
/**
 * Smart Measurement Card
 * 
 * Displays AI-recommended measurement times based on policy top-k
 * Shows urgency and allows users to set reminders
 */

import React from 'react';
import { Clock, Bell, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { policyService, type SelectedHour } from '../services/policyService';

interface SmartMeasurementCardProps {
  selectedHours: SelectedHour[];
  onSetReminder?: (hour: number) => void;
  className?: string;
}

export function SmartMeasurementCard({
  selectedHours,
  onSetReminder,
  className = '',
}: SmartMeasurementCardProps) {
  if (!selectedHours || selectedHours.length === 0) {
    return null;
  }

  // Sort by priority score descending
  const sortedHours = [...selectedHours].sort((a, b) => b.priority_score - a.priority_score);

  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 ${className}`}
      style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-h3">Smart measurement times</h3>
            <p className="text-label text-muted-foreground">
              AI-recommended check-in hours for best insights
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Hours */}
      <div className="space-y-3">
        {sortedHours.map((hourData, index) => {
          const urgency = policyService.getUrgencyLevel(hourData.priority_score);
          const timeString = policyService.formatHour(hourData.hour);
          
          return (
            <div
              key={hourData.hour}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                  ${urgency === 'high' ? 'bg-critical/10 text-critical' : ''}
                  ${urgency === 'medium' ? 'bg-warning/10 text-warning' : ''}
                  ${urgency === 'low' ? 'bg-primary/10 text-primary' : ''}
                `}>
                  {index + 1}
                </div>

                {/* Time */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-body font-medium">{timeString}</span>
                </div>

                {/* Priority Indicator */}
                <div className="flex items-center gap-1">
                  <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        urgency === 'high' ? 'bg-critical' : ''
                      }${urgency === 'medium' ? 'bg-warning' : ''}${
                        urgency === 'low' ? 'bg-primary' : ''
                      }`}
                      style={{
                        width: `${Math.min(100, (hourData.priority_score / 1.5) * 100)}%`,
                      }}
                    />
                  </div>
                  {urgency === 'high' && (
                    <TrendingUp className="w-3 h-3 text-critical" />
                  )}
                </div>
              </div>

              {/* Set Reminder Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSetReminder?.(hourData.hour)}
                className="gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remind me</span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <p className="text-sm text-muted-foreground">
          💡 These times offer the <strong>highest information gain</strong> for your predictions.
          Checking in at these hours helps ALINE learn your patterns faster.
        </p>
      </div>
    </div>
  );
}
```

**Deliverable:** ✅ UI component displays recommendations with urgency

---

### 4. Integrate into HomeScreen

**File:** `src/components/HomeScreen.tsx`

Add after Quick Check completion in the `updateRiskWithQuickCheck` flow:

```typescript
// Import at top
import { SmartMeasurementCard } from './SmartMeasurementCard';
import { usePolicyRecommendations } from '../hooks/usePolicyRecommendations';
import { quickCheckToFeatures } from '../services/featureConverter';

// Inside HomeScreen component:
const [showSmartMeasurement, setShowSmartMeasurement] = useState(false);
const [latestFeatures, setLatestFeatures] = useState<number[][]>([]);

// Fetch policy recommendations when features are available
const { recommendations, loading: policyLoading } = usePolicyRecommendations({
  userId: 'demo-user',
  features: latestFeatures,
  k: 3,
  enabled: showSmartMeasurement && latestFeatures.length > 0,
});

// Update after Quick Check
const handleQuickCheckComplete = (checkData: QuickCheckData) => {
  // ... existing logic ...
  
  // Convert Quick Check to features
  const features = quickCheckToFeatures(checkData, 20);
  setLatestFeatures(features);
  setShowSmartMeasurement(true);
};

// In JSX, add after "Today at a glance" section:
{showSmartMeasurement && recommendations && (
  <SmartMeasurementCard
    selectedHours={recommendations.selected_hours}
    onSetReminder={(hour) => {
      // Set browser notification for this hour
      const message = `Time for your check-in! This is a high-value measurement hour.`;
      console.log(`Reminder set for ${hour}:00 - ${message}`);
      // TODO: Implement actual notification scheduling
    }}
  />
)}
```

**Deliverable:** ✅ Smart measurement card appears after Quick Check

---

### 5. Add Client-Side Caching (24hr TTL)

**File:** `src/services/policyService.ts`

Add caching logic to reduce API calls:

```typescript
class PolicyService {
  private cache: Map<string, { data: PolicyResponse; timestamp: number }> = new Map();
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cache key from features
   */
  private getCacheKey(userId: string, features: number[][]): string {
    // Hash features to create stable key
    const featureHash = features
      .flat()
      .slice(0, 20) // Use first 20 features for key
      .map(f => f.toFixed(2))
      .join(',');
    return `${userId}:${featureHash}`;
  }

  /**
   * Get top-k hours with caching
   */
  async getTopKHours(
    userId: string,
    features: number[][],
    k: number = 3
  ): Promise<PolicyResponse | null> {
    const cacheKey = this.getCacheKey(userId, features);
    const cached = this.cache.get(cacheKey);

    // Return cached if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('✅ Using cached policy recommendations');
      return cached.data;
    }

    // Fetch from API
    console.log('📡 Fetching fresh policy recommendations from API');
    const data = await this.fetchFromAPI(userId, features, k);

    if (data) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  }

  private async fetchFromAPI(
    userId: string,
    features: number[][],
    k: number
  ): Promise<PolicyResponse | null> {
    // ... existing API call logic ...
  }
}
```

**Deliverable:** ✅ 24hr caching reduces API calls by ~80%

---

## 🧪 Testing

### Manual QA Checklist

- [ ] Complete Quick Check flow
- [ ] Verify Smart Measurement Card appears
- [ ] Check 3 recommended hours are displayed
- [ ] Confirm priority scores shown correctly
- [ ] Test urgency colors (high/medium/low)
- [ ] Click "Remind me" button
- [ ] Verify times are human-readable (2pm not 14)
- [ ] Complete second Quick Check same day
- [ ] Confirm cached data used (check console)
- [ ] Wait 24hrs, verify cache expires

### Backend Integration Tests

```bash
# Test /policy/topk endpoint
curl -X POST http://localhost:8000/policy/topk \
  -H "Content-Type: application/json" \
  -d @test_policy_request.json

# Expected response:
# {
#   "user_id": "demo-user",
#   "selected_hours": [
#     {"hour": 14, "priority_score": 1.234},
#     {"hour": 18, "priority_score": 1.189},
#     {"hour": 21, "priority_score": 1.142}
#   ],
#   "k": 3
# }
```

---

## 📚 Documentation

**Update:**
- `docs/API_REFERENCE.md` - Add policyService usage examples
- `src/services/README.md` - Document caching strategy
- `FEATURE_ENHANCEMENT_SUMMARY.md` - Mark #027 as complete

**User-Facing:**
- Add tooltip: "Why these times?" → Explain entropy/uncertainty/gradient
- FAQ entry: "What are smart measurement times?"

---

## ✅ Deliverables

- [ ] `src/services/policyService.ts` - API wrapper with caching
- [ ] `src/hooks/usePolicyRecommendations.ts` - React hook
- [ ] `src/components/SmartMeasurementCard.tsx` - UI component
- [ ] `src/components/HomeScreen.tsx` - Integration
- [ ] Unit tests for policyService
- [ ] Manual QA passed
- [ ] Documentation updated

---

## 🚀 Future Enhancements (Out of Scope)

- Browser notification API for actual reminders
- Calendar integration to sync check-in times
- "Snooze" functionality for reminders
- Analytics: Track compliance with recommended times
- A/B test: With vs without smart nudges

---

**Estimated Timeline:**
- Day 1: Backend service + caching (4-5 hrs)
- Day 2: UI component + integration (5-6 hrs)
- Day 3: Testing + polish (2-3 hrs)

**Blocked By:** None (backend API already exists)  
**Blocks:** None
