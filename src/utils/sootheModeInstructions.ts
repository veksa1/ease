/**
 * SootheMode Instruction Generation Utility
 * 
 * Analyzes current risk variables to detect trigger combinations
 * and generates personalized intervention instructions based on
 * evidence-based recommendations and historical effectiveness data.
 */

import { RiskVariable, TriggerCombination, InterventionInstruction, InterventionEffectiveness } from '../types';

/**
 * Threshold for considering a risk variable as a "trigger"
 * Variables contributing >= 15% to total risk are flagged
 */
const TRIGGER_THRESHOLD = 15;

/**
 * Detect trigger combination from current risk variables
 */
export function detectTriggerCombination(
  riskVariables: RiskVariable[],
  riskPercentage: number
): TriggerCombination {
  // Filter high-impact variables
  const topTriggers = riskVariables
    .filter(v => v.percentage >= TRIGGER_THRESHOLD)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3); // Top 3 triggers
  
  const triggerNames = topTriggers.map(t => t.name);
  const label = topTriggers.map(t => {
    // Create human-readable labels
    if (t.name === 'Sleep Quality' && parseFloat(t.value) < 6) return 'Poor sleep';
    if (t.name === 'Stress Level' && parseFloat(t.value) >= 7) return 'High stress';
    if (t.name === 'Barometric Pressure Change') return 'Weather pressure drop';
    if (t.name === 'Menstrual Phase' && t.value === 'Premenstrual') return 'Premenstrual phase';
    if (t.name === 'Screen Time' && parseFloat(t.value) > 8) return 'High screen time';
    if (t.name === 'HRV' && parseFloat(t.value) < 50) return 'Low HRV';
    if (t.name === 'Prodrome Symptoms') return 'Prodrome symptoms present';
    return t.name;
  }).join(' + ');
  
  return {
    id: triggerNames.sort().join('_').toLowerCase().replace(/\s+/g, '_'),
    triggers: triggerNames,
    label,
  };
}

/**
 * Intervention library with evidence-based recommendations
 */
const INTERVENTION_LIBRARY: Record<string, InterventionInstruction[]> = {
  // Stress-related interventions
  'stress': [
    {
      id: 'deep_breathing',
      text: 'Practice 4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s (repeat 4 times)',
      category: 'immediate',
      estimatedMinutes: 2,
      targetTriggers: ['Stress Level', 'HRV'],
      evidenceLevel: 'high',
    },
    {
      id: 'progressive_relaxation',
      text: 'Tense and release each muscle group from toes to head',
      category: 'immediate',
      estimatedMinutes: 5,
      targetTriggers: ['Stress Level'],
      evidenceLevel: 'high',
    },
  ],
  
  // Sleep-related interventions
  'sleep': [
    {
      id: 'avoid_caffeine',
      text: 'Skip caffeine for the rest of the day',
      category: 'prevention',
      estimatedMinutes: 0,
      targetTriggers: ['Sleep Quality', 'Caffeine Intake change'],
      evidenceLevel: 'high',
    },
    {
      id: 'schedule_nap',
      text: 'Take a 20-minute power nap (set alarm)',
      category: 'self-care',
      estimatedMinutes: 20,
      targetTriggers: ['Sleep Quality', 'Sleep Duration'],
      evidenceLevel: 'moderate',
    },
    {
      id: 'sleep_tonight',
      text: 'Commit to 8+ hours of sleep tonight - set bedtime alarm for 10pm',
      category: 'prevention',
      estimatedMinutes: 1,
      targetTriggers: ['Sleep Duration'],
      evidenceLevel: 'high',
    },
  ],
  
  // Weather/pressure interventions
  'weather': [
    {
      id: 'hydrate',
      text: 'Drink 16oz of water right now',
      category: 'immediate',
      estimatedMinutes: 2,
      targetTriggers: ['Barometric Pressure Change', 'Water Intake'],
      evidenceLevel: 'moderate',
    },
    {
      id: 'stay_indoors',
      text: 'Stay indoors in controlled temperature until pressure stabilizes',
      category: 'environment',
      estimatedMinutes: 0,
      targetTriggers: ['Barometric Pressure Change', 'Weather Changes'],
      evidenceLevel: 'moderate',
    },
  ],
  
  // Screen time interventions
  'screen': [
    {
      id: 'screen_break',
      text: 'Take a 15-minute screen break - go outside or close your eyes',
      category: 'immediate',
      estimatedMinutes: 15,
      targetTriggers: ['Screen Time'],
      evidenceLevel: 'high',
    },
    {
      id: 'blue_light',
      text: 'Enable blue light filter on all devices',
      category: 'environment',
      estimatedMinutes: 2,
      targetTriggers: ['Screen Time'],
      evidenceLevel: 'moderate',
    },
    {
      id: 'eye_exercises',
      text: '20-20-20 rule: Every 20 min, look 20 feet away for 20 seconds',
      category: 'prevention',
      estimatedMinutes: 0,
      targetTriggers: ['Screen Time'],
      evidenceLevel: 'high',
    },
  ],
  
  // Menstrual/hormonal interventions
  'menstrual': [
    {
      id: 'magnesium',
      text: 'Take magnesium supplement (if prescribed)',
      category: 'self-care',
      estimatedMinutes: 1,
      targetTriggers: ['Menstrual Phase'],
      evidenceLevel: 'moderate',
    },
    {
      id: 'gentle_exercise',
      text: 'Do 10 minutes of gentle stretching or yoga',
      category: 'self-care',
      estimatedMinutes: 10,
      targetTriggers: ['Menstrual Phase'],
      evidenceLevel: 'moderate',
    },
  ],
  
  // HRV interventions
  'hrv': [
    {
      id: 'coherent_breathing',
      text: 'Breathe at 5-6 breaths per minute for 5 minutes',
      category: 'immediate',
      estimatedMinutes: 5,
      targetTriggers: ['HRV', 'Stress Level'],
      evidenceLevel: 'high',
    },
  ],
  
  // General prevention
  'general': [
    {
      id: 'dark_quiet',
      text: 'Move to a dark, quiet room for the next hour',
      category: 'environment',
      estimatedMinutes: 1,
      targetTriggers: ['Prodrome Symptoms'],
      evidenceLevel: 'high',
    },
    {
      id: 'regular_meal',
      text: 'Eat a balanced meal if you skipped one',
      category: 'self-care',
      estimatedMinutes: 15,
      targetTriggers: ['Meal Regularity'],
      evidenceLevel: 'high',
    },
    {
      id: 'cold_compress',
      text: 'Apply a cold compress to your forehead for 15 minutes',
      category: 'immediate',
      estimatedMinutes: 15,
      targetTriggers: ['Prodrome Symptoms'],
      evidenceLevel: 'high',
    },
  ],
};

