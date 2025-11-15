import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { GradientRiskGauge } from './GradientRiskGauge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { SegmentedControl } from './SegmentedControl';

interface RiskHeroCardProps {
  percentage: number;
  riskLevel: 'low' | 'moderate' | 'high';
  confidence?: number;
  riskContributors?: Array<{ label: string; percentage: number; icon?: React.ElementType }>;
  whatHelps?: string[];
  lowStimulationMode?: boolean;
}

export function RiskHeroCard({
  percentage,
  riskLevel,
  confidence = 85,
  riskContributors = [],
  whatHelps = [],
  lowStimulationMode = false,
}: RiskHeroCardProps) {
  const [timeHorizon, setTimeHorizon] = useState<'6h' | 'today'>('6h');

  // Get gradient background colors based on risk level
  const getGradientClasses = () => {
    if (riskLevel === 'low') {
      return 'bg-gradient-to-br from-success/8 via-primary/5 to-accent/8 dark:from-success/10 dark:via-primary/8 dark:to-accent/10';
    } else if (riskLevel === 'moderate') {
      return 'bg-gradient-to-br from-primary/10 via-accent/8 to-primary/12 dark:from-primary/12 dark:via-accent/10 dark:to-primary/14';
    } else {
      return 'bg-gradient-to-br from-accent/12 via-warning/10 to-critical/8 dark:from-accent/14 dark:via-warning/12 dark:to-critical/10';
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 ${getGradientClasses()}`}
      style={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'rgba(255, 123, 102, 0.12)',
      }}
    >
      {/* Subtle background gloss */}
      <div
        className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-[0.15] pointer-events-none blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(255, 123, 102, 0.4) 0%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
        }}
      />

      {/* Time Horizon Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex gap-1 p-0.5 rounded-full bg-card/60 backdrop-blur-sm border border-border/40">
          <button
            onClick={() => setTimeHorizon('6h')}
            className={`px-3 py-1.5 rounded-full text-label transition-all ${
              timeHorizon === '6h'
                ? 'bg-primary/10 text-primary-600 dark:text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ minWidth: '44px', minHeight: '32px' }}
          >
            6h
          </button>
          <button
            onClick={() => setTimeHorizon('today')}
            className={`px-3 py-1.5 rounded-full text-label transition-all ${
              timeHorizon === 'today'
                ? 'bg-primary/10 text-primary-600 dark:text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ minWidth: '44px', minHeight: '32px' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center space-y-4">
        {/* Gradient Risk Gauge */}
        <GradientRiskGauge
          percentage={percentage}
          riskLevel={riskLevel}
          size={160}
          strokeWidth={14}
          showConfidence={false}
          confidence={confidence}
          lowStimulationMode={lowStimulationMode}
        />

        {/* Why Link */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex items-center gap-1.5 text-label text-primary-600 dark:text-primary hover:underline transition-colors group"
              style={{ minHeight: '44px' }}
            >
              <HelpCircle className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              Why?
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Your risk factors</SheetTitle>
              <SheetDescription>
                Here's what's contributing to today's migraine risk estimate.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Contributors */}
              {riskContributors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-body">What's influencing your risk</h3>
                  <div className="space-y-2">
                    {riskContributors.map((contributor, index) => {
                      const Icon = contributor.icon;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                          style={{ borderRadius: '8px' }}
                        >
                          <div className="flex items-center gap-3">
                            {Icon && (
                              <div
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-card"
                                style={{ borderRadius: '8px' }}
                              >
                                <Icon className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-body">{contributor.label}</span>
                          </div>
                          <span className="text-body text-muted-foreground">
                            {contributor.percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* What helps */}
              {whatHelps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-body">What helps</h3>
                  <div className="flex flex-wrap gap-2">
                    {whatHelps.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => alert(`Action: ${action}`)}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-label hover:bg-primary/20 transition-colors"
                        style={{ borderRadius: '24px', minHeight: '32px' }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div
                className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-label text-muted-foreground"
                style={{ borderRadius: '8px' }}
              >
                <strong>Note:</strong> Ease provides risk estimates, not medical
                advice. Consult your healthcare provider for medical decisions.
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
