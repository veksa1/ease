/**
 * Core type definitions for ease migraine prevention app
 */

export interface RiskVariable {
  name: string;
  percentage: number;
  category: 'biometric' | 'environmental' | 'lifestyle' | 'personal' | 'user-hypothesis';
  value: string;
  unit: string;
}

export interface TriggerCombination {
  id: string;
  triggers: string[]; // Variable names
  label: string; // Human-readable: "High stress + Poor sleep + Weather pressure"
}

export interface InterventionInstruction {
  id: string;
  text: string;
  category: 'immediate' | 'environment' | 'self-care' | 'prevention';
  estimatedMinutes: number;
  targetTriggers: string[]; // Which variables this helps with
  evidenceLevel: 'high' | 'moderate' | 'personal'; // Clinical evidence vs personal data
}

export interface SootheModeSession {
  id: string;
  startedAt: string; // ISO timestamp
  triggerCombination: TriggerCombination;
  instructions: InterventionInstruction[];
  completedInstructionIds: string[];
  durationMinutes: number;
  outcome?: 'prevented' | 'reduced' | 'no-effect' | 'unknown';
  followUpAt?: string; // When to check outcome (2-4 hours later)
}

export interface InterventionEffectiveness {
  instructionId: string;
  triggerCombinationId: string;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  averageEffectiveness: number; // 0-1 score
}

export interface PersonalMigraineProfile {
  migraineHistoryYears: number;
  age: number;
  weightKg?: number;
  bmi?: number;
}

export interface TriggerHypothesis {
  id: string;
  key: string; // canonical id: 'sleep_loss', 'pressure_drop', etc.
  label: string; // user-facing label
  confidence: number; // 0..1 (Not sure→0.25, Possible→0.5, Likely→0.75, Very likely→0.9)
  freqPerMonth?: number;
  threshold?: string; // e.g. "<6h sleep", ">8h screen"
  onsetWindowHours?: number; // typical time to symptom onset
  helps?: string; // what helps
  notes?: string; // freeform
  createdAt: string;
  updatedAt: string;
}
