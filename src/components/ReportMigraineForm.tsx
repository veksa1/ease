
import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type {
  MigraineReportFormData,
  Symptom,
  Trigger,
  PainCharacter,
  MedicationTiming,
  ReliefLevel,
  AuraType,
  SymptomOption,
  TriggerOption,
} from '../types/migraine';
import { getMigraineService } from '../services/migraineService';

interface ReportMigraineFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// UI configuration for symptoms
const SYMPTOM_OPTIONS: SymptomOption[] = [
  { id: 'nausea', label: 'Nausea' },
  { id: 'vomiting', label: 'Vomiting' },
  { id: 'photophobia', label: 'Light sensitivity' },
  { id: 'phonophobia', label: 'Sound sensitivity' },
  { id: 'osmophobia', label: 'Smell sensitivity' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'vertigo', label: 'Vertigo' },
  { id: 'neck_pain', label: 'Neck pain' },
  { id: 'neck_stiffness', label: 'Neck stiffness' },
  { id: 'cognitive_fog', label: 'Brain fog' },
  { id: 'difficulty_concentrating', label: 'Difficulty focusing' },
];

// UI configuration for triggers
const TRIGGER_OPTIONS: TriggerOption[] = [
  { id: 'stress', label: 'Stress', category: 'lifestyle' },
  { id: 'lack_of_sleep', label: 'Lack of sleep', category: 'lifestyle' },
  { id: 'oversleeping', label: 'Oversleeping', category: 'lifestyle' },
  { id: 'skipped_meal', label: 'Skipped meal', category: 'lifestyle' },
  { id: 'irregular_eating', label: 'Irregular eating', category: 'lifestyle' },
  { id: 'dehydration', label: 'Dehydration', category: 'lifestyle' },
  { id: 'hormonal_menstruation', label: 'Menstruation', category: 'hormonal' },
  { id: 'hormonal_ovulation', label: 'Ovulation', category: 'hormonal' },
  { id: 'weather_pressure', label: 'Pressure changes', category: 'environmental' },
  { id: 'weather_temperature', label: 'Temperature changes', category: 'environmental' },
  { id: 'bright_lights', label: 'Bright lights', category: 'environmental' },
  { id: 'screen_time', label: 'Extended screen time', category: 'environmental' },
  { id: 'loud_noise', label: 'Loud noise', category: 'environmental' },
  { id: 'cheese', label: 'Cheese', category: 'dietary' },
  { id: 'chocolate', label: 'Chocolate', category: 'dietary' },
  { id: 'processed_meats', label: 'Processed meats', category: 'dietary' },
  { id: 'alcohol', label: 'Alcohol', category: 'dietary' },
  { id: 'caffeine_increase', label: 'More caffeine than usual', category: 'dietary' },
  { id: 'caffeine_decrease', label: 'Less caffeine than usual', category: 'dietary' },
  { id: 'physical_exertion', label: 'Intense exercise', category: 'physical' },
  { id: 'travel', label: 'Travel', category: 'physical' },
  { id: 'jet_lag', label: 'Jet lag', category: 'physical' },
  { id: 'other', label: 'Other', category: 'lifestyle' },
];

