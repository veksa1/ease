import React, { useState } from 'react';
import { PersonalMigraineProfile } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

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

  const updateField = <K extends keyof PersonalMigraineProfile>(key: K, value: PersonalMigraineProfile[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
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

    try {
      setSubmitting(true);
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
