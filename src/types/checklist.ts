/**
 * Types for AI-generated prevention checklists.
 */

export interface ChecklistCalendarEvent {
  id: string;
  title: string;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  location?: string;
  description?: string;
  stressLabel?: 'low' | 'medium' | 'high';
  focusImpact?: number; // 0-1 scale
  travelRelated?: boolean;
}

export interface ChecklistContextPayload {
  generatedAt: string;
  userId: string;
  personalProfile: {
    migraineHistoryYears: number;
    age: number;
    weightKg?: number;
    bmi?: number;
  };
  migraineReports: Array<{
    onsetAt: string;
    durationHours?: number;
    severity: number;
    aura: { present: boolean; types?: string[] };
    triggers: string[];
    medications: { name: string; timing?: string; reliefLevel?: string };
    impact: { missedWork?: boolean; restRequired?: boolean; score?: number };
  }>;
  suspectedTriggers: Array<{
    key: string;
    label: string;
    confidence: number;
    freqPerMonth?: number;
    threshold?: string;
    onsetWindowHours?: number;
    helps?: string;
    notes?: string;
    lastUpdated: string;
  }>;
  biometrics: {
    streakCount: number;
    sleepHoursAvg: number;
    sleepDebtHours: number;
    hrvTrend: { baseline: number; current: number; delta: number };
    restingHrTrend: { baseline: number; current: number; delta: number };
    activityLoad: { last7Days: number; baseline: number };
    hydrationIndex?: number;
    caffeineLoadMg?: number;
  };
  environment: {
    weather: {
      pressureTrend: string;
      humidityTrend: string;
      temperatureTrend: string;
      lastReading: string;
    };
    calendar: {
      nextHighStressEvent?: string;
      travelUpcoming?: boolean;
      workloadIndex?: number;
      events: ChecklistCalendarEvent[];
      summary: {
        totalEvents: number;
        afterHoursEvents: number;
        focusBlocks: number;
      };
    };
    location?: { timezone: string; daylightExposureScore?: number };
  };
  interventions: {
    topEffective: Array<{ instructionId: string; triggerCombinationId: string; successRate: number; lastUsed: string }>;
    recentSootheSessions: Array<{ id: string; startedAt: string; durationMinutes: number; outcome?: string }>;
    experiments: Array<{ name: string; completion: number; startedAt: string; notes?: string }>;
  };
  quickChecks: Array<{
    timestamp: string;
    caffeineLevel: string;
    waterAmount: string;
    foodScore: number;
    notes?: string;
  }>;
  alineRisk: {
    currentRiskPercent: number;
    tomorrowRiskPercent?: number;
    topDrivers: Array<{ label: string; contribution: number }>;
    infoGainSuggestions: string[];
  };
}

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: 'immediate' | 'environment' | 'self-care' | 'prevention';
  timing: 'now' | 'next-hour' | 'later-today' | 'tonight';
  effort: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface ChecklistLLMResponse {
  summary: string;
  riskNarrative: string;
  topTriggers: string[];
  checklist: ChecklistStep[];
  explainers: Array<{ title: string; detail: string }>;
  calendarAdvisories: Array<{ eventTitle: string; recommendation: string }>;
  followUp?: { reminderInMinutes: number; note: string };
  infoGainSuggestions: string[];
}

export interface ChecklistApiResponse {
  checklist: ChecklistLLMResponse;
}
