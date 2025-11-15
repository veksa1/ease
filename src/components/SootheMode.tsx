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
      <div className="relative flex flex-col items-center justify-center flex-1 px-6 pb-8">

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

        {/* Settings - Moved above action buttons */}
        <div className="w-full max-w-sm mb-8">
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={() => setIsDimmed(!isDimmed)}
              className="flex flex-col items-center gap-2 p-2 transition-colors text-muted-foreground hover:text-foreground"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <span className="text-lg">{isDimmed ? '◐' : '○'}</span>
              </div>
              <span className="text-xs">
                {isDimmed ? 'Dimmed' : 'Dim screen'}
              </span>
            </button>
            <button
              onClick={() => setIsSoundOn(!isSoundOn)}
              className="flex flex-col items-center gap-2 p-2 transition-colors text-muted-foreground hover:text-foreground"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                {isSoundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <span className="text-xs">{isSoundOn ? 'Sound on' : 'Sound off'}</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full max-w-sm space-y-3">
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

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
