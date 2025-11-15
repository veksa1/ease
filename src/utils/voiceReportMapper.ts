import type {
  AuraType,
  MigraineReportFormData,
  PainCharacter,
  ReliefLevel,
  Symptom,
  Trigger,
  MedicationTiming,
} from '../types/migraine';

export type VoiceFieldId =
  | 'onsetDate'
  | 'durationHours'
  | 'severity'
  | 'auraPresent'
  | 'auraTypes'
  | 'painCharacter'
  | 'symptoms'
  | 'triggers'
  | 'otherTriggerNotes'
  | 'notes'
  | 'medicationTaken'
  | 'medicationTiming'
  | 'reliefLevel'
  | 'impactMissedWork'
  | 'impactHadToRest'
  | 'impactScore';

export interface VoiceIntakePayload {
  onsetDate?: string | number;
  durationHours?: number | string;
  severity?: number | string;
  auraPresent?: boolean | string;
  auraTypes?: string[];
  painCharacter?: string;
  symptoms?: string[];
  triggers?: string[];
  otherTriggerNotes?: string;
  notes?: string;
  medicationTaken?: string;
  medicationTiming?: string;
  reliefLevel?: string;
  impactMissedWork?: boolean | string;
  impactHadToRest?: boolean | string;
  impactScore?: number | string;
}

export interface VoiceFieldConfig {
  id: VoiceFieldId;
  label: string;
  required: boolean;
  hint?: string;
}

const VALID_SYMPTOMS: Symptom[] = [
  'nausea',
  'vomiting',
  'photophobia',
  'phonophobia',
  'osmophobia',
  'dizziness',
  'vertigo',
  'neck_pain',
  'neck_stiffness',
  'cognitive_fog',
  'difficulty_concentrating',
];

const SYMPTOM_SYNONYMS: Record<string, Symptom> = {
  lightsensitivity: 'photophobia',
  brightsensitivity: 'photophobia',
  soundsensitivity: 'phonophobia',
  noisesensitivity: 'phonophobia',
  smellsensitivity: 'osmophobia',
  brainsfog: 'cognitive_fog',
  brainfog: 'cognitive_fog',
  focushard: 'difficulty_concentrating',
  difficultyfocusing: 'difficulty_concentrating',
};

const VALID_TRIGGERS: Trigger[] = [
  'stress',
  'lack_of_sleep',
  'oversleeping',
  'skipped_meal',
  'irregular_eating',
  'dehydration',
  'hormonal_menstruation',
  'hormonal_ovulation',
  'weather_pressure',
  'weather_temperature',
  'bright_lights',
  'screen_time',
  'loud_noise',
  'cheese',
  'chocolate',
  'processed_meats',
  'alcohol',
  'caffeine_increase',
  'caffeine_decrease',
  'physical_exertion',
  'travel',
  'jet_lag',
  'other',
];

const TRIGGER_SYNONYMS: Record<string, Trigger> = {
  lights: 'bright_lights',
  temperaturechanges: 'weather_temperature',
  pressurechanges: 'weather_pressure',
  screens: 'screen_time',
  loudnoises: 'loud_noise',
  noises: 'loud_noise',
  caffeinewithdrawal: 'caffeine_decrease',
  caffeineexcess: 'caffeine_increase',
  skippedmeal: 'skipped_meal',
  menstruation: 'hormonal_menstruation',
  period: 'hormonal_menstruation',
  ovulation: 'hormonal_ovulation',
};

const VALID_AURA_TYPES: AuraType[] = ['visual', 'sensory', 'speech', 'motor'];
const VALID_PAIN_CHARACTERS: PainCharacter[] = ['throbbing', 'stabbing', 'pressure', 'other'];
const VALID_MEDICATION_TIMINGS: MedicationTiming[] = ['0-1h', '1-3h', '3-6h', '>6h'];
const VALID_RELIEF_LEVELS: ReliefLevel[] = ['none', 'partial', 'good'];

const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(item => `${item}`.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/,|\/|\band\b/gi)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['yes', 'y', 'true', '1', 'present'].includes(normalized)) return true;
    if (['no', 'n', 'false', '0', 'none', 'absent'].includes(normalized)) return false;
  }
  return undefined;
};

const toDate = (value: unknown): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
};

const mapListValues = <T extends string>(
  values: string[],
  validValues: readonly T[],
  synonyms: Record<string, T> = {}
): T[] => {
  const mapped: T[] = [];
  values.forEach(entry => {
    const normalized = normalizeToken(entry);
    const synonymMatch = synonyms[normalized];
    if (synonymMatch) {
      if (!mapped.includes(synonymMatch)) mapped.push(synonymMatch);
      return;
    }
    const direct = validValues.find(
      item => normalizeToken(item) === normalized || normalizeToken(item.replace(/_/g, ' ')) === normalized
    );
    if (direct && !mapped.includes(direct)) {
      mapped.push(direct);
    }
  });
  return mapped;
};

const clampSeverity = (severity?: number) => {
  if (severity === undefined) return undefined;
  return Math.min(10, Math.max(0, severity));
};

