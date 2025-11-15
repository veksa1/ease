import React, { useState, useEffect } from 'react';
import { PersonalMigraineProfile, TriggerHypothesis } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { sqliteService } from '../services/sqliteService';
import { TRIGGER_STRINGS, PREDEFINED_TRIGGERS, TriggerKey } from '../utils/triggerStrings';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface OnboardingPersonalDetailsStepProps {
  initialValue?: Partial<PersonalMigraineProfile>;
  onBack: () => void;
  onSubmit: (profile: PersonalMigraineProfile) => Promise<void>;
}

export function OnboardingPersonalDetailsStep({
  initialValue,
  onBack,
  onSubmit,
}: OnboardingPersonalDetailsStepProps) {
  const [form, setForm] = useState<PersonalMigraineProfile>({
    migraineHistoryYears: initialValue?.migraineHistoryYears ?? 0,
    age: initialValue?.age ?? 0,
    weightKg: initialValue?.weightKg,
    bmi: initialValue?.bmi,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger hypothesis state
  const [selectedTriggers, setSelectedTriggers] = useState<Set<TriggerKey>>(new Set());
  const [triggerDetails, setTriggerDetails] = useState<Map<TriggerKey, Partial<TriggerHypothesis>>>(new Map());
  const [expandedTriggers, setExpandedTriggers] = useState<Set<TriggerKey>>(new Set());

  const MAX_TRIGGERS = 5;

  // Load existing trigger hypotheses on mount
  useEffect(() => {
    const loadTriggerHypotheses = async () => {
      try {
        const hypotheses = await sqliteService.getTriggerHypotheses();
        const selected = new Set<TriggerKey>();
        const details = new Map<TriggerKey, Partial<TriggerHypothesis>>();
        
        hypotheses.forEach(h => {
          if (h.key in TRIGGER_STRINGS.triggers) {
            selected.add(h.key as TriggerKey);
            details.set(h.key as TriggerKey, h);
          }
        });
        
        setSelectedTriggers(selected);
        setTriggerDetails(details);
      } catch (err) {
        console.error('Failed to load trigger hypotheses:', err);
      }
    };
    
    loadTriggerHypotheses();
  }, []);

  const updateField = <K extends keyof PersonalMigraineProfile>(key: K, value: PersonalMigraineProfile[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleTrigger = (key: TriggerKey) => {
    setSelectedTriggers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
        // Remove from details and expanded
        setTriggerDetails(prevDetails => {
          const newDetails = new Map(prevDetails);
          newDetails.delete(key);
          return newDetails;
        });
        setExpandedTriggers(prevExpanded => {
          const newExpanded = new Set(prevExpanded);
          newExpanded.delete(key);
          return newExpanded;
        });
      } else {
        if (newSet.size >= MAX_TRIGGERS) {
          setError(TRIGGER_STRINGS.maxReachedWarning);
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        newSet.add(key);
        // Initialize with default confidence
        setTriggerDetails(prevDetails => {
          const newDetails = new Map(prevDetails);
          newDetails.set(key, { confidence: 0.5 });
          return newDetails;
        });
      }
      return newSet;
    });
  };

  const updateTriggerDetail = <K extends keyof TriggerHypothesis>(
    triggerKey: TriggerKey,
    field: K,
    value: TriggerHypothesis[K]
  ) => {
    setTriggerDetails(prev => {
      const newDetails = new Map(prev);
      const current = newDetails.get(triggerKey) || {};
      newDetails.set(triggerKey, { ...current, [field]: value });
      return newDetails;
    });
  };

  const toggleExpanded = (key: TriggerKey) => {
    setExpandedTriggers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const saveTriggerHypothesis = async (key: TriggerKey) => {
    const details = triggerDetails.get(key);
    if (!details || details.confidence === undefined) {
      return;
    }

    try {
      const hypothesis: Omit<TriggerHypothesis, 'createdAt' | 'updatedAt'> = {
        id: `trigger_${key}_${Date.now()}`,
        key,
        label: TRIGGER_STRINGS.triggers[key],
        confidence: details.confidence,
        freqPerMonth: details.freqPerMonth,
        threshold: details.threshold,
        onsetWindowHours: details.onsetWindowHours,
        helps: details.helps,
        notes: details.notes,
      };

      await sqliteService.saveTriggerHypothesis(hypothesis);
    } catch (err) {
      console.error('Failed to save trigger hypothesis:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.migraineHistoryYears || form.migraineHistoryYears < 0) {
      setError('Please enter how many years you have had migraines (minimum 0).');
      return;
    }
    if (form.migraineHistoryYears > 100) {
      setError('Please enter a valid number of years (maximum 100).');
      return;
    }
    if (!form.age || form.age < 0) {
      setError('Please enter your age (minimum 0).');
      return;
    }
    if (form.age > 120) {
      setError('Please enter a valid age (maximum 120).');
      return;
    }
    if (form.weightKg !== undefined && form.weightKg < 0) {
      setError('Weight must be a positive number.');
      return;
    }
    if (form.bmi !== undefined && (form.bmi < 0 || form.bmi > 100)) {
      setError('Please enter a valid BMI (0-100).');
      return;
    }

    // Validate trigger hypotheses
    for (const key of selectedTriggers) {
      const details = triggerDetails.get(key);
      if (!details || details.confidence === undefined) {
        setError(`${TRIGGER_STRINGS.triggers[key]}: ${TRIGGER_STRINGS.validation.confidenceRequired}`);
        return;
      }
      if (details.freqPerMonth !== undefined && details.freqPerMonth < 0) {
        setError(`${TRIGGER_STRINGS.triggers[key]}: ${TRIGGER_STRINGS.validation.frequencyNegative}`);
        return;
      }
      if (details.onsetWindowHours !== undefined && details.onsetWindowHours < 0) {
        setError(`${TRIGGER_STRINGS.triggers[key]}: ${TRIGGER_STRINGS.validation.onsetNegative}`);
        return;
      }
    }

    try {
      setSubmitting(true);

      // Save all trigger hypotheses
      for (const key of selectedTriggers) {
        await saveTriggerHypothesis(key);
      }

      // Delete any deselected triggers
      const existingHypotheses = await sqliteService.getTriggerHypotheses();
      for (const h of existingHypotheses) {
        if (!selectedTriggers.has(h.key as TriggerKey)) {
          await sqliteService.deleteTriggerHypothesis(h.id);
        }
      }

      await onSubmit(form);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while saving your details. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-h1">Tell us about your migraine history</h1>
        <p className="text-body text-muted-foreground">
          A few details about you help Ease personalize your migraine risk predictions.
        </p>
      </div>

      <div className="space-y-6">
        {/* Migraine History Years */}
        <div className="space-y-2">
          <Label htmlFor="migraineHistoryYears" className="text-body font-medium">
            How many years have you had migraines?
          </Label>
          <Input
            id="migraineHistoryYears"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            placeholder="0"
            className="h-12 text-base"
            style={{ borderRadius: '12px' }}
            value={form.migraineHistoryYears || ''}
            onChange={e => updateField('migraineHistoryYears', Number(e.target.value) || 0)}
          />
        </div>

        {/* Age */}
        <div className="space-y-2">
          <Label htmlFor="age" className="text-body font-medium">
            Age
          </Label>
          <Input
            id="age"
            type="number"
            min={0}
            max={120}
            inputMode="numeric"
            placeholder="0"
            className="h-12 text-base"
            style={{ borderRadius: '12px' }}
            value={form.age || ''}
            onChange={e => updateField('age', Number(e.target.value) || 0)}
          />
        </div>

        {/* Weight and BMI - Two Column Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weightKg" className="text-label">
              Weight (kg, optional)
            </Label>
            <Input
              id="weightKg"
              type="number"
              min={0}
              max={500}
              step="0.1"
              inputMode="decimal"
              placeholder="Optional"
              className="h-12 text-base"
              style={{ borderRadius: '12px' }}
              value={form.weightKg?.toString() ?? ''}
              onChange={e => updateField('weightKg', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bmi" className="text-label">
              BMI (optional)
            </Label>
            <Input
              id="bmi"
              type="number"
              min={0}
              max={100}
              step="0.1"
              inputMode="decimal"
              placeholder="Optional"
              className="h-12 text-base"
              style={{ borderRadius: '12px' }}
              value={form.bmi?.toString() ?? ''}
              onChange={e => updateField('bmi', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>

        {/* Trigger Hypotheses Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="space-y-2">
            <h2 className="text-h3 font-semibold">{TRIGGER_STRINGS.sectionTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {TRIGGER_STRINGS.sectionDescription}
            </p>
            <p className="text-sm font-medium text-primary">
              {TRIGGER_STRINGS.selectedCounter(selectedTriggers.size, MAX_TRIGGERS)}
            </p>
          </div>

          {/* Trigger Selection Grid */}
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_TRIGGERS.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => toggleTrigger(key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTriggers.has(key)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                style={{ borderRadius: '8px' }}
              >
                {TRIGGER_STRINGS.triggers[key]}
              </button>
            ))}
          </div>

          {/* Expandable Cards for Selected Triggers */}
          {Array.from(selectedTriggers).map(key => {
            const details = triggerDetails.get(key) || {};
            const isExpanded = expandedTriggers.has(key);
            
            return (
              <div
                key={key}
                className="border border-border rounded-xl p-4 space-y-3"
                style={{ borderRadius: '12px' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">{TRIGGER_STRINGS.triggers[key]}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(key)}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          {TRIGGER_STRINGS.collapseButton}
                          <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          {TRIGGER_STRINGS.expandButton}
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTrigger(key)}
                      className="text-sm text-critical hover:text-critical/80 flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Confidence - Always visible */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{TRIGGER_STRINGS.confidenceLabel}</Label>
                  <div className="flex gap-2">
                    {TRIGGER_STRINGS.confidenceOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateTriggerDetail(key, 'confidence', option.value)}
                        onBlur={() => saveTriggerHypothesis(key)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          details.confidence === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                        style={{ borderRadius: '8px' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="space-y-3 pt-2">
                    {/* Frequency */}
                    <div className="space-y-2">
                      <Label htmlFor={`freq-${key}`} className="text-sm">
                        {TRIGGER_STRINGS.frequencyLabel}
                      </Label>
                      <Input
                        id={`freq-${key}`}
                        type="number"
                        min={0}
                        step="0.1"
                        inputMode="decimal"
                        placeholder={TRIGGER_STRINGS.frequencyPlaceholder}
                        className="h-10 text-sm"
                        style={{ borderRadius: '8px' }}
                        value={details.freqPerMonth?.toString() ?? ''}
                        onChange={e => updateTriggerDetail(key, 'freqPerMonth', e.target.value ? Number(e.target.value) : undefined)}
                        onBlur={() => saveTriggerHypothesis(key)}
                      />
                    </div>

                    {/* Threshold */}
                    <div className="space-y-2">
                      <Label htmlFor={`threshold-${key}`} className="text-sm">
                        {TRIGGER_STRINGS.thresholdLabel}
                      </Label>
                      <Input
                        id={`threshold-${key}`}
                        type="text"
                        placeholder={TRIGGER_STRINGS.thresholdPlaceholder}
                        className="h-10 text-sm"
                        style={{ borderRadius: '8px' }}
                        value={details.threshold ?? ''}
                        onChange={e => updateTriggerDetail(key, 'threshold', e.target.value)}
                        onBlur={() => saveTriggerHypothesis(key)}
                      />
                    </div>

                    {/* Onset Window */}
                    <div className="space-y-2">
                      <Label htmlFor={`onset-${key}`} className="text-sm">
                        {TRIGGER_STRINGS.onsetWindowLabel}
                      </Label>
                      <Input
                        id={`onset-${key}`}
                        type="number"
                        min={0}
                        step="0.5"
                        inputMode="decimal"
                        placeholder={TRIGGER_STRINGS.onsetWindowPlaceholder}
                        className="h-10 text-sm"
                        style={{ borderRadius: '8px' }}
                        value={details.onsetWindowHours?.toString() ?? ''}
                        onChange={e => updateTriggerDetail(key, 'onsetWindowHours', e.target.value ? Number(e.target.value) : undefined)}
                        onBlur={() => saveTriggerHypothesis(key)}
                      />
                    </div>

                    {/* Helps */}
                    <div className="space-y-2">
                      <Label htmlFor={`helps-${key}`} className="text-sm">
                        {TRIGGER_STRINGS.helpsLabel}
                      </Label>
                      <Input
                        id={`helps-${key}`}
                        type="text"
                        placeholder={TRIGGER_STRINGS.helpsPlaceholder}
                        className="h-10 text-sm"
                        style={{ borderRadius: '8px' }}
                        value={details.helps ?? ''}
                        onChange={e => updateTriggerDetail(key, 'helps', e.target.value)}
                        onBlur={() => saveTriggerHypothesis(key)}
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${key}`} className="text-sm">
                        {TRIGGER_STRINGS.notesLabel}
                      </Label>
                      <Input
                        id={`notes-${key}`}
                        type="text"
                        placeholder={TRIGGER_STRINGS.notesPlaceholder}
                        className="h-10 text-sm"
                        style={{ borderRadius: '8px' }}
                        value={details.notes ?? ''}
                        onChange={e => updateTriggerDetail(key, 'notes', e.target.value)}
                        onBlur={() => saveTriggerHypothesis(key)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div 
          className="p-4 rounded-xl bg-critical/10 border border-critical/20"
          style={{ borderRadius: '12px' }}
          role="alert"
        >
          <p className="text-sm text-critical font-medium">
            {error}
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12 text-base"
          style={{ borderRadius: '12px' }}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 text-base"
          style={{ borderRadius: '12px' }}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Get started'}
        </Button>
      </div>
    </form>
  );
}
