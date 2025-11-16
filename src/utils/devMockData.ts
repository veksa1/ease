/**
 * Developer utility to populate database with mock data
 * This allows developers to quickly skip onboarding and test the app
 */

import { sqliteService } from '../services/sqliteService';
import type { PersonalMigraineProfile } from '../types';

export async function populateMockData(): Promise<void> {
  console.log('🔧 Populating mock data for development...');

  try {
    // 1. Set onboarding as complete
    await sqliteService.setSetting('has_seen_onboarding', 'true');
    console.log('✅ Onboarding completed');

    // 2. Set streak count
    await sqliteService.setSetting('streak_count', '7');
    console.log('✅ Streak count set to 7');

    // 3. Add personal migraine profile
    const mockProfile: PersonalMigraineProfile = {
      migraineHistoryYears: 5,
      age: 32,
      weightKg: 70,
      bmi: 22.5,
    };
    await sqliteService.savePersonalMigraineProfile(mockProfile);
    console.log('✅ Personal migraine profile saved');

    // 4. Add sample trigger hypotheses
    const mockTriggers = [
      {
        id: 'trigger_sleep_loss_1',
        key: 'sleep_loss',
        label: 'Sleep Loss',
        confidence: 0.75,
        freqPerMonth: 4,
        threshold: '<6 hours',
        onsetWindowHours: 2,
        helps: 'Rest in dark room',
        notes: 'Usually happens after late nights working',
      },
      {
        id: 'trigger_stress_overload_1',
        key: 'stress_overload',
        label: 'Stress Overload',
        confidence: 0.9,
        freqPerMonth: 6,
        threshold: 'High workload',
        onsetWindowHours: 4,
        helps: 'Meditation, breathing exercises',
        notes: 'Especially during project deadlines',
      },
      {
        id: 'trigger_screen_time_1',
        key: 'screen_time',
        label: 'Screen Time',
        confidence: 0.5,
        freqPerMonth: 3,
        threshold: '>8 hours',
        onsetWindowHours: 1,
        helps: 'Take breaks, reduce brightness',
        notes: 'Worse with bright screens',
      },
    ];

    for (const trigger of mockTriggers) {
      await sqliteService.saveTriggerHypothesis(trigger);
    }
    console.log('✅ Sample trigger hypotheses added (3)');

    // 5. Add sample timeline entries for the last 3 days
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString();

      // Morning check-in
      await sqliteService.addTimelineEntry(
        dateStr,
        'check-in',
        {
          time: 'morning',
          sleep: 7 + Math.random(),
          mood: 4,
          symptoms: i === 0 ? ['neck-tension'] : [],
        }
      );

      // Evening check-in
      await sqliteService.addTimelineEntry(
        dateStr,
        'check-in',
        {
          time: 'evening',
          stress: 3 + Math.random() * 2,
          screenTime: 6 + Math.random() * 3,
        }
      );
    }
    console.log('✅ Sample timeline entries added (last 3 days)');

    // 6. Add experiment tracking
    await sqliteService.setExperimentDay('magnesium', 0, true);
    await sqliteService.setExperimentDay('magnesium', 1, true);
    await sqliteService.setExperimentDay('magnesium', 2, true);
    await sqliteService.setExperimentDay('magnesium', 3, true);
    console.log('✅ Sample experiment tracking added');

    // 7. Set consent settings
    await sqliteService.setSetting('consent_hrv', 'true');
    await sqliteService.setSetting('consent_calendar', 'true');
    await sqliteService.setSetting('consent_weather', 'true');
    console.log('✅ Consent settings configured');

    // 8. Set device connection status
    await sqliteService.setSetting('device_apple_health', 'true');
    await sqliteService.setSetting('device_garmin', 'true');
    console.log('✅ Device connections configured');

    console.log('🎉 Mock data populated successfully!');
    console.log('👉 Reloading app...');
  } catch (error) {
    console.error('❌ Failed to populate mock data:', error);
    throw error;
  }
}

/**
 * Clear all data (for testing)
 */
export async function clearAllData(): Promise<void> {
  console.log('🧹 Clearing all data...');

  try {
    await sqliteService.resetDatabase();
    await sqliteService.setSetting('has_seen_onboarding', 'false');
    
    // Clear trigger hypotheses
    const hypotheses = await sqliteService.getTriggerHypotheses();
    for (const h of hypotheses) {
      await sqliteService.deleteTriggerHypothesis(h.id);
    }

    console.log('✅ All data cleared');
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    throw error;
  }
}
