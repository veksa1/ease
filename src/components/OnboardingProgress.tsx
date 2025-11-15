import React from 'react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`
            h-1 flex-1 rounded-full transition-all duration-300
            ${i < currentStep 
              ? 'bg-primary' 
              : 'bg-neutral-200 dark:bg-neutral-200/20'
            }
          `}
        />
      ))}
      <span className="text-label text-muted-foreground ml-2">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
}