/**
 * Generate personalized instructions based on triggers and historical data
 */
export function generateInstructions(
  triggerCombination: TriggerCombination,
  historicalData: InterventionEffectiveness[]
): InterventionInstruction[] {
  const instructions: InterventionInstruction[] = [];
  const seenIds = new Set<string>();
  
  // Map triggers to intervention categories
  const categoryMap: Record<string, string> = {
    'Stress Level': 'stress',
    'HRV': 'hrv',
    'Sleep Quality': 'sleep',
    'Sleep Duration': 'sleep',
    'Barometric Pressure Change': 'weather',
    'Weather Changes': 'weather',
    'Screen Time': 'screen',
    'Menstrual Phase': 'menstrual',
  };
  
  // Collect relevant interventions for each trigger
  triggerCombination.triggers.forEach(trigger => {
    const category = categoryMap[trigger];
    if (category && INTERVENTION_LIBRARY[category]) {
      INTERVENTION_LIBRARY[category].forEach(instruction => {
        if (!seenIds.has(instruction.id) && 
            instruction.targetTriggers.some(t => triggerCombination.triggers.includes(t))) {
          instructions.push(instruction);
          seenIds.add(instruction.id);
        }
      });
    }
  });
  
  // Add general interventions
  INTERVENTION_LIBRARY.general.forEach(instruction => {
    if (!seenIds.has(instruction.id) && 
        instruction.targetTriggers.some(t => triggerCombination.triggers.includes(t))) {
      instructions.push(instruction);
      seenIds.add(instruction.id);
    }
  });
  
  // Sort by historical effectiveness if available
  if (historicalData.length > 0) {
    const effectivenessMap = new Map(
      historicalData
        .filter(h => h.triggerCombinationId === triggerCombination.id)
        .map(h => [h.instructionId, h.averageEffectiveness])
    );
    
    instructions.sort((a, b) => {
      const aScore = effectivenessMap.get(a.id) ?? 0.5;
      const bScore = effectivenessMap.get(b.id) ?? 0.5;
      return bScore - aScore;
    });
  } else {
    // Default sort: immediate > self-care > environment > prevention
    const categoryOrder = { immediate: 0, 'self-care': 1, environment: 2, prevention: 3 };
    instructions.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
  }
  
  // Limit to 5-7 most relevant instructions
  return instructions.slice(0, 6);
}
