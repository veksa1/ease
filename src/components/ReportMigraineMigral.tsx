import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  Volume2,
  Droplets,
  Flame,
  Coffee,
  Zap,
  Pill,
  Clock,
  Mic,
  Save,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PillChip } from './PillChip';

interface ReportMigraineModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReportMigraineModal({
  trigger,
  open,
  onOpenChange,
}: ReportMigraineModalProps) {
  const [attackType, setAttackType] = useState<'full' | 'aura' | null>(null);
  const [painIntensity, setPainIntensity] = useState([5]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [medication, setMedication] = useState('');
  const [dose, setDose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const symptoms = [
    { id: 'nausea', label: 'Nausea', icon: AlertCircle },
    { id: 'light', label: 'Light sensitivity', icon: Eye },
    { id: 'sound', label: 'Sound sensitivity', icon: Volume2 },
    { id: 'aura', label: 'Aura', icon: Zap },
  ];

  const triggers = [
    { id: 'stress', label: 'Stress', icon: AlertCircle },
    { id: 'dehydration', label: 'Dehydration', icon: Droplets },
    { id: 'heat', label: 'Heat', icon: Flame },
    { id: 'skipped-meal', label: 'Skipped meal', icon: Coffee },
  ];

  const medications = [
    'Ibuprofen',
    'Acetaminophen',
    'Sumatriptan',
    'Rizatriptan',
    'Aspirin',
    'Naproxen',
    'Other',
  ];

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((id) => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const toggleTrigger = (triggerId: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(triggerId)
        ? prev.filter((id) => id !== triggerId)
        : [...prev, triggerId]
    );
  };

  const handleSave = () => {
    const report = {
      attackType,
      painIntensity: painIntensity[0],
      symptoms: selectedSymptoms,
      triggers: selectedTriggers,
      medication,
      dose,
      startTime,
      duration,
    };
    console.log('Migraine report:', report);
    alert('Migraine report saved successfully');
    onOpenChange?.(false);
  };

  const handleVoiceNote = () => {
    setIsRecording(!isRecording);
    alert(isRecording ? 'Voice recording stopped' : 'Voice recording started');
  };

  const resetForm = () => {
    setAttackType(null);
    setPainIntensity([5]);
    setSelectedSymptoms([]);
    setSelectedTriggers([]);
    setMedication('');
    setDose('');
    setStartTime('');
    setDuration('');
    setIsRecording(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
        }
        onOpenChange?.(isOpen);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto p-6"
        style={{ borderRadius: '12px' }}
      >
        <DialogHeader className="space-y-2 mb-4">
          <DialogTitle className="text-h2">Report migraine</DialogTitle>
          <DialogDescription className="text-label">
            Tracking your migraines helps improve predictions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Attack Type Selection */}
          {!attackType ? (
            <div className="space-y-3">
              <Button
                onClick={() => setAttackType('full')}
                className="w-full h-16 text-h3 rounded-lg"
                style={{ borderRadius: '8px' }}
              >
                <AlertCircle className="w-6 h-6" />
                Start of attack
              </Button>
              <Button
                onClick={() => setAttackType('aura')}
                variant="outline"
                className="w-full h-14 text-body rounded-lg"
                style={{ borderRadius: '8px' }}
              >
                <Zap className="w-5 h-5" />
                Aura only
              </Button>
            </div>
          ) : (
            <>
              {/* Attack Type Confirmation */}
              <div
                className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                style={{ borderRadius: '12px' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {attackType === 'full' ? (
                      <AlertCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Zap className="w-5 h-5 text-primary" />
                    )}
                    <span className="text-body">
                      {attackType === 'full' ? 'Full attack' : 'Aura only'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttackType(null)}
                    className="text-label"
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Optional Details Accordion */}
              <Accordion type="multiple" className="space-y-2">
                {/* Pain Intensity */}
                <AccordionItem
                  value="pain"
                  className="border rounded-xl px-4"
                  style={{ borderRadius: '12px' }}
                >
                  <AccordionTrigger className="text-body hover:no-underline py-4">
                    Pain intensity
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-label text-muted-foreground">0 (None)</span>
                        <span className="text-h3 text-primary">{painIntensity[0]}</span>
                        <span className="text-label text-muted-foreground">
                          10 (Worst)
                        </span>
                      </div>
                      <Slider
                        value={painIntensity}
                        onValueChange={setPainIntensity}
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Symptoms */}
                <AccordionItem
                  value="symptoms"
                  className="border rounded-xl px-4"
                  style={{ borderRadius: '12px' }}
                >
                  <AccordionTrigger className="text-body hover:no-underline py-4">
                    Symptoms {selectedSymptoms.length > 0 && `(${selectedSymptoms.length})`}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="flex flex-wrap gap-2">
                      {symptoms.map((symptom) => {
                        const isSelected = selectedSymptoms.includes(symptom.id);
                        return (
                          <button
                            key={symptom.id}
                            onClick={() => toggleSymptom(symptom.id)}
                            className="transition-transform active:scale-95"
                          >
                            <div
                              className={`
                                inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-label
                                transition-colors duration-200 border
                                ${
                                  isSelected
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'bg-secondary text-secondary-foreground border-border'
                                }
                              `}
                            >
                              <symptom.icon className="w-4 h-4" />
                              <span>{symptom.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Triggers */}
                <AccordionItem
                  value="triggers"
                  className="border rounded-xl px-4"
                  style={{ borderRadius: '12px' }}
                >
                  <AccordionTrigger className="text-body hover:no-underline py-4">
                    Triggers {selectedTriggers.length > 0 && `(${selectedTriggers.length})`}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="flex flex-wrap gap-2">
                      {triggers.map((trigger) => {
                        const isSelected = selectedTriggers.includes(trigger.id);
                        return (
                          <button
                            key={trigger.id}
                            onClick={() => toggleTrigger(trigger.id)}
                            className="transition-transform active:scale-95"
                          >
                            <div
                              className={`
                                inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-label
                                transition-colors duration-200 border
                                ${
                                  isSelected
                                    ? 'bg-warning/10 text-warning border-warning/20'
                                    : 'bg-secondary text-secondary-foreground border-border'
                                }
                              `}
                            >
                              <trigger.icon className="w-4 h-4" />
                              <span>{trigger.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Medication */}
                <AccordionItem
                  value="medication"
                  className="border rounded-xl px-4"
                  style={{ borderRadius: '12px' }}
                >
                  <AccordionTrigger className="text-body hover:no-underline py-4">
                    Medication taken
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="medication" className="text-label">
                        Medication
                      </Label>
                      <Select value={medication} onValueChange={setMedication}>
                        <SelectTrigger
                          id="medication"
                          className="h-12 rounded-lg"
                          style={{ borderRadius: '8px' }}
                        >
                          <SelectValue placeholder="Select medication" />
                        </SelectTrigger>
                        <SelectContent>
                          {medications.map((med) => (
                            <SelectItem key={med} value={med}>
                              {med}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dose" className="text-label">
                        Dose
                      </Label>
                      <Input
                        id="dose"
                        placeholder="e.g., 200mg"
                        value={dose}
                        onChange={(e) => setDose(e.target.value)}
                        className="h-12 rounded-lg"
                        style={{ borderRadius: '8px' }}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Time & Duration */}
                <AccordionItem
                  value="time"
                  className="border rounded-xl px-4"
                  style={{ borderRadius: '12px' }}
                >
                  <AccordionTrigger className="text-body hover:no-underline py-4">
                    Start time & duration
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-label">
                        Start time
                      </Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-12 rounded-lg"
                        style={{ borderRadius: '8px' }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-label">
                        Duration (hours)
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="e.g., 2.5"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="h-12 rounded-lg"
                        style={{ borderRadius: '8px' }}
                        step="0.5"
                        min="0"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Voice Note Button */}
              <Button
                variant="outline"
                onClick={handleVoiceNote}
                className={`w-full h-12 rounded-lg gap-2 ${
                  isRecording ? 'border-critical text-critical' : ''
                }`}
                style={{ borderRadius: '8px' }}
              >
                <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording ? 'Stop recording' : "I can't type—voice note"}
              </Button>

              {/* Save CTA */}
              <Button
                onClick={handleSave}
                className="w-full h-14 rounded-lg gap-2"
                style={{ borderRadius: '8px' }}
              >
                <Save className="w-5 h-5" />
                Save migraine report
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
