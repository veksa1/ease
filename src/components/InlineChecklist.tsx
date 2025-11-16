import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCcw, CalendarRange, Info, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import type { ChecklistContextPayload, ChecklistLLMResponse } from '../types/checklist';

export type InlineChecklistState = 'idle' | 'loading' | 'ready' | 'error';

interface InlineChecklistProps {
  state: InlineChecklistState;
  response: ChecklistLLMResponse | null;
  payload: ChecklistContextPayload | null;
  error: string | null;
  onRetry: () => void;
}

export function InlineChecklist({ state, response, payload, error, onRetry }: InlineChecklistProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(true);

  const ChecklistGeneratingSpinner = () => (
    <div className="relative flex items-center justify-center w-12 h-12" role="status" aria-live="polite">
      <span className="sr-only">Generating personalized steps</span>
      <div className="absolute inset-1 rounded-full border border-primary/20 opacity-60" />
      <div className="absolute inset-2 rounded-full border border-primary/30" />
      <div className="absolute inset-1 rounded-full border-2 border-primary border-b-transparent border-l-transparent checklist-spinner-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-10 h-10 checklist-spinner-spin">
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(255,123,102,0.4)]" />
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setExpandedSteps(new Set());
    setChecked({});
    setInsightsOpen(false);
    setPlanOpen(true);
  }, [response]);

  const explainersByTitle = useMemo(() => {
    if (!response?.explainers) return new Map<string, string>();
    return new Map(response.explainers.map(explainer => [explainer.title, explainer.detail]));
  }, [response?.explainers]);

  const toggleExpanded = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const toggleChecked = (stepId: string) => {
    setChecked(prev => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const calendarEvents = payload?.environment.calendar.events ?? [];
  const calendarSummary = payload?.environment.calendar;
  const advisories = response?.calendarAdvisories ?? [];
  const infoGain = response?.infoGainSuggestions ?? payload?.alineRisk.infoGainSuggestions ?? [];

  if (state === 'idle') {
    return null;
  }

  if (state === 'loading') {
    return (
      <div className="w-full mt-4 p-5 rounded-xl border border-border/60 bg-background/70 flex items-center justify-center">
        <ChecklistGeneratingSpinner />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full mt-4 p-4 rounded-xl border border-critical/40 bg-critical/5 space-y-3">
        <p className="text-body text-critical">{error ?? 'Unable to generate checklist. Please try again.'}</p>
        <Button variant="outline" className="w-full" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (state === 'ready' && response) {
    return (
      <div className="w-full mt-2">
        <section className="p-5 rounded-xl bg-card border border-border space-y-4" style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between gap-3">
            <button
              className="flex-1 flex items-center justify-between gap-3 text-left"
              onClick={() => setPlanOpen(open => !open)}
            >
              <div>
                <p className="text-label text-muted-foreground">Personalized plan</p>
                <h3 className="text-h3">{response.riskNarrative || 'Actions for the next few hours'}</h3>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform ${planOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onRetry} title="Regenerate">
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </div>

          {planOpen && (
            <div className="space-y-5">
              {(advisories.length > 0 || calendarEvents.length > 0 || calendarSummary) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-body font-semibold">
                    <CalendarRange className="w-4 h-4 text-primary" />
                    Calendar considerations
                  </div>
                  {advisories.length > 0 && (
                    <div className="space-y-2">
                      {advisories.map(item => (
                        <div key={item.eventTitle} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-body font-medium">{item.eventTitle}</p>
                          <p className="text-label text-muted-foreground">{item.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {calendarSummary && (
                    <div className="grid grid-cols-2 gap-2 text-label text-muted-foreground">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Workload index</p>
                        <p className="text-body font-semibold">{calendarSummary.workloadIndex ?? '—'}/100</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Next stressor</p>
                        <p className="text-body font-semibold">{calendarSummary.nextHighStressEvent ?? 'None flagged'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-body font-semibold">Checklist</p>
                {response.checklist && response.checklist.length === 0 && (
                  <p className="text-label text-muted-foreground">No personalized steps available right now.</p>
                )}
                <div className="space-y-3">
                  {response.checklist?.map(step => {
                    const isExpanded = expandedSteps.has(step.id);
                    const explainer = explainersByTitle.get(step.title) ?? step.description;
                    return (
                      <div key={step.id} className="rounded-lg border border-border/60 bg-background">
                        <button
                          className="w-full flex items-center justify-between gap-3 p-3 text-left"
                          onClick={() => toggleExpanded(step.id)}
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2
                              className={`w-5 h-5 shrink-0 ${checked[step.id] ? 'text-success' : 'text-muted-foreground/70'}`}
                              onClick={event => {
                                event.stopPropagation();
                                toggleChecked(step.id);
                              }}
                            />
                            <p className={`text-body font-medium ${checked[step.id] ? 'line-through text-muted-foreground' : ''}`}>
                              {step.title}
                            </p>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 text-label text-muted-foreground">
                            {explainer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {infoGain.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-background mt-3">
                  <button
                    className="w-full flex items-center justify-between gap-3 p-3 text-left"
                    onClick={() => setInsightsOpen(open => !open)}
                  >
                    <div className="flex items-center gap-2 text-body font-medium">
                      <Info className="w-4 h-4 text-primary" />
                      Future data to capture
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {insightsOpen && (
                    <ul className="px-4 pb-3 list-disc ml-4 text-label text-muted-foreground space-y-1">
                      {infoGain.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  return null;
}