export function ReportMigraineForm({ onClose, onSuccess }: ReportMigraineFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [onsetDate, setOnsetDate] = useState(new Date());
  const [durationHours, setDurationHours] = useState<number | undefined>();
  const [severity, setSeverity] = useState(5);
  const [auraPresent, setAuraPresent] = useState(false);
  const [auraTypes, setAuraTypes] = useState<AuraType[]>([]);
  const [painCharacter, setPainCharacter] = useState<PainCharacter | undefined>();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [otherTriggerNotes, setOtherTriggerNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [medicationTaken, setMedicationTaken] = useState('');
  const [medicationTiming, setMedicationTiming] = useState<MedicationTiming | undefined>();
  const [reliefLevel, setReliefLevel] = useState<ReliefLevel | undefined>();
  const [impactMissedWork, setImpactMissedWork] = useState(false);
  const [impactHadToRest, setImpactHadToRest] = useState(false);
  const [impactScore, setImpactScore] = useState<number | undefined>();

  const toggleSymptom = (symptomId: Symptom) => {
    setSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const toggleTrigger = (triggerId: Trigger) => {
    setTriggers(prev =>
      prev.includes(triggerId)
        ? prev.filter(t => t !== triggerId)
        : [...prev, triggerId]
    );
  };

  const toggleAuraType = (type: AuraType) => {
    setAuraTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (severity < 0 || severity > 10) {
      alert('Please select a valid severity level (0-10)');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData: MigraineReportFormData = {
        onsetDate,
        durationHours,
        severity,
        auraPresent,
        auraTypes,
        painCharacter,
        symptoms,
        triggers,
        otherTriggerNotes: otherTriggerNotes || undefined,
        notes: notes || undefined,
        medicationTaken: medicationTaken || undefined,
        medicationTiming,
        reliefLevel,
        impactMissedWork,
        impactHadToRest,
        impactScore,
      };

      const migraineService = getMigraineService();
      await migraineService.createReport(formData);

      // Show success state
      setShowSuccess(true);
      
      // Call success callback after a delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to save migraine report:', error);
      alert('Failed to save migraine report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-h1">Report saved</h2>
          <p className="text-body text-muted-foreground">
            Thanks for logging this episode. This data helps improve your migraine predictions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <button
          onClick={onClose}
          className="p-2 transition-colors rounded-lg hover:bg-secondary"
          disabled={isSubmitting}
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-h2">Report migraine</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          
          {/* Episode basics */}
          <section className="space-y-4">
            <h2 className="text-h3">Episode details</h2>
            
            {/* Onset time */}
            <div className="space-y-2">
              <Label>When did it start?</Label>
              <Input
                type="datetime-local"
                value={onsetDate.toISOString().slice(0, 16)}
                onChange={(e) => setOnsetDate(new Date(e.target.value))}
                className="h-12"
                style={{ borderRadius: '8px' }}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration (hours) - optional</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g., 2.5"
                value={durationHours ?? ''}
                onChange={(e) => setDurationHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="h-12"
                style={{ borderRadius: '8px' }}
              />
            </div>

            {/* Severity */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Pain severity</Label>
                <span className="text-h2 text-primary">{severity}</span>
              </div>
              <div className="flex justify-between text-label text-muted-foreground mb-2">
                <span>0 (None)</span>
                <span>10 (Worst)</span>
              </div>
              <Slider
                value={[severity]}
                onValueChange={(val) => setSeverity(val[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>
          </section>

          {/* Aura */}
          <section className="space-y-4">
            <h2 className="text-h3">Aura</h2>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="aura-present"
                checked={auraPresent}
                onChange={(e) => setAuraPresent(e.target.checked)}
                className="w-5 h-5"
              />
              <Label htmlFor="aura-present">I experienced an aura</Label>
            </div>

            {auraPresent && (
              <div className="space-y-2">
                <Label>Type of aura (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {(['visual', 'sensory', 'speech', 'motor'] as AuraType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleAuraType(type)}
                      className={`px-4 py-2 rounded-full border transition-colors ${
                        auraTypes.includes(type)
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-secondary border-border'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Pain character */}
          <section className="space-y-4">
            <h2 className="text-h3">Pain type</h2>
            <Select
              value={painCharacter}
              onValueChange={(val) => setPainCharacter(val as PainCharacter)}
            >
              <SelectTrigger className="h-12" style={{ borderRadius: '8px' }}>
                <SelectValue placeholder="Select pain type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="throbbing">Throbbing</SelectItem>
                <SelectItem value="stabbing">Stabbing</SelectItem>
                <SelectItem value="pressure">Pressure</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </section>

          {/* Symptoms */}
          <section className="space-y-4">
            <h2 className="text-h3">Symptoms {symptoms.length > 0 && `(${symptoms.length})`}</h2>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map((symptom) => (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`px-3 py-2 rounded-full border text-sm transition-colors ${
                    symptoms.includes(symptom.id)
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-secondary border-border'
                  }`}
                >
                  {symptom.label}
                </button>
              ))}
            </div>
          </section>

          {/* Triggers */}
          <section className="space-y-4">
            <h2 className="text-h3">Possible triggers {triggers.length > 0 && `(${triggers.length})`}</h2>
            <p className="text-label text-muted-foreground">
              What happened in the last 24-48 hours?
            </p>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map((trigger) => (
                <button
                  key={trigger.id}
                  onClick={() => toggleTrigger(trigger.id)}
                  className={`px-3 py-2 rounded-full border text-sm transition-colors ${
                    triggers.includes(trigger.id)
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-secondary border-border'
                  }`}
                >
                  {trigger.label}
                </button>
              ))}
            </div>

            {triggers.includes('other') && (
              <div className="space-y-2 pt-2">
                <Label>Describe other triggers</Label>
                <Textarea
                  placeholder="e.g., strong perfume, specific food..."
                  value={otherTriggerNotes}
                  onChange={(e) => setOtherTriggerNotes(e.target.value)}
                  className="min-h-[80px]"
                  style={{ borderRadius: '8px' }}
                />
              </div>
            )}
          </section>

          {/* Medication */}
          <section className="space-y-4">
            <h2 className="text-h3">Medication</h2>
            
            <div className="space-y-2">
              <Label>What did you take?</Label>
              <Input
                placeholder="e.g., Ibuprofen 200mg, Sumatriptan 50mg"
                value={medicationTaken}
                onChange={(e) => setMedicationTaken(e.target.value)}
                className="h-12"
                style={{ borderRadius: '8px' }}
              />
            </div>

            {medicationTaken && (
              <>
                <div className="space-y-2">
                  <Label>When did you take it?</Label>
                  <Select
                    value={medicationTiming}
                    onValueChange={(val) => setMedicationTiming(val as MedicationTiming)}
                  >
                    <SelectTrigger className="h-12" style={{ borderRadius: '8px' }}>
                      <SelectValue placeholder="Select timing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1h">Within 1 hour of onset</SelectItem>
                      <SelectItem value="1-3h">1-3 hours after onset</SelectItem>
                      <SelectItem value="3-6h">3-6 hours after onset</SelectItem>
                      <SelectItem value=">6h">More than 6 hours after</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>How effective was it?</Label>
                  <Select
                    value={reliefLevel}
                    onValueChange={(val) => setReliefLevel(val as ReliefLevel)}
                  >
                    <SelectTrigger className="h-12" style={{ borderRadius: '8px' }}>
                      <SelectValue placeholder="Select relief level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good relief</SelectItem>
                      <SelectItem value="partial">Partial relief</SelectItem>
                      <SelectItem value="none">No relief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </section>

          {/* Impact */}
          <section className="space-y-4">
            <h2 className="text-h3">Impact</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="missed-work"
                  checked={impactMissedWork}
                  onChange={(e) => setImpactMissedWork(e.target.checked)}
                  className="w-5 h-5"
                />
                <Label htmlFor="missed-work">Missed work/school</Label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="had-to-rest"
                  checked={impactHadToRest}
                  onChange={(e) => setImpactHadToRest(e.target.checked)}
                  className="w-5 h-5"
                />
                <Label htmlFor="had-to-rest">Had to lie down/stop activities</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>How disruptive was it?</Label>
                {impactScore !== undefined && (
                  <span className="text-body text-muted-foreground">{impactScore}/10</span>
                )}
              </div>
              <Slider
                value={[impactScore ?? 5]}
                onValueChange={(val) => setImpactScore(val[0])}
                min={0}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-label text-muted-foreground">
                <span>Not at all</span>
                <span>Extremely</span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-4">
            <h2 className="text-h3">Additional notes (optional)</h2>
            <Textarea
              placeholder="Anything else you'd like to remember about this episode..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
              style={{ borderRadius: '8px' }}
            />
          </section>
        </div>
      </div>

      {/* Footer with save button */}
      <div className="border-t border-border p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 gap-2"
            style={{ borderRadius: '12px' }}
          >
            {isSubmitting ? 'Saving...' : 'Save migraine report'}
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
