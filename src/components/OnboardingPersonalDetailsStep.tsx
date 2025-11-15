import React, { useState } from 'react';
import { PersonalMigraineProfile } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
    menstrualPhase: initialValue?.menstrualPhase ?? 'none',
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

    if (!form.migraineHistoryYears || form.migraineHistoryYears <= 0) {
      setError('Please enter how many years you have had migraines.');
      return;
    }
    if (!form.age || form.age <= 0) {
      setError('Please enter your age.');
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
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-h1">Tell us about your migraine history</h1>
        <p className="text-body text-muted-foreground">
          A few details about you help Ease personalize your migraine risk predictions.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="migraineHistoryYears">How many years have you had migraines?</Label>
          <Input
            id="migraineHistoryYears"
            type="number"
            min={0}
            inputMode="numeric"
            value={form.migraineHistoryYears.toString()}
            onChange={e => updateField('migraineHistoryYears', Number(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="menstrualPhase">Menstrual phase (optional)</Label>
          <Select
            value={form.menstrualPhase}
            onValueChange={value => updateField('menstrualPhase', value as PersonalMigraineProfile['menstrualPhase'])}
          >
            <SelectTrigger id="menstrualPhase">
              <SelectValue placeholder="Select phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not applicable</SelectItem>
              <SelectItem value="premenstrual">Premenstrual</SelectItem>
              <SelectItem value="menstrual">Menstrual</SelectItem>
              <SelectItem value="postmenstrual">Postmenstrual</SelectItem>
              <SelectItem value="perimenopause">Perimenopause</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            min={0}
            inputMode="numeric"
            value={form.age.toString()}
            onChange={e => updateField('age', Number(e.target.value) || 0)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weightKg">Weight (kg, optional)</Label>
            <Input
              id="weightKg"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.weightKg?.toString() ?? ''}
              onChange={e => updateField('weightKg', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bmi">BMI (optional)</Label>
            <Input
              id="bmi"
              type="number"
              min={0}
              inputMode="decimal"
              value={form.bmi?.toString() ?? ''}
              onChange={e => updateField('bmi', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-critical" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
          style={{ borderRadius: '12px' }}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12"
          style={{ borderRadius: '12px' }}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Get started'}
        </Button>
      </div>
    </form>
  );
}
