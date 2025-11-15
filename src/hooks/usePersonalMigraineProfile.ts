import { useState, useEffect } from 'react';
import { PersonalMigraineProfile } from '../types';
import { sqliteService } from '../services/sqliteService';

/**
 * Hook to fetch personal migraine profile from SQLite database
 * Returns the user's personal migraine data for display in risk factors
 */
export function usePersonalMigraineProfile() {
  const [profile, setProfile] = useState<PersonalMigraineProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await sqliteService.getPersonalMigraineProfile();
        setProfile(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load personal migraine profile:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return { profile, loading, error };
}
