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
import { Button } from './ui/button';
import { TipCard } from './TipCard';
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
}

export function HomeScreen({
  userName,
  riskLevel,
  riskPercentage,
  contextualAction,
  streakCount,
  todayData,
}: HomeScreenProps) {
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

          {/* Risk Module */}
          <div
            className={`p-6 rounded-xl bg-card border ${getModuleBgColor()}`}
            style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex flex-col items-center space-y-4">
              {/* Risk Ring */}
              <RiskRing percentage={riskPercentage} size={160} strokeWidth={16} />

              {/* Risk Label */}
              <div className="flex items-center gap-2">
                <span className={`text-h2 ${getRiskColor()}`}>
                  {getRiskLabel()} risk
                </span>
                {/* Why Link */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="text-label text-primary hover:underline flex items-center gap-1">
                      <HelpCircle className="w-4 h-4" />
                      Why?
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh]">
                    <SheetHeader>
                      <SheetTitle>Why {getRiskLabel().toLowerCase()} risk?</SheetTitle>
                      <SheetDescription>
                        Understanding your current migraine risk
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div className="p-4 rounded-xl bg-muted border border-border space-y-2">
                        <div className="flex items-center gap-2">
                          <Moon className="w-5 h-5 text-primary" />
                          <h3 className="text-body">Sleep Quality</h3>
                        </div>
                        <p className="text-label text-muted-foreground">
                          {riskLevel === 'high'
                            ? 'Your sleep was below your usual quality last night.'
                            : 'Your sleep quality was good last night.'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted border border-border space-y-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-accent" />
                          <h3 className="text-body">Heart Rate Variability</h3>
                        </div>
                        <p className="text-label text-muted-foreground">
                          {riskLevel === 'high'
                            ? 'Your HRV is lower than baseline, indicating increased stress.'
                            : 'Your HRV is within normal range.'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted border border-border space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-warning" />
                          <h3 className="text-body">Schedule</h3>
                        </div>
                        <p className="text-label text-muted-foreground">
                          {todayData.upcomingStressor ||
                            'No unusual schedule patterns detected today.'}
                        </p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <Button
            className="w-full h-14 rounded-lg gap-2"
            style={{ borderRadius: '8px' }}
          >
            <ContextualIcon className="w-5 h-5" />
            {contextualAction.label}
          </Button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Report Migraine */}
            <Button
              variant="outline"
              className="h-12 rounded-lg border-critical text-critical hover:bg-critical/10"
              style={{ borderRadius: '8px' }}
            >
              <AlertCircle className="w-4 h-4" />
              Report migraine
            </Button>

            {/* Quick Check */}
            <Button
              variant="outline"
              className="h-12 rounded-lg relative"
              style={{ borderRadius: '8px' }}
            >
              <HelpCircle className="w-4 h-4" />
              Quick check
              {streakCount > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-label">
                  <Flame className="w-3 h-3" />
                  {streakCount}
                </span>
              )}
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
