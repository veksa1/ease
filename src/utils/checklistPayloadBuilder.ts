import { calendarService } from '../services/calendarService';
import type { CalendarEvent } from '../services/calendarService';
import { demoDataService } from '../services/demoDataService';
import { migraineService } from '../services/migraineService';
import { sqliteService } from '../services/sqliteService';
import type { RiskVariable } from '../types';
import type { ChecklistCalendarEvent, ChecklistContextPayload } from '../types/checklist';

interface BuildChecklistOptions {
  userId: string;
  riskVariables?: RiskVariable[];
  riskPercentage?: number;
}

const DEFAULT_PROFILE = {
  migraineHistoryYears: 8,
  age: 32,
};

export async function buildChecklistContextPayload(
  options: BuildChecklistOptions
): Promise<ChecklistContextPayload> {
  const { userId } = options;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const [
    profile,
    triggers,
    migraineReportsRaw,
    quickCheckEntries,
    topEffective,
    sootheSessions,
    experimentsRaw,
    streakValue,
  ] = await Promise.all([
    sqliteService.getPersonalMigraineProfile(),
    sqliteService.getTriggerHypotheses(),
    migraineService.getAllReports(),
    sqliteService.getRecentTimelineEntriesByType('quick_check', 6),
    sqliteService.getInterventionEffectiveness(),
    sqliteService.getRecentSootheModeSessions(3),
    sqliteService.getAllExperimentEntries(),
    sqliteService.getSetting('streak_count'),
  ]);

  const calendarEventsRaw = await calendarService.getCalendarEvents(userId, now);

  const decoratedEvents = decorateCalendarEvents(calendarEventsRaw);
  const experiments = summarizeExperiments(experimentsRaw);

  const prediction =
    demoDataService.getPredictionByDate(today) ??
    demoDataService.getAllPredictions().at(-1) ??
    null;

  const biometrics = deriveBiometrics({
    prediction,
    streakValue,
    quickCheckEntries,
  });

  const quickChecks = quickCheckEntries.length
    ? quickCheckEntries.map(entry => ({
        timestamp: entry.timestamp,
        caffeineLevel: entry.data?.caffeine?.level ?? 'unknown',
        waterAmount: entry.data?.water?.amount ?? 'unknown',
        foodScore: entry.data?.food?.level ?? 0,
        notes: entry.data?.food?.note,
      }))
    : [
        {
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          caffeineLevel: 'some',
          waterAmount: 'medium',
          foodScore: 6,
        },
      ];

  const migraineReports = migraineReportsRaw.slice(0, 5).map(report => ({
    onsetAt: report.onsetAt,
    durationHours: report.durationHours,
    severity: report.severity,
    aura: { present: Boolean(report.auraPresent), types: report.auraTypes },
    triggers: report.triggers,
    medications: {
      name: report.medicationTaken || 'unknown',
      timing: report.medicationTiming,
      reliefLevel: report.reliefLevel,
    },
    impact: {
      missedWork: report.impactMissedWork,
      restRequired: report.impactHadToRest,
      score: report.impactScore,
    },
  }));

  const suspectedTriggers = triggers.map(trigger => ({
    key: trigger.key,
    label: trigger.label,
    confidence: trigger.confidence,
    freqPerMonth: trigger.freqPerMonth,
    threshold: trigger.threshold,
    onsetWindowHours: trigger.onsetWindowHours,
    helps: trigger.helps,
    notes: trigger.notes,
    lastUpdated: trigger.updatedAt,
  }));

  const alineRisk = buildAlineRisk(options, decoratedEvents);

  return {
    generatedAt: now.toISOString(),
    userId,
    personalProfile: profile ?? DEFAULT_PROFILE,
    migraineReports,
    suspectedTriggers,
    biometrics,
    environment: {
      weather: deriveWeatherSnapshot(prediction),
      calendar: summarizeCalendar(decoratedEvents),
      location: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        daylightExposureScore: 0.62,
      },
    },
    interventions: {
      topEffective: (topEffective || []).slice(0, 3).map(item => ({
        instructionId: item.instructionId,
        triggerCombinationId: item.triggerCombinationId,
        successRate: Number(item.averageEffectiveness ?? 0),
        lastUsed: item.lastUsed,
      })),
      recentSootheSessions: sootheSessions.map(session => ({
        id: session.id,
        startedAt: session.startedAt,
        durationMinutes: session.durationMinutes,
        outcome: session.outcome || undefined,
      })),
      experiments,
    },
    quickChecks,
    alineRisk,
  };
}

