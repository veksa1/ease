import { useState, useEffect } from 'react';
import { sqliteService } from '../services/sqliteService';

interface PendingFollowUp {
  id: string;
  triggerLabels: string;
  followUpAt: string;
}

export function useFollowUpReminders() {
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>([]);

  useEffect(() => {
    let isMounted = true;

    const checkFollowUps = async () => {
      try {
        const pending = await sqliteService.getPendingFollowUps();
        if (isMounted) setPendingFollowUps(pending);
      } catch (e) {
        console.error('Failed to fetch pending follow-ups', e);
      }
    };

    // initial fetch and interval polling
    checkFollowUps();
    const interval = setInterval(checkFollowUps, 5 * 60 * 1000); // every 5 minutes

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const recordOutcome = async (
    sessionId: string,
    outcome: 'prevented' | 'reduced' | 'no-effect'
  ) => {
    await sqliteService.updateSessionOutcome(sessionId, outcome);
    setPendingFollowUps(prev => prev.filter(f => f.id !== sessionId));
  };

  return { pendingFollowUps, recordOutcome };
}
