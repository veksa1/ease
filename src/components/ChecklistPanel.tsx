import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Loader2, RefreshCcw, CalendarRange, Info, Clock } from 'lucide-react';
import { Button } from './ui/button';
import type { RiskVariable } from '../types';
import type { ChecklistContextPayload, ChecklistLLMResponse } from '../types/checklist';
import { checklistService } from '../services/checklistService';
import { buildChecklistContextPayload } from '../utils/checklistPayloadBuilder';

const RETRY_SEQUENCE_MS = [0, 1000, 2000, 5000, 10000];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ChecklistPanelProps {
  riskVariables: RiskVariable[];
  riskPercentage: number;
  riskLevel: 'low' | 'moderate' | 'high';
  onClose: () => void;
}

type PanelState = 'idle' | 'loading' | 'ready' | 'error';

export function ChecklistPanel({ riskVariables, riskPercentage, riskLevel, onClose }: ChecklistPanelProps) {
  const [state, setState] = useState<PanelState>('idle');
  const [payload, setPayload] = useState<ChecklistContextPayload | null>(null);
  const [response, setResponse] = useState<ChecklistLLMResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let controller = new AbortController();

    async function runWithBackoff() {
      setState('loading');
      setError(null);

      for (let attempt = 0; attempt < RETRY_SEQUENCE_MS.length; attempt++) {
        if (cancelled) return;

        if (attempt > 0) {
          await sleep(RETRY_SEQUENCE_MS[attempt]);
          if (cancelled) return;
          controller.abort();
          controller = new AbortController();
        }

        try {
          const builtPayload = await buildChecklistContextPayload({
            userId: 'demo-user',
            riskVariables,
            riskPercentage,
          });

          if (cancelled) return;
          setPayload(builtPayload);

          const checklist = await checklistService.generateChecklist(builtPayload, controller.signal);
          if (cancelled) return;

          setResponse(checklist);
          setChecked({});
          setState('ready');
          return;
        } catch (err) {
          console.error(`[ChecklistPanel] Attempt ${attempt + 1} failed to generate checklist`, err);
          if (attempt === RETRY_SEQUENCE_MS.length - 1 && !cancelled) {
            setError(err instanceof Error ? err.message : 'Unable to generate checklist after multiple attempts.');
            setState('error');
          }
        }
      }
    }

    runWithBackoff();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [riskVariables, riskPercentage, requestId]);

  const triggerSummary = useMemo(() => {
    if (!response?.topTriggers?.length) return 'Review your current inputs';
    return response.topTriggers.join(' + ');
  }, [response]);

  const infoGainItems = useMemo(() => {
    if (response?.infoGainSuggestions?.length) return response.infoGainSuggestions;
    return payload?.alineRisk.infoGainSuggestions ?? [];
  }, [response, payload]);

  const calendarEvents = payload?.environment.calendar.events ?? [];

  const toggleStep = (id: string) => {
    setChecked(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const riskColor = riskLevel === 'high' ? 'bg-critical/10 text-critical' : riskLevel === 'moderate' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="space-y-0.5">
          <p className="text-label text-muted-foreground">Personalized prevention</p>
          <h2 className="text-h2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Checklist
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted/60 transition-colors"
          aria-label="Close checklist"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className={`p-4 rounded-xl border ${riskColor.replace('text-', 'border-')} flex flex-col gap-2`}>
            <p className="text-label text-muted-foreground">Based on your current triggers</p>
            <p className="text-body font-medium">{triggerSummary}</p>
            <div className="flex items-center gap-2 text-label text-muted-foreground">
              <Clock className="w-4 h-4" />
              Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-body text-muted-foreground">Assembling prevention steps from your recent data…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4 p-4 rounded-xl border border-critical/40 bg-critical/5">
              <p className="text-body text-critical">{error ?? 'Unable to reach OpenAI right now.'}</p>
              <Button variant="outline" className="w-full" onClick={() => setRequestId(id => id + 1)}>
                Try again
              </Button>
            </div>
          )}

          {state === 'ready' && response && (
            <>
              <section className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-h3">Prevention Checklist</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setRequestId(id => id + 1)}
                    title="Regenerate with updated context"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-label text-muted-foreground">{response.riskNarrative}</p>
                <div className="space-y-2">
                  {response.checklist?.map(step => (
                    <label
                      key={step.id}
                      className="flex gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checked[step.id])}
                        onChange={() => toggleStep(step.id)}
                        className="mt-1 w-5 h-5 rounded border-2 border-primary text-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-body font-medium ${checked[step.id] ? 'line-through text-muted-foreground' : ''}`}>
                            {step.title}
                          </p>
                          <span className="text-label text-muted-foreground">
                            ~{step.durationMinutes} min · {step.category}
                          </span>
                        </div>
                        <p className="text-label text-muted-foreground mt-1">{step.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-muted/60 capitalize">{step.timing}</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted/60">{step.effort} effort</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              <section className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center gap-2 text-body font-medium">
                  <Info className="w-4 h-4" />
                  Why these steps help
                </div>
                <ul className="space-y-2 text-label text-muted-foreground">
                  {response.explainers?.map(explainer => (
                    <li key={explainer.title} className="p-3 rounded-lg bg-background border border-border/60">
                      <p className="text-body font-medium mb-1">{explainer.title}</p>
                      <p>{explainer.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>

              {calendarEvents.length > 0 && response.calendarAdvisories?.length ? (
                <section className="p-4 rounded-xl border border-border/70 bg-card/80 space-y-3">
                  <div className="flex items-center gap-2 text-body font-medium">
                    <CalendarRange className="w-4 h-4 text-primary" />
                    Calendar considerations
                  </div>
                  <div className="space-y-2">
                    {response.calendarAdvisories.map(item => (
                      <div key={item.eventTitle} className="p-3 rounded-lg bg-muted/60">
                        <p className="text-body font-medium">{item.eventTitle}</p>
                        <p className="text-label text-muted-foreground">{item.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {infoGainItems.length > 0 && (
                <section className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="text-body font-medium">Next best measurements</h4>
                  <ul className="space-y-1 text-label text-muted-foreground">
                    {infoGainItems.map(item => (
                      <li key={item} className="list-disc ml-5">{item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {response.followUp && (
                <section className="p-4 rounded-xl bg-primary/5 border border-primary/30 space-y-1">
                  <p className="text-body font-medium">Follow-up reminder</p>
                  <p className="text-label text-muted-foreground">
                    Check back in {response.followUp.reminderInMinutes} minutes · {response.followUp.note}
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="max-w-md mx-auto">
          <Button onClick={onClose} className="w-full h-12" style={{ borderRadius: '12px' }}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
