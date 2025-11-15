/**
 * Centralized strings for trigger hypothesis UI
 * Prepared for future i18n integration
 */

export const TRIGGER_STRINGS = {
  sectionTitle: 'Suspected Migraine Triggers',
  sectionDescription: 'Select up to 5 triggers you suspect might cause your migraines. You can add details about each one.',
  selectedCounter: (count: number, max: number) => `Selected: ${count} / ${max}`,
  maxReachedWarning: 'Maximum 5 triggers can be selected',
  
  // Predefined trigger labels
  triggers: {
    sleep_loss: 'Sleep Loss',
    pressure_drop: 'Pressure Drop',
    dehydration: 'Dehydration',
    screen_time: 'Screen Time',
    stress_overload: 'Stress Overload',
    skipped_meal: 'Skipped Meal',
    humidity_spike: 'Humidity Spike',
    temperature_swing: 'Temperature Swing',
    poor_air_quality: 'Poor Air Quality',
    bright_light: 'Bright Light',
    loud_noise: 'Loud Noise',
    strong_odor: 'Strong Odor',
    travel_jetlag: 'Travel/Jetlag',
    alcohol: 'Alcohol',
    caffeine_change: 'Caffeine Change',
  } as const,
  
  // Field labels
  confidenceLabel: 'How confident are you?',
  confidenceOptions: [
    { value: 0.25, label: 'Not sure' },
    { value: 0.5, label: 'Possible' },
    { value: 0.75, label: 'Likely' },
    { value: 0.9, label: 'Very likely' },
  ],
  
  frequencyLabel: 'How often per month?',
  frequencyPlaceholder: 'e.g., 2-3 times',
  
  thresholdLabel: 'What triggers it?',
  thresholdPlaceholder: 'e.g., <6h sleep, >8h screen time',
  
  onsetWindowLabel: 'Time to symptoms (hours)',
  onsetWindowPlaceholder: 'e.g., 2-4 hours',
  
  helpsLabel: 'What helps?',
  helpsPlaceholder: 'e.g., rest, water, medication',
  
  notesLabel: 'Additional notes',
  notesPlaceholder: 'Any other observations...',
  
  removeButton: 'Remove',
  expandButton: 'Add details',
  collapseButton: 'Hide details',
  
  // Validation messages
  validation: {
    confidenceRequired: 'Please select your confidence level',
    frequencyNegative: 'Frequency must be 0 or greater',
    onsetNegative: 'Onset time must be 0 or greater',
  },
};

export type TriggerKey = keyof typeof TRIGGER_STRINGS.triggers;

export const PREDEFINED_TRIGGERS: TriggerKey[] = [
  'sleep_loss',
  'pressure_drop',
  'dehydration',
  'screen_time',
  'stress_overload',
  'skipped_meal',
  'humidity_spike',
  'temperature_swing',
  'poor_air_quality',
  'bright_light',
  'loud_noise',
  'strong_odor',
  'travel_jetlag',
  'alcohol',
  'caffeine_change',
];