function decorateCalendarEvents(events: CalendarEvent[]): ChecklistCalendarEvent[] {
  return events.map(event => ({
    ...event,
    stressLabel: classifyEventStress(event),
    focusImpact: estimateFocusImpact(event),
    travelRelated: Boolean(event.location && /flight|airport|travel/i.test(event.location)),
  }));
}

function classifyEventStress(event: ChecklistCalendarEvent): 'low' | 'medium' | 'high' {
  const title = event.title?.toLowerCase() || '';
  if (/review|board|finance|deadline|presentation/.test(title)) {
    return 'high';
  }
  if (/sync|1:1|therapy|focus|deep work/.test(title)) {
    return 'medium';
  }
  return 'low';
}

function estimateFocusImpact(event: ChecklistCalendarEvent): number {
  const durationMinutes = Math.max(0, (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000);
  const normalizedDuration = Math.min(1, durationMinutes / 120);
  const stressBoost = event.stressLabel === 'high' ? 0.25 : event.stressLabel === 'medium' ? 0.1 : 0;
  return Number((normalizedDuration + stressBoost).toFixed(2));
}

function summarizeCalendar(events: ChecklistCalendarEvent[]) {
  const afterHours = events.filter(evt => isAfterHours(evt.start, evt.end)).length;
  const focusBlocks = events.filter(evt => /focus|deep work|therapy/i.test(evt.title || '')).length;
  return {
    nextHighStressEvent: events.find(evt => evt.stressLabel === 'high')?.title,
    travelUpcoming: events.some(evt => evt.travelRelated),
    workloadIndex: Math.min(100, Math.round(events.reduce((acc, evt) => acc + (evt.focusImpact ?? 0.2) * 20, 0))),
    events,
    summary: {
      totalEvents: events.length,
      afterHoursEvents: afterHours,
      focusBlocks,
    },
  };
}

function isAfterHours(startIso: string, endIso: string): boolean {
  const startHour = new Date(startIso).getHours();
  const endHour = new Date(endIso).getHours();
  return startHour < 8 || endHour > 18;
}

function deriveWeatherSnapshot(prediction: any) {
  const base = {
    pressureTrend: 'steady',
    humidityTrend: 'moderate',
    temperatureTrend: 'cooling',
    lastReading: new Date().toISOString(),
  };

  if (!prediction) return base;

  const env = prediction.latents?.environmental ?? 0.4;
  return {
    pressureTrend: env > 0.6 ? 'dropping fast' : env > 0.4 ? 'soft drop' : 'stable',
    humidityTrend: env > 0.5 ? 'rising humidity' : 'stable',
    temperatureTrend: env > 0.7 ? 'heat spike' : 'cooling',
    lastReading: new Date().toISOString(),
  };
}

function deriveBiometrics({
  prediction,
  streakValue,
  quickCheckEntries,
}: {
  prediction: any;
  streakValue: string | null;
  quickCheckEntries: any[];
}) {
  const streakCount = streakValue ? parseInt(streakValue, 10) : 0;
  const latents = prediction?.latents ?? { sleep_debt: 0.3, stress: 0.5, environmental: 0.4 };

  const sleepHours = Number((7.2 - latents.sleep_debt * 2).toFixed(1));
  const sleepDebt = Number((latents.sleep_debt * 4).toFixed(1));

  const hrvBaseline = 65;
  const hrvCurrent = Math.round(hrvBaseline - latents.stress * 10);
  const restingBaseline = 62;
  const restingCurrent = Math.round(restingBaseline + latents.stress * 5);

  const hydrationIndex = quickCheckEntries.length
    ? quickCheckEntries.reduce((acc, entry) => {
        const amount = entry.data?.water?.amount;
        if (amount === 'high') return acc + 1;
        if (amount === 'medium') return acc + 0.7;
        if (amount === 'low') return acc + 0.3;
        return acc + 0.1;
      }, 0) / quickCheckEntries.length
    : 0.6;

  const caffeineLoadMg = quickCheckEntries.length
    ? quickCheckEntries.reduce((acc, entry) => {
        const level = entry.data?.caffeine?.level;
        if (level === 'lot') return acc + 220;
        if (level === 'some') return acc + 120;
        if (level === 'none') return acc + 20;
        return acc + 80;
      }, 0) / quickCheckEntries.length
    : 110;

  return {
    streakCount,
    sleepHoursAvg: sleepHours,
    sleepDebtHours: sleepDebt,
    hrvTrend: {
      baseline: hrvBaseline,
      current: hrvCurrent,
      delta: hrvCurrent - hrvBaseline,
    },
    restingHrTrend: {
      baseline: restingBaseline,
      current: restingCurrent,
      delta: restingCurrent - restingBaseline,
    },
    activityLoad: {
      last7Days: Math.round(9000 - latents.environmental * 1500),
      baseline: 10000,
    },
    hydrationIndex: Number(hydrationIndex.toFixed(2)),
    caffeineLoadMg: Math.round(caffeineLoadMg),
  };
}

function summarizeExperiments(rows: Array<{ experimentName: string; dayIndex: number; completed: boolean; timestamp: string }>) {
  if (!rows.length) {
    return [
      {
        name: 'Hydration micro-habit',
        completion: 0.42,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test run to see if hourly sips reduce afternoon pressure',
      },
    ];
  }

  const stats = new Map<string, { completed: number; total: number; startedAt: string }>();
  rows.forEach(row => {
    const current = stats.get(row.experimentName) ?? { completed: 0, total: 0, startedAt: row.timestamp };
    current.total += 1;
    if (row.completed) current.completed += 1;
    current.startedAt = row.timestamp;
    stats.set(row.experimentName, current);
  });

  return Array.from(stats.entries()).map(([name, value]) => ({
    name,
    completion: value.total ? value.completed / value.total : 0,
    startedAt: value.startedAt,
    notes: value.completed === value.total ? 'Completed iteration' : 'In progress',
  }));
}

function buildAlineRisk(options: BuildChecklistOptions, events: ChecklistCalendarEvent[]) {
  const currentRisk = options.riskPercentage ?? Math.round(demoDataService.getCurrentRisk().risk * 100);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowPrediction = demoDataService.getPredictionByDate(tomorrow.toISOString().split('T')[0]);
  const tomorrowRisk = tomorrowPrediction ? Math.round(tomorrowPrediction.daily_risk.mean * 100) : undefined;

  const riskVariables = options.riskVariables ?? [];
  const topDrivers = riskVariables.slice(0, 3).map(variable => ({
    label: variable.name,
    contribution: Math.round(variable.percentage),
  }));

  const calendarNotes = events
    .filter(evt => evt.stressLabel === 'high')
    .map(evt => `Prepare recovery buffer after ${evt.title}`);

  return {
    currentRiskPercent: currentRisk,
    tomorrowRiskPercent: tomorrowRisk,
    topDrivers: topDrivers.length
      ? topDrivers
      : [
          { label: 'Sleep debt', contribution: 32 },
          { label: 'Pressure drop', contribution: 24 },
          { label: 'Screen load', contribution: 18 },
        ],
    infoGainSuggestions: [
      'Capture a hydration check around 2pm',
      'Log prodrome sensations within 15 minutes when they appear',
      'Tag calendar events that feel draining to improve trigger modeling',
      ...calendarNotes,
    ].slice(0, 4),
  };
}
