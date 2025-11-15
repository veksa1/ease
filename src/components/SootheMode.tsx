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
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      )}

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close soothe mode"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Timer display */}
        <div className="text-center space-y-8 mb-12">
          <h1 className="text-display">{formatTime(timeRemaining)}</h1>
          <p className="text-body text-muted-foreground max-w-xs">
            {timeRemaining === 0
              ? 'Session complete. How are you feeling?'
              : 'Focus on your breath. In through your nose, out through your mouth.'}
          </p>
        </div>

        {/* Breathing visual */}
        <div
          className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-12"
          style={{
            animation: isRunning ? 'breathe 4s ease-in-out infinite' : 'none',
          }}
        >
          <div className="w-24 h-24 rounded-full bg-primary/40" />
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

        {/* Settings */}
        <div className="absolute bottom-6 left-0 right-0 px-6">
          <div className="max-w-sm mx-auto flex items-center justify-center gap-6">
            <button
              onClick={() => setIsDimmed(!isDimmed)}
              className="flex flex-col items-center gap-2 p-2 text-muted-foreground hover:text-foreground transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {isDimmed ? '◐' : '○'}
              </div>
              <span className="text-label">
                {isDimmed ? 'Dimmed' : 'Dim screen'}
              </span>
            </button>
            <button
              onClick={() => setIsSoundOn(!isSoundOn)}
              className="flex flex-col items-center gap-2 p-2 text-muted-foreground hover:text-foreground transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
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
