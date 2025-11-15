import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { RiskVariable, TriggerCombination, InterventionInstruction } from '../types';
import { detectTriggerCombination, generateInstructions } from '../utils/sootheModeInstructions';
import { sqliteService } from '../services/sqliteService';

interface SootheModeProps {
  onClose: () => void;
  riskVariables: RiskVariable[];
  riskPercentage: number;
}

export function SootheMode({ onClose, riskVariables, riskPercentage }: SootheModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [isRunning, setIsRunning] = useState(true);
  const [isDimmed, setIsDimmed] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [instructions, setInstructions] = useState<InterventionInstruction[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [triggerCombination, setTriggerCombination] = useState<TriggerCombination | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [showWhyExpanded, setShowWhyExpanded] = useState(false);

  // Load personalized instructions on mount
  useEffect(() => {
    async function loadInstructions() {
      try {
        const historicalData = await sqliteService.getInterventionEffectiveness();
        
        const triggers = detectTriggerCombination(riskVariables, riskPercentage);
        const personalizedInstructions = generateInstructions(triggers, historicalData);
        
        setTriggerCombination(triggers);
        setInstructions(personalizedInstructions);
      } catch (error) {
        console.error('Failed to load instructions:', error);
      }
    }
    
    loadInstructions();
  }, [riskVariables, riskPercentage]);

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

  const handleClose = async () => {
    // Save session data
    try {
      if (triggerCombination) {
        await sqliteService.saveSootheModeSession({
          id: sessionId,
          startedAt: new Date().toISOString(),
          triggerCombination,
          instructions,
          completedInstructionIds: Array.from(completedIds),
          durationMinutes: (300 - timeRemaining) / 60,
        });
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
    
    onClose();
  };

  const toggleInstruction = (instructionId: string) => {
    const newCompleted = new Set(completedIds);
    if (newCompleted.has(instructionId)) {
      newCompleted.delete(instructionId);
    } else {
      newCompleted.add(instructionId);
    }
    setCompletedIds(newCompleted);
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
          onClick={handleClose}
          className="p-2 transition-colors rounded-lg text-foreground hover:text-muted-foreground bg-card/80"
          aria-label="Close soothe mode"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center flex-1 px-6 pb-8 pt-6 overflow-y-auto">

        {/* Personalized Instructions Section */}
        {triggerCombination && instructions.length > 0 && (
          <div className="w-full max-w-md mb-8 space-y-4">
            {/* Trigger Context */}
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
              <p className="text-sm text-muted-foreground mb-1">Based on your current triggers:</p>
              <p className="text-body font-medium">{triggerCombination.label}</p>
            </div>
            
            {/* Instructions Checklist */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <h3 className="text-h3 mb-3">Prevention Checklist</h3>
              {instructions.map((instruction) => (
                <label
                  key={instruction.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={completedIds.has(instruction.id)}
                    onChange={() => toggleInstruction(instruction.id)}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-primary text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex-1">
                    <p className={`text-body ${completedIds.has(instruction.id) ? 'line-through text-muted-foreground' : ''}`}>
                      {instruction.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{instruction.estimatedMinutes} min · {instruction.category}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            
            {/* Why These Steps? Expandable */}
            <button
              onClick={() => setShowWhyExpanded(!showWhyExpanded)}
              className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Why these steps?</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showWhyExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            
            {showWhyExpanded && (
              <div className="p-4 rounded-lg bg-muted/30 space-y-2 text-body-sm text-muted-foreground">
                <p>These interventions have been effective for similar trigger patterns:</p>
                <ul className="space-y-1 ml-4">
                  {instructions.map((inst) => (
                    <li key={inst.id} className="list-disc">
                      {inst.text} - {inst.evidenceLevel === 'high' ? '✓ Clinical evidence' : inst.evidenceLevel === 'moderate' ? '✓ Moderate evidence' : '✓ Works for you'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="w-full max-w-sm space-y-3">
          <Button
            onClick={handleClose}
            className="w-full h-12"
            style={{ borderRadius: '12px' }}
          >
            Done
          </Button>
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