const FIELD_NORMALIZERS: Record<
  VoiceFieldId,
  (value: unknown) => Partial<MigraineReportFormData>
> = {
  onsetDate: value => ({ onsetDate: toDate(value) }),
  durationHours: value => ({ durationHours: toNumber(value) }),
  severity: value => {
    const severityValue = clampSeverity(toNumber(value));
    return severityValue !== undefined
      ? { severity: severityValue }
      : {};
  },
  auraPresent: value => {
    const bool = toBoolean(value);
    return bool === undefined ? {} : { auraPresent: bool };
  },
  auraTypes: value => {
    const list = toList(value);
    const parsed = mapListValues(list, VALID_AURA_TYPES);
    return parsed.length ? { auraTypes: parsed } : {};
  },
  painCharacter: value => {
    if (!value) return {};
    const normalized = normalizeToken(`${value}`);
    const match =
      VALID_PAIN_CHARACTERS.find(
        character =>
          normalizeToken(character) === normalized ||
          normalizeToken(character.replace(/_/g, ' ')) === normalized
      ) ?? 'other';
    return { painCharacter: match };
  },
  symptoms: value => {
    const parsed = mapListValues(toList(value), VALID_SYMPTOMS, SYMPTOM_SYNONYMS);
    return parsed.length ? { symptoms: parsed } : {};
  },
  triggers: value => {
    const parsed = mapListValues(toList(value), VALID_TRIGGERS, TRIGGER_SYNONYMS);
    return parsed.length ? { triggers: parsed } : {};
  },
  otherTriggerNotes: value => {
    if (!value) return {};
    const text = `${value}`.trim();
    return text ? { otherTriggerNotes: text } : {};
  },
  notes: value => {
    if (!value) return {};
    const text = `${value}`.trim();
    return text ? { notes: text } : {};
  },
  medicationTaken: value => {
    if (!value && value !== '') return {};
    const text = `${value}`.trim();
    return { medicationTaken: text || 'None' };
  },
  medicationTiming: value => {
    if (!value) return {};
    const normalized = normalizeToken(`${value}`);
    const match = VALID_MEDICATION_TIMINGS.find(
      timing => normalizeToken(timing) === normalized || normalizeToken(timing.replace(/[^a-z0-9]/g, '')) === normalized
    );
    return match ? { medicationTiming: match } : {};
  },
  reliefLevel: value => {
    if (!value) return {};
    const normalized = normalizeToken(`${value}`);
    const match = VALID_RELIEF_LEVELS.find(
      level => normalizeToken(level) === normalized
    );
    return match ? { reliefLevel: match } : {};
  },
  impactMissedWork: value => {
    const bool = toBoolean(value);
    return bool === undefined ? {} : { impactMissedWork: bool };
  },
  impactHadToRest: value => {
    const bool = toBoolean(value);
    return bool === undefined ? {} : { impactHadToRest: bool };
  },
  impactScore: value => {
    const parsed = toNumber(value);
    if (parsed === undefined) return {};
    return { impactScore: Math.max(0, Math.min(10, parsed)) };
  },
};

export const VOICE_FIELD_CONFIG: VoiceFieldConfig[] = [
  { id: 'onsetDate', label: 'Onset time', required: true },
  { id: 'durationHours', label: 'Duration', required: false },
  { id: 'severity', label: 'Pain severity', required: true },
  { id: 'auraPresent', label: 'Aura present', required: true },
  { id: 'auraTypes', label: 'Aura details', required: false },
  { id: 'painCharacter', label: 'Pain character', required: true },
  { id: 'symptoms', label: 'Symptoms', required: true },
  { id: 'triggers', label: 'Triggers', required: true },
  { id: 'otherTriggerNotes', label: 'Other trigger notes', required: false },
  { id: 'notes', label: 'Context notes', required: false },
  { id: 'medicationTaken', label: 'Medication', required: true },
  { id: 'medicationTiming', label: 'Medication timing', required: true },
  { id: 'reliefLevel', label: 'Relief level', required: true },
  { id: 'impactMissedWork', label: 'Missed work', required: true },
  { id: 'impactHadToRest', label: 'Had to rest', required: true },
  { id: 'impactScore', label: 'Impact score', required: true },
];

export const applyVoiceFieldUpdate = (
  current: Partial<MigraineReportFormData>,
  field: VoiceFieldId,
  rawValue: unknown
): Partial<MigraineReportFormData> => {
  const normalizer = FIELD_NORMALIZERS[field];
  if (!normalizer) {
    return current;
  }

  const next = { ...current, ...normalizer(rawValue) };
  return next;
};

