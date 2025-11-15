
/**
 * Migraine report data types for ML-friendly storage and analysis
 */

export interface MigraineReport {
  id: string;
  userId?: string; // Optional for future backend sync
  
  // Episode basics
  onsetAt: string; // ISO timestamp
  durationHours?: number;
  
  // Severity (0-10 scale)
  severity: number;
  
  // Aura information
  auraPresent?: boolean;
  auraTypes?: AuraType[];
  
  // Pain characteristics
  painCharacter?: PainCharacter;
  
  // Symptoms (multi-select)
  symptoms: Symptom[];
  
  // Triggers (multi-select)
  triggers: Trigger[];
  otherTriggerNotes?: string;
  
  // Context
  notes?: string;
  
  // Medication
  medicationTaken?: string;
  medicationTiming?: MedicationTiming;
  reliefLevel?: ReliefLevel;
  
  // Impact
  impactMissedWork?: boolean;
  impactHadToRest?: boolean;
  impactScore?: number; // 0-10
  
  // Metadata
  createdAt: string; // ISO timestamp
}

// Enums for ML-friendly categorical values

export type AuraType = 'visual' | 'sensory' | 'speech' | 'motor';

export type PainCharacter = 'throbbing' | 'stabbing' | 'pressure' | 'other';

export type Symptom = 
  | 'nausea'
  | 'vomiting'
  | 'photophobia' // light sensitivity
  | 'phonophobia' // sound sensitivity
  | 'osmophobia'  // smell sensitivity
  | 'dizziness'
  | 'vertigo'
  | 'neck_pain'
  | 'neck_stiffness'
  | 'cognitive_fog'
  | 'difficulty_concentrating';

export type Trigger =
  | 'stress'
  | 'lack_of_sleep'
  | 'oversleeping'
  | 'skipped_meal'
  | 'irregular_eating'
  | 'dehydration'
  | 'hormonal_menstruation'
  | 'hormonal_ovulation'
  | 'weather_pressure'
  | 'weather_temperature'
  | 'bright_lights'
  | 'screen_time'
  | 'loud_noise'
  | 'cheese'
  | 'chocolate'
  | 'processed_meats'
  | 'alcohol'
  | 'caffeine_increase'
  | 'caffeine_decrease'
  | 'physical_exertion'
  | 'travel'
  | 'jet_lag'
  | 'other';

export type MedicationTiming = '0-1h' | '1-3h' | '3-6h' | '>6h';

export type ReliefLevel = 'none' | 'partial' | 'good';

/**
 * Form data structure (before conversion to MigraineReport)
 */
export interface MigraineReportFormData {
  onsetDate: Date;
  durationHours?: number;
  severity: number;
  auraPresent: boolean;
  auraTypes: AuraType[];
  painCharacter?: PainCharacter;
  symptoms: Symptom[];
  triggers: Trigger[];
  otherTriggerNotes?: string;
  notes?: string;
  medicationTaken?: string;
  medicationTiming?: MedicationTiming;
  reliefLevel?: ReliefLevel;
  impactMissedWork: boolean;
  impactHadToRest: boolean;
  impactScore?: number;
}

/**
 * Symptom option for UI
 */
export interface SymptomOption {
  id: Symptom;
  label: string;
  description?: string;
}

/**
 * Trigger option for UI
 */
export interface TriggerOption {
  id: Trigger;
  label: string;
  category: 'lifestyle' | 'environmental' | 'dietary' | 'hormonal' | 'physical';
}
