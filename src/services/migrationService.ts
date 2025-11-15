/**
 * LocalStorage to SQLite Migration Utility
 * 
 * This runs automatically on app startup to migrate existing localStorage data
 * to the new SQLite database.
 */

import { sqliteService } from './sqliteService';

export async function migrateLocalStorageToSQLite(): Promise<void> {
  try {
    // Check if migration has already been done
    const migrated = await sqliteService.getSetting('migration_completed');
    if (migrated === 'true') {
      return; // Already migrated
    }

    console.log('Migrating localStorage to SQLite...');

    // Migrate onboarding status
    const hasSeenOnboarding = localStorage.getItem('ease_has_seen_onboarding');
    if (hasSeenOnboarding) {
      await sqliteService.setSetting('has_seen_onboarding', hasSeenOnboarding);
    }

    // Migrate streak count
    const streakCount = localStorage.getItem('ease_streak_count');
    if (streakCount) {
      await sqliteService.setSetting('streak_count', streakCount);
    }

    // Migrate user timeline
    const timeline = localStorage.getItem('ease_user_timeline');
    if (timeline) {
      try {
        const entries = JSON.parse(timeline) as Array<[string, any[]]>;
        for (const [date, dayEntries] of entries) {
          for (const entry of dayEntries) {
            await sqliteService.addTimelineEntry(
              date,
              entry.type,
              entry.data
            );
          }
        }
      } catch (error) {
        console.error('Failed to migrate timeline:', error);
      }
    }

    // Migrate hydration experiment
    const hydrationExp = localStorage.getItem('ease_experiment_hydration');
    if (hydrationExp) {
      try {
        const days = JSON.parse(hydrationExp) as boolean[];
        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            await sqliteService.setExperimentDay('hydration', i, true);
          }
        }
      } catch (error) {
        console.error('Failed to migrate experiments:', error);
      }
    }

    // Mark migration as complete
    await sqliteService.setSetting('migration_completed', 'true');

    console.log('Migration to SQLite completed successfully!');

    // Optionally clear old localStorage data
    // Uncomment these lines if you want to remove old data after migration
    // localStorage.removeItem('ease_has_seen_onboarding');
    // localStorage.removeItem('ease_streak_count');
    // localStorage.removeItem('ease_user_timeline');
    // localStorage.removeItem('ease_experiment_hydration');
    // localStorage.removeItem('ease_experiments');

  } catch (error) {
    console.error('Migration failed:', error);
    // Don't throw - allow app to continue with fresh database
  }
}