export const mapVoicePayloadToFormData = (
  payload: VoiceIntakePayload,
  existing?: Partial<MigraineReportFormData>
): MigraineReportFormData => {
  let result: Partial<MigraineReportFormData> = {
    onsetDate: new Date(),
    severity: 5,
    auraPresent: false,
    auraTypes: [],
    symptoms: [],
    triggers: [],
    impactMissedWork: false,
    impactHadToRest: false,
  };

  if (existing) {
    result = { ...result, ...existing };
  }

  (Object.keys(payload) as VoiceFieldId[]).forEach(field => {
    const value = (payload as Record<string, unknown>)[field];
    if (value === undefined) return;
    result = applyVoiceFieldUpdate(result, field, value);
  });

  return {
    onsetDate: result.onsetDate ?? new Date(),
    durationHours: result.durationHours,
    severity: result.severity ?? 5,
    auraPresent: result.auraPresent ?? false,
    auraTypes: result.auraTypes ?? [],
    painCharacter: result.painCharacter,
    symptoms: result.symptoms ?? [],
    triggers: result.triggers ?? [],
    otherTriggerNotes: result.otherTriggerNotes,
    notes: result.notes,
    medicationTaken: result.medicationTaken,
    medicationTiming: result.medicationTiming,
    reliefLevel: result.reliefLevel,
    impactMissedWork: result.impactMissedWork ?? false,
    impactHadToRest: result.impactHadToRest ?? false,
    impactScore: result.impactScore,
  };
};

const isNil = (value: unknown) =>
  value === undefined || value === null || value === '';

export const getMissingFields = (
  data: Partial<MigraineReportFormData>
): VoiceFieldConfig[] => {
  return VOICE_FIELD_CONFIG.filter(field => {
    if (!field.required) return false;

    if (field.id === 'auraTypes' && data.auraPresent === false) {
      return false;
    }

    if (
      (field.id === 'medicationTiming' || field.id === 'reliefLevel') &&
      (!data.medicationTaken ||
        data.medicationTaken.toLowerCase() === 'none' ||
        data.medicationTaken.toLowerCase() === 'no medication')
    ) {
      return false;
    }

    const value = data[field.id];
    if (field.id === 'symptoms' || field.id === 'triggers' || field.id === 'auraTypes') {
      return !Array.isArray(value) || value.length === 0;
    }
    if (field.id === 'onsetDate') {
      return !(value instanceof Date) || Number.isNaN(value.getTime());
    }
    if (typeof value === 'number') {
      return value === undefined || Number.isNaN(value);
    }
    if (typeof value === 'boolean') {
      return value === undefined;
    }
    return isNil(value);
  });
};

export interface AssistantMetadataResult {
  text: string;
  fieldUpdates: { field: VoiceFieldId; value: unknown }[];
  report?: VoiceIntakePayload;
}

const FIELD_TOKEN = /\[\[FIELD\|([a-zA-Z_]+)\|(.*?)\]\]/g;
const REPORT_TOKEN = /\[\[REPORT\|(.*?)\]\]/g;

const isVoiceFieldId = (value: string): value is VoiceFieldId => {
  return (
    [
      'onsetDate',
      'durationHours',
      'severity',
      'auraPresent',
      'auraTypes',
      'painCharacter',
      'symptoms',
      'triggers',
      'otherTriggerNotes',
      'notes',
      'medicationTaken',
      'medicationTiming',
      'reliefLevel',
      'impactMissedWork',
      'impactHadToRest',
      'impactScore',
    ] as string[]
  ).includes(value);
};

export const extractVoiceAssistantMetadata = (
  raw: string
): AssistantMetadataResult => {
  let text = raw;
  const fieldUpdates: { field: VoiceFieldId; value: unknown }[] = [];
  let report: VoiceIntakePayload | undefined;

  text = text.replace(FIELD_TOKEN, (_match, field, value) => {
    if (isVoiceFieldId(field)) {
      fieldUpdates.push({
        field,
        value: value?.trim(),
      });
    }
    return '';
  });

  text = text.replace(REPORT_TOKEN, (_match, payload) => {
    try {
      report = JSON.parse(payload);
    } catch (error) {
      console.warn('[VoiceAssistant] Unable to parse REPORT payload', error);
    }
    return '';
  });

  return {
    text: text.trim(),
    fieldUpdates,
    report,
  };
};

export const finalizeFormDataFromPartial = (
  data: Partial<MigraineReportFormData>
): MigraineReportFormData => {
  const clamp = (value?: number) => {
    if (typeof value !== 'number') return 5;
    return Math.min(10, Math.max(0, value));
  };

  const ensureArray = <T,>(value?: T[]): T[] => (Array.isArray(value) ? value : []);

  const medicationText = data.medicationTaken?.trim?.() ?? data.medicationTaken ?? undefined;

  return {
    onsetDate: data.onsetDate instanceof Date && !Number.isNaN(data.onsetDate.getTime())
      ? data.onsetDate
      : new Date(),
    durationHours: data.durationHours,
    severity: clamp(data.severity),
    auraPresent: data.auraPresent ?? false,
    auraTypes: ensureArray(data.auraTypes),
    painCharacter: data.painCharacter,
    symptoms: ensureArray(data.symptoms),
    triggers: ensureArray(data.triggers),
    otherTriggerNotes: data.otherTriggerNotes,
    notes: data.notes,
    medicationTaken: medicationText,
    medicationTiming: data.medicationTiming,
    reliefLevel: data.reliefLevel,
    impactMissedWork: data.impactMissedWork ?? false,
    impactHadToRest: data.impactHadToRest ?? false,
    impactScore: typeof data.impactScore === 'number' ? Math.max(0, Math.min(10, data.impactScore)) : undefined,
  };
};
