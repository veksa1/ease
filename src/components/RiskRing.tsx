import React from 'react';

interface RiskRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function RiskRing({ 
  percentage, 
  size = 120, 
  strokeWidth = 12,
  label 
}: RiskRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 75) return '#D6455D';
    if (percentage >= 50) return '#E3A008';
    if (percentage >= 25) return '#2CB1B5';
    return '#22A699';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-neutral-200 dark:text-neutral-200/20"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-h2">{percentage}%</span>
        </div>
      </div>
      {label && (
        <span className="text-label text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
