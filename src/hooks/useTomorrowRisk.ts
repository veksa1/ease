/**
 * useTomorrowRisk Hook - Ticket 028
 * 
 * React hook for tomorrow's risk predictions with auto-refresh scheduling
 */

import { useState, useEffect } from 'react';
import { tomorrowPredictionService, type TomorrowPrediction } from '../services/tomorrowPredictionService';

export function useTomorrowRisk(userId: string) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<TomorrowPrediction | null>(null);
  const [shouldNotify, setShouldNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTomorrowRisk = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('[useTomorrowRisk] Fetching tomorrow\'s risk prediction...');
        const data = await tomorrowPredictionService.getTomorrowRisk(userId);
        
        if (data) {
          setPrediction(data);
          setShouldNotify(tomorrowPredictionService.shouldNotify(data));
          console.log('[useTomorrowRisk] Tomorrow\'s risk:', Math.round(data.risk * 100) + '%');
        } else {
          setError('Failed to fetch tomorrow\'s risk');
        }
      } catch (err) {
        console.error('[useTomorrowRisk] Error fetching tomorrow\'s risk:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Fetch once on mount
    fetchTomorrowRisk();

    // Set up daily refresh at random time (7-9am)
    const scheduleNextFetch = () => {
      const nextTime = tomorrowPredictionService.getRandomNotificationTime();
      const now = new Date();
      const delay = nextTime.getTime() - now.getTime();

      if (delay > 0) {
        console.log(`[useTomorrowRisk] ⏰ Scheduling tomorrow's risk fetch for ${nextTime.toLocaleTimeString()}`);
        const timeoutId = setTimeout(() => {
          fetchTomorrowRisk();
          scheduleNextFetch(); // Schedule next day
        }, delay);

        // Cleanup on unmount
        return () => clearTimeout(timeoutId);
      }
    };

    const cleanup = scheduleNextFetch();
    return cleanup;
  }, [userId]);

  return {
    loading,
    prediction,
    shouldNotify,
    error,
  };
}
