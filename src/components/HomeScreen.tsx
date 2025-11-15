import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Moon,
  Activity,
  Smartphone,
  Calendar,
  Wind,
  Droplets,
  Sun,
  AlertCircle,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { RiskRing } from './RiskRing';
import { RiskHeroCard } from './RiskHeroCard';
import { Button } from './ui/button';
import { TipCard } from './TipCard';
import { PillChip } from './PillChip';
import { ReportMigraineModal } from './ReportMigraineMigral';
import { InsightsTeaserCard } from './InsightsTeaserCard';
import { NotificationCard } from './NotificationCard';
import { RiskVariable } from '../types';
import { useFollowUpReminders } from '../hooks/useFollowUpReminders';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from './ui/carousel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

interface RiskContributor {
  label: string;
  percentage: number;
  icon: React.ElementType;
}

interface HomeScreenProps {
  userName: string;
  riskLevel: 'low' | 'moderate' | 'high';
  riskPercentage: number;
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
  contextualAction,
  streakCount,
  todayData,
  riskContributors = [],
  whatHelps = [],
  onQuickCheckClick,
  onInsightsClick,
  onSootheModeClick,
  showNotification = null,
  lowStimulationMode = false,
}: HomeScreenProps) {
  const [showDisclaimer, setShowDisclaimer] = React.useState(true);
  const [notificationDismissed, setNotificationDismissed] = React.useState(false);
  const { pendingFollowUps, recordOutcome } = useFollowUpReminders();
  const [dismissedFollowUpIds, setDismissedFollowUpIds] = React.useState<Set<string>>(new Set());
  const firstPending = pendingFollowUps.find(f => !dismissedFollowUpIds.has(f.id));
  
  // Risk variables data for SootheMode
  const riskVariables: RiskVariable[] = [
    { name: 'HRV', percentage: 12, category: 'biometric', value: '47', unit: 'ms' },
    { name: 'Resting Heart Rate', percentage: 10, category: 'biometric', value: '72', unit: 'bpm' },
    { name: 'Sleep Duration', percentage: 15, category: 'biometric', value: '6.5', unit: 'hrs' },
    { name: 'Body temperature change', percentage: 8, category: 'biometric', value: '+0.4', unit: '°C' },
    { name: 'Sleep Quality', percentage: 22, category: 'biometric', value: '4.5', unit: '/10' },
    { name: 'Activity Level', percentage: 7, category: 'biometric', value: '3200', unit: 'steps' },
    { name: 'Menstrual Phase', percentage: 15, category: 'personal', value: 'Premenstrual', unit: '' },
    { name: 'Barometric Pressure Change', percentage: 28, category: 'environmental', value: '-6', unit: 'hPa' },
    { name: 'Base Pressure', percentage: 5, category: 'environmental', value: '1013', unit: 'hPa' },
    { name: 'Temperature', percentage: 9, category: 'environmental', value: '22', unit: '°C' },
    { name: 'Weather Changes', percentage: 14, category: 'environmental', value: 'Unstable', unit: '' },
    { name: 'Humidity', percentage: 11, category: 'environmental', value: '75', unit: '%' },
    { name: 'Air Quality Index', percentage: 6, category: 'environmental', value: '85', unit: 'AQI' },
    { name: 'Altitude', percentage: 3, category: 'environmental', value: '850', unit: 'm' },
    { name: 'Stress Level', percentage: 18, category: 'lifestyle', value: '8.5', unit: '/10' },
    { name: 'Caffeine Intake change', percentage: 6, category: 'lifestyle', value: '+150', unit: 'mg' },
    { name: 'Water Intake', percentage: 4, category: 'lifestyle', value: '1.8', unit: 'L' },
    { name: 'Prodrome Symptoms', percentage: 20, category: 'lifestyle', value: 'Present', unit: '' },
    { name: 'Screen Time', percentage: 8, category: 'lifestyle', value: '9', unit: 'hrs' },
    { name: 'Alcohol Intake', percentage: 5, category: 'lifestyle', value: '1', unit: 'drink' },
    { name: 'Meal Regularity', percentage: 7, category: 'lifestyle', value: 'Irregular', unit: '' },
    { name: 'Age', percentage: 2, category: 'personal', value: '34', unit: 'years' },
    { name: 'Body Weight', percentage: 1, category: 'personal', value: '68', unit: 'kg' },
    { name: 'BMI', percentage: 1, category: 'personal', value: '22.5', unit: '' },
    { name: 'Migraine History', percentage: 16, category: 'personal', value: '8', unit: 'yrs' },
  ];
  
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

  // State for carousel dots
  const [api, setApi] = React.useState<any>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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

          {/* Follow-up reminder (if due) */}
          {firstPending && (
            <div
              className="border rounded-xl p-4 bg-accent/5 border-accent/20"
              style={{ borderRadius: '12px' }}
              role="region"
              aria-label="SootheMode follow-up"
            >
              <p className="text-body mb-3">
                How did your prevention plan work?
              </p>
              <p className="text-label text-muted-foreground mb-4">
                Triggers: {firstPending.triggerLabels}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  style={{ borderRadius: '8px' }}
                  onClick={() => recordOutcome(firstPending.id, 'prevented')}
                >
                  Prevented
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-warning/30 text-warning hover:bg-warning/10"
                  style={{ borderRadius: '8px' }}
                  onClick={() => recordOutcome(firstPending.id, 'reduced')}
                >
                  Reduced
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-critical/30 text-critical hover:bg-critical/10"
                  style={{ borderRadius: '8px' }}
                  onClick={() => recordOutcome(firstPending.id, 'no-effect')}
                >
                  No effect
                </Button>
                <button
                  className="text-label text-muted-foreground hover:text-foreground px-2"
                  onClick={() => setDismissedFollowUpIds(prev => new Set(prev).add(firstPending.id))}
                  aria-label="Dismiss follow-up"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Risk Module - Enhanced Gradient Hero Card */}
          <RiskHeroCard
            percentage={riskPercentage}
            riskLevel={riskLevel}
            confidence={85}
            riskContributors={riskContributors}
            riskVariables={riskVariables}
            whatHelps={whatHelps}
            lowStimulationMode={lowStimulationMode}
          />

          {/* Primary CTA - Quick Check moved to top */}
          <Button
            onClick={onQuickCheckClick}
            className="w-full h-12 gap-2 relative"
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

            {/* Keep up the good habits - moved to secondary */}
            <Button
              variant="outline"
              className="h-12 gap-2"
              style={{ borderRadius: '12px' }}
              onClick={() => onSootheModeClick && onSootheModeClick(riskVariables, riskPercentage)}
            >
              <span className="truncate">{contextualAction.label}</span>
            </Button>
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

          {/* Tips Carousel */}
          <div className="space-y-4">
            <h2 className="text-h2">Tips for you</h2>
            <div className="relative">
              <Carousel
                setApi={setApi}
                className="w-full"
                opts={{
                  align: 'start',
                  loop: false,
                }}
              >
                <CarouselContent>
                  <CarouselItem>
                    <TipCard
                      icon={Wind}
                      title="Take a breathing break"
                      description="5 minutes of deep breathing can reduce stress and lower migraine risk."
                      actionLabel="Start now →"
                      onAction={() => alert('Starting breathing exercise')}
                      iconBgColor="bg-accent/10"
                      iconColor="text-accent"
                    />
                  </CarouselItem>
                  <CarouselItem>
                    <TipCard
                      icon={Sun}
                      title="Try dark mode"
                      description="Reduce eye strain by switching to dark mode during the day."
                      actionLabel="Enable →"
                      onAction={() => alert('Enabling dark mode')}
                      iconBgColor="bg-primary/10"
                      iconColor="text-primary"
                    />
                  </CarouselItem>
                  <CarouselItem>
                    <TipCard
                      icon={Droplets}
                      title="Stay hydrated"
                      description="Drink 250ml of water now to prevent dehydration headaches."
                      actionLabel="Log water →"
                      onAction={() => alert('Logging water intake')}
                      iconBgColor="bg-success/10"
                      iconColor="text-success"
                    />
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
              {/* Carousel Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === current
                        ? 'w-6 bg-primary'
                        : 'w-2 bg-neutral-200 dark:bg-neutral-200/20'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
