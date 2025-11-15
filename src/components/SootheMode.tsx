import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

interface SootheModeProps {
  onClose: () => void;
}

export function SootheMode({ onClose }: SootheModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [isRunning, setIsRunning] = useState(true);
  const [isDimmed, setIsDimmed] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeepGoing = () => {
    setTimeRemaining((prev) => prev + 300); // Add 5 more minutes
    setIsRunning(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Dim overlay */}
      {isDimmed && (
        <div className="absolute inset-0 pointer-events-none bg-black/40" />
      )}

      {/* Close button - Fixed at top with higher z-index */}
      <div className="relative z-10 flex justify-end px-6 pt-6">
        <button
          onClick={onClose}
          className="p-2 transition-colors rounded-lg text-foreground hover:text-muted-foreground bg-card/80"
          aria-label="Close soothe mode"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center flex-1 px-6 pb-32">

        {/* Timer display */}
        <div className="mb-12 space-y-8 text-center">
          <h1 className="text-display">{formatTime(timeRemaining)}</h1>
          <p className="max-w-xs text-body text-muted-foreground">
            {timeRemaining === 0
              ? 'Session complete. How are you feeling?'
              : 'Focus on your breath. In through your nose, out through your mouth.'}
          </p>
        </div>

        {/* Breathing visual */}
        <div
          className="flex items-center justify-center w-32 h-32 mb-12 rounded-full bg-primary/20"
          style={{
            animation: isRunning ? 'breathe 4s ease-in-out infinite' : 'none',
          }}
        >
          <div className="w-24 h-24 rounded-full bg-primary/40" />
        </div>

        {/* Actions */}
        <div className="w-full max-w-sm mb-6 space-y-3">
          {timeRemaining === 0 ? (
            <Button
              onClick={onClose}
              className="w-full h-12"
              style={{ borderRadius: '12px' }}
            >
              Back to home
            </Button>
          ) : (
            <>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full h-12"
                style={{ borderRadius: '12px' }}
              >
                End early
              </Button>
              <Button
                onClick={handleKeepGoing}
                className="w-full h-12"
                style={{ borderRadius: '12px' }}
              >
                Keep going
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Settings - Fixed at bottom with proper spacing */}
      <div className="relative z-10 pb-safe">
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center max-w-sm gap-6 mx-auto">
            <button
              onClick={() => setIsDimmed(!isDimmed)}
              className="flex flex-col items-center gap-2 p-2 transition-colors text-muted-foreground hover:text-foreground"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                {isDimmed ? '◐' : '○'}
              </div>
              <span className="text-label">
                {isDimmed ? 'Dimmed' : 'Dim screen'}
              </span>
            </button>
            <button
              onClick={() => setIsSoundOn(!isSoundOn)}
              className="flex flex-col items-center gap-2 p-2 transition-colors text-muted-foreground hover:text-foreground"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <span className="text-label">{isSoundOn ? 'Sound on' : 'Sound off'}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
