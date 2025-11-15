/**
 * Demo Reset Button - Ticket 018
 * 
 * Button for resetting demo data during development.
 * Only visible when VITE_DEMO_MODE is enabled.
 */

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { demoDataService } from '../services/demoDataService';

export function DemoResetButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  // Only show in demo mode
  const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
  if (!isDemoMode) return null;

  const handleReset = () => {
    demoDataService.resetDemo();
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="fixed bottom-20 right-4 p-3 bg-muted border border-border rounded-full shadow-lg hover:bg-muted/80 transition-colors z-50"
        title="Reset demo"
      >
        <RotateCcw className="w-5 h-5" />
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full border border-border">
            <h2 className="text-h2 mb-2">Reset demo?</h2>
            <p className="text-body text-muted-foreground mb-6">
              This will clear all your check-ins, experiments, and timeline data. 
              The demo will restart from the beginning.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                className="flex-1 bg-critical hover:bg-critical/90"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
