import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Moon,
  Activity,
  Smartphone,
  Calendar,
  AlertCircle,
  Flame,
  HelpCircle,
  X,
} from 'lucide-react';
import { RiskHeroCard } from './RiskHeroCard';
import { Button } from './ui/button';
import { ReportMigraineModal } from './ReportMigraineMigral';
import { NotificationCard } from './NotificationCard';
import { SmartMeasurementCard } from './SmartMeasurementCard';
import { TomorrowRiskBanner } from './TomorrowRiskBanner';
import { RiskVariable } from '../types';
import { useFollowUpReminders } from '../hooks/useFollowUpReminders';
import { usePolicyRecommendations } from '../hooks/usePolicyRecommendations';
import { useTomorrowRisk } from '../hooks/useTomorrowRisk';
import { InlineChecklist, type InlineChecklistState } from './InlineChecklist';
import type { ChecklistContextPayload, ChecklistLLMResponse } from '../types/checklist';
import { buildChecklistContextPayload } from '../utils/checklistPayloadBuilder';
import { checklistService } from '../services/checklistService';

interface RiskContributor {
  label: string;
  percentage: number;
  icon: React.ElementType;
}

interface HomeScreenProps {
  userName: string;
  riskLevel: 'low' | 'moderate' | 'high';
  riskPercentage: number;
  confidence?: number; // Confidence in the prediction (0-100)
  contextualAction: {
    icon: React.ElementType;
    label: string;
  };
  streakCount: number;
  todayData: {
    sleepDuration: string;
    hrvTrend: 'up' | 'down';
    hrvChange: string;
    screenTime: string;
    upcomingStressor?: string;
  };
  riskContributors?: RiskContributor[];
  riskVariables?: RiskVariable[];
  whatHelps?: string[];
  onQuickCheckClick?: () => void;
  onInsightsClick?: () => void;
  onSootheModeClick?: (riskVariables: RiskVariable[], riskPercentage: number) => void;
  showNotification?: 'alert' | 'nudge' | null;
  lowStimulationMode?: boolean;
}

