/**
 * Developer Skip Button - Only visible in development mode
 * Allows quick access to the main app by populating mock data
 */

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from './ui/button';
import { populateMockData } from '../utils/devMockData';

interface DevSkipButtonProps {
  onComplete: () => void;
}

export function DevSkipButton({ onComplete }: DevSkipButtonProps) {
  const [loading, setLoading] = useState(false);

  // Only show in development mode
  const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
  
  if (!isDev) return null;

  const handleDevSkip = async () => {
    setLoading(true);
    try {
      await populateMockData();
      // Call the completion callback instead of reloading
      // This allows React to update state properly
      onComplete();
    } catch (error) {
      console.error('Failed to populate mock data:', error);
      alert('Failed to populate mock data. Check console for details.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        onClick={handleDevSkip}
        disabled={loading}
        variant="outline"
        size="sm"
        className="shadow-lg border-2 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 text-yellow-900"
        title="Developer: Skip onboarding with mock data"
      >
        <Zap className="w-4 h-4 mr-2" />
        {loading ? 'Loading...' : 'Dev Skip'}
      </Button>
    </div>
  );
}
