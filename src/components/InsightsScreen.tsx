import React, { useState } from 'react';
import {
  ChevronLeft,
  Info,
  TrendingUp,
  ChevronRight,
  X,
  Check,
  Bell,
  Calendar,
} from 'lucide-react';
import { Button } from './ui/button';
import { BottomNav } from './BottomNav';
import { useCorrelations } from '../hooks/useDemoData';

interface InsightsScreenProps {
  onBack?: () => void;
  onNavigate?: (tab: 'home' | 'diary' | 'profile') => void;
}

type BottomSheetType =
  | 'header-info'
  | 'correlations-info'
  | 'correlation-details'
  | 'experiment-info'
  | 'narrative-details'
  | null;

type CorrelationData = {
  id: string;
  label: string;
  strength: number;
  explanation: string;
};

export function InsightsScreen({ onBack, onNavigate }: InsightsScreenProps) {
  const [activeBottomSheet, setActiveBottomSheet] = useState<BottomSheetType>(null);
  const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelationData | null>(null);
  
  // Load correlations from demo data
  const { loading, correlations } = useCorrelations();
  
  // Experiment tracking (persisted to localStorage)
  const [experimentDays, setExperimentDays] = useState<boolean[]>(() => {
    const stored = localStorage.getItem('ease_experiment_hydration');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [false, false, false, false, false, false, false];
      }
    }
    return [false, false, false, false, false, false, false];
  });

  const handleViewDetails = (correlation: CorrelationData) => {
    setSelectedCorrelation(correlation);
    setActiveBottomSheet('correlation-details');
  };

  const toggleExperimentDay = (index: number) => {
    const newDays = [...experimentDays];
    newDays[index] = !newDays[index];
    setExperimentDays(newDays);
    // Save to localStorage
    localStorage.setItem('ease_experiment_hydration', JSON.stringify(newDays));
  };

  const completedDays = experimentDays.filter(Boolean).length;
  
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Generate pattern text from top correlations
  const patternText = correlations.length > 0 
    ? correlations.slice(0, 2).map(c => c.label).join(' + ')
    : 'Building patterns...';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-label text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back"
              style={{ borderRadius: '8px' }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-h2 absolute left-1/2 -translate-x-1/2">Insights</h1>
            <button
              onClick={() => setActiveBottomSheet('header-info')}
              className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Learn about insights"
              style={{ borderRadius: '8px' }}
            >
              <Info className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Pattern Chip */}
          <div className="flex items-center justify-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary"
              style={{ borderRadius: '20px' }}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-label">Your pattern this month: {patternText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-6 pt-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Section 1: Top Correlations */}
          <section>
            <div
              className="bg-card rounded-xl border border-border p-6 space-y-4"
              style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-h3">Top correlations</h2>
                <button
                  onClick={() => setActiveBottomSheet('correlations-info')}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  aria-label="Learn about correlations"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Correlation List */}
              <div className="space-y-0">
                {correlations.map((correlation, index) => (
                  <React.Fragment key={correlation.id}>
                    {index > 0 && <div className="border-t border-border my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-body">{correlation.label}</span>
                        <span className="text-label text-muted-foreground">
                          {correlation.strength}%
                        </span>
                      </div>

                      {/* Strength Bar */}
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${correlation.strength}%` }}
                        />
                      </div>

                      {/* View Details Link */}
                      <button
                        onClick={() => handleViewDetails(correlation)}
                        className="text-label text-primary hover:underline transition-colors"
                      >
                        View details
                      </button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: Run an Experiment */}
          <section>
            <div
              className="bg-card rounded-xl border border-border p-6 space-y-4"
              style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-h3">Run an experiment</h2>
                  <p className="text-body text-muted-foreground mt-1">
                    Hydration target (this week)
                  </p>
                </div>
                <button
                  onClick={() => setActiveBottomSheet('experiment-info')}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  aria-label="Learn about experiments"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Experiment Description */}
              <p className="text-body text-muted-foreground">
                Aim for ≥ 1.5 L/day and log quick check-ins.
              </p>

              {/* Week Checklist */}
              <div className="flex items-center justify-between gap-2 py-2">
                {dayLabels.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => toggleExperimentDay(index)}
                    className={`
                      flex-1 aspect-square rounded-full flex items-center justify-center text-label
                      transition-all duration-200 min-w-[44px]
                      ${
                        experimentDays[index]
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                    aria-label={`${day}, ${experimentDays[index] ? 'completed' : 'incomplete'}`}
                  >
                    {experimentDays[index] ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{day}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-3 pt-2">
                <Button className="flex-1 h-12 rounded-lg" style={{ borderRadius: '8px' }}>
                  Start
                </Button>
                <button className="text-label text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  Set reminder
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Narrative Chip */}
          <section>
            <button
              onClick={() => setActiveBottomSheet('narrative-details')}
              className="w-full bg-accent/10 border border-accent/20 rounded-xl p-4 hover:bg-accent/15 transition-colors text-left"
              style={{ borderRadius: '12px' }}
            >
              <p className="text-body text-foreground leading-relaxed">
                This month you often reported higher risk on Mondays, especially when HRV
                was below baseline.
              </p>
            </button>
          </section>

          {/* Footer */}
          <div className="pt-4 pb-2">
            <p className="text-label text-muted-foreground text-center">
              Ease provides estimates and correlations; not medical advice.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab="home"
        onNavigate={onNavigate || ((tab) => tab === 'home' && onBack?.())}
      />

      {/* Bottom Sheets */}
      {activeBottomSheet === 'header-info' && (
        <BottomSheet
          title="About Insights"
          onClose={() => setActiveBottomSheet(null)}
        >
          <div className="space-y-4">
            <p className="text-body text-muted-foreground leading-relaxed">
              Insights help you discover patterns between your daily health data and
              migraine risk.
            </p>
            <div
              className="bg-warning/10 border border-warning/20 rounded-lg p-4"
              style={{ borderRadius: '8px' }}
            >
              <h3 className="font-medium text-foreground mb-2">Important</h3>
              <ul className="text-body text-muted-foreground space-y-2">
                <li>• Correlations show associations, not causation</li>
                <li>• Patterns are personalized to your data</li>
                <li>• Results are estimates, not medical diagnoses</li>
                <li>• Always consult healthcare professionals</li>
              </ul>
            </div>
          </div>
        </BottomSheet>
      )}

      {activeBottomSheet === 'correlations-info' && (
        <BottomSheet
          title="About correlations"
          onClose={() => setActiveBottomSheet(null)}
        >
          <div className="space-y-4">
            <p className="text-body text-muted-foreground leading-relaxed">
              Correlations show associations in your data, not medical advice.
            </p>
            <p className="text-body text-muted-foreground leading-relaxed">
              We analyze your health metrics and migraine logs to identify patterns that
              occur together. A high correlation percentage means the pattern appears
              frequently alongside elevated migraine risk.
            </p>
          </div>
        </BottomSheet>
      )}

      {activeBottomSheet === 'correlation-details' && selectedCorrelation && (
        <BottomSheet
          title={selectedCorrelation.label}
          onClose={() => {
            setActiveBottomSheet(null);
            setSelectedCorrelation(null);
          }}
        >
          <div className="space-y-6">
            <p className="text-body text-muted-foreground leading-relaxed">
              {selectedCorrelation.explanation}
            </p>

            {/* Sparkline Placeholder */}
            <div
              className="bg-muted rounded-lg p-4 h-32 flex items-center justify-center"
              style={{ borderRadius: '8px' }}
            >
              <div className="w-full h-full flex items-end justify-between gap-1 px-4">
                {[32, 48, 40, 56, 72, 68, 80, 76, 85, 90, 78, 70].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/30 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            <button
              className="text-label text-primary hover:underline transition-colors"
              onClick={() => alert('Methodology details would appear here')}
            >
              How we calculate this
            </button>
          </div>
        </BottomSheet>
      )}

      {activeBottomSheet === 'experiment-info' && (
        <BottomSheet
          title="About experiments"
          onClose={() => setActiveBottomSheet(null)}
        >
          <div className="space-y-4">
            <p className="text-body text-muted-foreground leading-relaxed">
              Experiments help you test whether specific behaviors affect your migraine
              patterns.
            </p>
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">What happens:</h3>
              <ul className="text-body text-muted-foreground space-y-2">
                <li>• Set a daily target for one week</li>
                <li>• Log your progress with quick check-ins</li>
                <li>• We'll track your migraine risk during the experiment</li>
                <li>• See results and correlations after completion</li>
              </ul>
            </div>
            <div
              className="bg-accent/10 border border-accent/20 rounded-lg p-4"
              style={{ borderRadius: '8px' }}
            >
              <p className="text-body text-muted-foreground">
                Results are personalized insights, not medical conclusions. Use them to
                have informed conversations with your healthcare provider.
              </p>
            </div>
          </div>
        </BottomSheet>
      )}

      {activeBottomSheet === 'narrative-details' && (
        <BottomSheet
          title="Your pattern"
          onClose={() => setActiveBottomSheet(null)}
        >
          <div className="space-y-4">
            <p className="text-body text-muted-foreground leading-relaxed">
              This month you often reported higher risk on Mondays, especially when HRV
              was below baseline.
            </p>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Key findings:</h3>
              <ul className="text-body text-muted-foreground space-y-2">
                <li>• Monday mornings show 65% correlation with elevated risk</li>
                <li>• Low HRV days have 72% correlation with migraine episodes</li>
              </ul>
            </div>
            <button
              onClick={() => setActiveBottomSheet('correlations-info')}
              className="text-label text-primary hover:underline transition-colors flex items-center gap-1"
            >
              View details
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// Bottom Sheet Component
interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">{title}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