export function HomeScreen({
  userName,
  riskLevel,
  riskPercentage,
  confidence = 85,
  contextualAction,
  streakCount,
  todayData,
  riskContributors = [],
  riskVariables = [],
  whatHelps = [],
  onQuickCheckClick,
  onInsightsClick,
  onSootheModeClick,
  showNotification = null,
  lowStimulationMode = false,
}: HomeScreenProps) {
  const [showDisclaimer, setShowDisclaimer] = React.useState(true);
  const [notificationDismissed, setNotificationDismissed] = React.useState(false);
  const [showTomorrowBanner, setShowTomorrowBanner] = React.useState(true);
  const { pendingFollowUps } = useFollowUpReminders();
  const { prediction: tomorrowPrediction, shouldNotify } = useTomorrowRisk('demo-user');
  const [dismissedFollowUpIds, setDismissedFollowUpIds] = React.useState<Set<string>>(new Set());
  const firstPending = pendingFollowUps.find(f => !dismissedFollowUpIds.has(f.id));
  
  // Policy recommendations for smart measurement nudges (only after checklist request)
  const [showSmartMeasurement, setShowSmartMeasurement] = React.useState(false);
  const { recommendations, loading: policyLoading } = usePolicyRecommendations({
    userId: 'demo-user',
    enabled: showSmartMeasurement,
  });

  const [showPreventionFeedback, setShowPreventionFeedback] = React.useState(true);
  const [checklistState, setChecklistState] = React.useState<InlineChecklistState>('idle');
  const [checklistError, setChecklistError] = React.useState<string | null>(null);
  const [checklistPayload, setChecklistPayload] = React.useState<ChecklistContextPayload | null>(null);
  const [checklistResponse, setChecklistResponse] = React.useState<ChecklistLLMResponse | null>(null);
  const checklistAbortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      checklistAbortRef.current?.abort();
    };
  }, []);

  const handleChecklistClick = React.useCallback(async () => {
    setShowSmartMeasurement(true);
    checklistAbortRef.current?.abort();
    const controller = new AbortController();
    checklistAbortRef.current = controller;

    setChecklistError(null);
    setChecklistState('loading');
    setChecklistPayload(null);
    setChecklistResponse(null);

    try {
      const builtPayload = await buildChecklistContextPayload({
        userId: 'demo-user',
        riskVariables,
        riskPercentage,
      });
      if (controller.signal.aborted) return;
      setChecklistPayload(builtPayload);

      const checklist = await checklistService.generateChecklist(builtPayload, controller.signal);
      if (controller.signal.aborted) return;
      setChecklistResponse(checklist);
      setChecklistState('ready');
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('[HomeScreen] Failed to generate checklist', err);
      setChecklistError(err instanceof Error ? err.message : 'Unable to generate checklist right now.');
      setChecklistState('error');
    }
  }, [riskVariables, riskPercentage]);

  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRiskLabel = () => {
    if (riskLevel === 'high') return 'High';
    if (riskLevel === 'moderate') return 'Moderate';
    return 'Low';
  };

  const getRiskColor = () => {
    if (riskLevel === 'high') return 'text-critical';
    if (riskLevel === 'moderate') return 'text-warning';
    return 'text-success';
  };

  const getModuleBgColor = () => {
    if (riskLevel === 'high') return 'bg-critical/5 border-critical/20';
    if (riskLevel === 'moderate') return 'bg-warning/5 border-warning/20';
    return 'bg-success/5 border-success/20';
  };

  const ContextualIcon = contextualAction.icon;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 px-6 pt-8 pb-24 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          {/* Greeting */}
          <div>
            <h1 className="text-h1">
              {getGreeting()}, {userName}
            </h1>
          </div>

          {/* Notification (if present) */}
          {showNotification && !notificationDismissed && (
            <NotificationCard
              variant={showNotification}
              message={
                showNotification === 'alert'
                  ? 'Your migraine risk is rising for 2–4pm'
                  : "You've been on-screen for 2h, take 5?"
              }
              primaryAction={
                showNotification === 'alert'
                  ? {
                      label: 'Take a 5-min break',
                      onClick: () => onSootheModeClick && onSootheModeClick(riskVariables, riskPercentage),
                    }
                  : {
                      label: 'Start break',
                      onClick: () => onSootheModeClick && onSootheModeClick(riskVariables, riskPercentage),
                    }
              }
              secondaryAction={
                showNotification === 'alert'
                  ? {
                      label: 'Remind me in 30m',
                      onClick: () => console.log('Setting reminder'),
                    }
                  : undefined
              }
              onDismiss={() => setNotificationDismissed(true)}
            />
          )}

          {/* Tomorrow Risk Banner */}
          {showTomorrowBanner && shouldNotify && tomorrowPrediction && (
            <TomorrowRiskBanner
              prediction={tomorrowPrediction}
              onDismiss={() => setShowTomorrowBanner(false)}
            />
          )}

          {/* Risk Module - Enhanced Gradient Hero Card */}
          <RiskHeroCard
            percentage={riskPercentage}
            riskLevel={riskLevel}
            confidence={85}
            riskVariables={riskVariables}
            whatHelps={whatHelps}
            lowStimulationMode={lowStimulationMode}
          />

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Report Migraine */}
            <ReportMigraineModal
              trigger={
                <Button
                  variant="outline"
                  className="h-12 border-critical text-critical hover:bg-critical/10"
                  style={{ borderRadius: '12px' }}
                >
                  <AlertCircle className="w-4 h-4" />
                  Report migraine
                </Button>
              }
            />

            {/* Quick check */}
            <Button
              onClick={onQuickCheckClick}
              variant="outline"
              className="h-12 gap-2 relative"
              style={{ borderRadius: '12px' }}
            >
              <HelpCircle className="w-5 h-5" />
              Quick check
              {streakCount > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background text-foreground text-label border border-border">
                  <Flame className="w-3 h-3" />
                  {streakCount}
                </span>
              )}
            </Button>
          </div>

          {/* AI Checklist Section */}
          <div className="space-y-3">
            <Button
              onClick={handleChecklistClick}
              className="w-full h-12 gap-2"
              style={{ borderRadius: '12px' }}
              disabled={checklistState === 'loading'}
            >
              {checklistState === 'loading' ? (
                'Generating personalized steps…'
              ) : (
                <>
                  <ContextualIcon className="w-4 h-4" />
                  {checklistState === 'ready' ? 'Regenerate AI checklist' : 'Generate AI checklist'}
                </>
              )}
            </Button>

            <InlineChecklist
              state={checklistState}
              response={checklistResponse}
              payload={checklistPayload}
              error={checklistError}
              onRetry={handleChecklistClick}
            />
          </div>

          {/* Today at a Glance */}
          <div
            className="p-5 rounded-xl bg-card border border-border space-y-4"
            style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
          >
            <h2 className="text-h2">Today at a glance</h2>
            
            <div className="space-y-3">
              {/* Sleep Duration */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10"
                    style={{ borderRadius: '8px' }}
                  >
                    <Moon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-label text-muted-foreground">Sleep</p>
                    <p className="text-body">{todayData.sleepDuration}</p>
                  </div>
                </div>
              </div>

              {/* HRV Trend */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"
                    style={{ borderRadius: '8px' }}
                  >
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-label text-muted-foreground">HRV</p>
                    <div className="flex items-center gap-1.5">
                      {todayData.hrvTrend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-critical" />
                      )}
                      <p className="text-body">{todayData.hrvChange} vs baseline</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Screen Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10"
                    style={{ borderRadius: '8px' }}
                  >
                    <Smartphone className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-label text-muted-foreground">Screen time</p>
                    <p className="text-body">{todayData.screenTime}</p>
                  </div>
                </div>
              </div>

              {/* Upcoming Stressor */}
              {todayData.upcomingStressor && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10"
                      style={{ borderRadius: '8px' }}
                    >
                      <Calendar className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-label text-muted-foreground">Upcoming</p>
                      <p className="text-body">{todayData.upcomingStressor}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Smart Measurement Nudges - Ticket 027 */}
          {showSmartMeasurement && recommendations && !policyLoading && (
            <SmartMeasurementCard
              selectedHours={recommendations.selected_hours}
              onSetReminder={(hour) => {
                // Set browser notification for this hour
                const message = `Time for your check-in! This is a high-value measurement hour.`;
                console.log(`Reminder set for ${hour}:00 - ${message}`);
                // TODO: Implement actual notification scheduling
                alert(`Reminder set for ${hour}:00. You'll be notified when it's time to check in.`);
              }}
            />
          )}

          {/* Prevention Plan Feedback */}
          {showPreventionFeedback && (
            <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
              <div className="flex items-start justify-between">
                <h2 className="text-h2">How did your prevention plan work?</h2>
                <button
                  className="p-2 rounded-md hover:bg-secondary/60 transition-colors"
                  aria-label="Dismiss"
                  onClick={() => setShowPreventionFeedback(false)}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-label text-muted-foreground">
                Triggers: Weather pressure drop + Poor sleep + Prodrome symptoms present
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" className="h-11" onClick={() => setShowPreventionFeedback(false)}>
                  Prevented
                </Button>
                <Button variant="secondary" className="h-11" onClick={() => setShowPreventionFeedback(false)}>
                  Reduced
                </Button>
                <Button variant="secondary" className="h-11" onClick={() => setShowPreventionFeedback(false)}>
                  No effect
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
