import { useEffect, useState } from 'react';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { GradientRiskGauge } from './GradientRiskGauge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';

type VariableCategory = 'biometric' | 'environmental' | 'lifestyle' | 'personal';

interface RiskVariable {
  name: string;
  percentage: number;
  category: VariableCategory;
  unit?: string;
  value?: string | number;
}

interface RiskHeroCardProps {
  percentage: number;
  riskLevel: 'low' | 'moderate' | 'high';
  confidence?: number;
  riskVariables?: RiskVariable[];
  whatHelps?: string[];
  lowStimulationMode?: boolean;
}

export function RiskHeroCard({
  percentage,
  riskLevel,
  confidence = 85,
  riskVariables = [],
  whatHelps = [],
  lowStimulationMode = false,
}: RiskHeroCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 375
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const gaugeSize = Math.max(120, Math.min(220, Math.floor(viewportWidth * 0.4)));
  const gaugeStroke = gaugeSize < 150 ? 12 : 14;

  const getInfluenceColor = (pct: number) => {
    if (pct >= 20) return 'text-white dark:text-white';
    if (pct >= 15) return 'text-white dark:text-white';
    if (pct >= 10) return 'text-gray-900 dark:text-gray-900';
    if (pct >= 5) return 'text-gray-900 dark:text-gray-900';
    return 'text-white dark:text-white';
  };

  const getInfluenceBackground = (pct: number) => {
    if (pct >= 20) return 'bg-red-500/15';
    if (pct >= 15) return 'bg-orange-500/15';
    if (pct >= 10) return 'bg-yellow-500/15';
    if (pct >= 5) return 'bg-lime-500/15';
    return 'bg-emerald-500/15';
  };

  const getPercentageBadgeColor = (pct: number) => {
    if (pct >= 20) return 'bg-red-500 text-white';
    if (pct >= 15) return 'bg-orange-500 text-white';
    if (pct >= 10) return 'bg-yellow-300 text-gray-900';
    if (pct >= 5) return 'bg-lime-300 text-gray-900';
    return 'bg-emerald-400 text-gray-900';
  };

  const groupedContributors = riskVariables
    .slice()
    .sort((a, b) => b.percentage - a.percentage)
    .reduce((acc, variable) => {
      if (!acc[variable.category]) acc[variable.category] = [];
      acc[variable.category].push(variable);
      return acc;
    }, {} as Record<VariableCategory, RiskVariable[]>);

  const categoryLabels: Record<VariableCategory, string> = {
    biometric: '🫀 Biometric',
    environmental: '🌤️ Environmental',
    lifestyle: '🌱 Lifestyle',
    personal: '👤 Personal',
  };

  const defaultOpenCategories = Object.keys(groupedContributors) as string[];

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
      className={`relative overflow-hidden rounded-2xl p-4 md:p-6 ${getGradientClasses()}`}
      style={{ borderRadius: '16px', border: '1px solid', borderColor: 'rgba(255, 123, 102, 0.12)' }}
    >
      <div
        className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-[0.15] pointer-events-none blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(255, 123, 102, 0.4) 0%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center space-y-3 md:space-y-4">
        <GradientRiskGauge
          percentage={percentage}
          riskLevel={riskLevel}
          size={gaugeSize}
          strokeWidth={gaugeStroke}
          showConfidence={false}
          confidence={confidence}
          lowStimulationMode={lowStimulationMode}
        />

        <button
          onClick={() => setShowDetails(true)}
          className="flex items-center gap-1.5 text-label text-primary-600 dark:text-primary hover:underline transition-colors group"
          style={{ minHeight: '44px' }}
        >
          <HelpCircle className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          Why?
        </button>
      </div>

      {showDetails && (
        <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col">
          <div className="flex-shrink-0 border-b border-border/60 bg-background/80 backdrop-blur">
            <div className="mx-auto max-w-5xl h-12 md:h-14 px-2 md:px-3 flex items-center gap-3">
              <button
                onClick={() => setShowDetails(false)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-baseline gap-3">
                <h2 className="text-base md:text-lg font-semibold">Your risk factors</h2>
                <span className="text-xs md:text-sm text-muted-foreground">All current factors and their influence</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain flex justify-center">
            <div className="w-full max-w-5xl px-2 md:px-3 pt-3 pb-8">
            {riskVariables.length > 0 ? (
              <Accordion type="multiple" defaultValue={defaultOpenCategories} className="w-full">
                {Object.entries(groupedContributors).map(([category, variables]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="text-base md:text-lg justify-center">
                      <span>{categoryLabels[category as VariableCategory]}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-2 md:gap-3 items-center">
                        {variables.map((variable, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-center gap-2 md:gap-2.5 p-2 md:p-2.5 rounded-lg border border-border/40 transition-colors ${getInfluenceBackground(variable.percentage)}`}
                            style={{ borderRadius: '10px' }}
                          >
                            <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md bg-card/80 shadow-sm flex-shrink-0">
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm md:text-base font-medium whitespace-nowrap">{variable.name}</span>
                            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                              {variable.value}{variable.unit ? ` ${variable.unit}` : ''}
                            </span>
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-1 md:px-3 md:py-1.5 rounded-md shadow-sm ${getPercentageBadgeColor(variable.percentage)}`}
                              style={{ borderRadius: '8px', minWidth: '56px' }}
                            >
                              <span className={`text-xs md:text-sm font-semibold ${getInfluenceColor(variable.percentage)}`}>
                                {variable.percentage}%
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-10 md:py-12 text-muted-foreground">
                <p className="text-base md:text-lg">No significant risk factors detected</p>
              </div>
            )}

            {whatHelps.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border mt-4 flex flex-col items-center">
                <h3 className="text-base md:text-lg font-semibold text-center">💡 What helps reduce your risk</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {whatHelps.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => alert(`Action: ${action}`)}
                      className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-sm md:text-base hover:bg-primary/20 transition-colors font-medium"
                      style={{ borderRadius: '24px', minHeight: '36px' }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              className="mt-4 p-3 md:p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm md:text-base text-muted-foreground text-center"
              style={{ borderRadius: '12px' }}
            >
              <strong className="font-semibold">Note:</strong> Ease provides risk estimates, not medical advice. Consult your healthcare provider for medical decisions.
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
