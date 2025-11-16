import React, { useEffect, useRef, useState } from 'react';

interface GradientRiskGaugeProps {
  percentage: number;
  riskLevel: 'low' | 'moderate' | 'high';
  size?: number;
  strokeWidth?: number;
  showConfidence?: boolean;
  confidence?: number;
  lowStimulationMode?: boolean;
}

export function GradientRiskGauge({
  percentage,
  riskLevel,
  size = 160,
  strokeWidth = 14,
  showConfidence = false,
  confidence = 85,
  lowStimulationMode = false,
}: GradientRiskGaugeProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const animationFrameRef = useRef<number>();
  const mountedRef = useRef(false);
  const displayValueRef = useRef(0);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startValue = mountedRef.current ? displayValueRef.current : 0;
    const targetValue = percentage;
    const duration = 800;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const nextValue = startValue + (targetValue - startValue) * eased;
      displayValueRef.current = nextValue;
      setDisplayPercentage(nextValue);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    mountedRef.current = true;
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [percentage]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayPercentage / 100) * circumference;

  // Calculate dot position
  const angle = (displayPercentage / 100) * 360 - 90; // Start from top
  const dotX = size / 2 + radius * Math.cos((angle * Math.PI) / 180);
  const dotY = size / 2 + radius * Math.sin((angle * Math.PI) / 180);

  // Get gradient colors based on risk level
  const getGradientStops = () => {
    if (percentage <= 33) {
      return {
        start: '#8FBB5C', // success
        end: '#A0CC6F',
        dotColor: '#8FBB5C',
      };
    } else if (percentage <= 66) {
      return {
        start: '#FFB366', // accent/warning
        mid: '#FF9685',
        end: '#FF7B66', // primary
        dotColor: '#FF7B66',
      };
    } else {
      return {
        start: '#FFB366',
        mid: '#FF9685',
        end: '#FF9AA6', // soft critical
        dotColor: '#FF9AA6',
      };
    }
  };

  const gradientStops = getGradientStops();
  const gradientId = `risk-gradient-${riskLevel}-${Math.round(displayPercentage)}`;

  const getRiskLabelColor = () => {
    if (riskLevel === 'low') return 'text-success';
    if (riskLevel === 'moderate') return 'text-primary';
    return 'text-warning';
  };

  const getDotColor = () => {
    if (riskLevel === 'low') return '#8FBB5C';
    if (riskLevel === 'moderate') return '#FF7B66';
    return '#FF9AA6';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Define gradient */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientStops.start} />
              {gradientStops.mid && (
                <stop offset="50%" stopColor={gradientStops.mid} />
              )}
              <stop offset="100%" stopColor={gradientStops.end} />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-neutral-200/40 dark:text-neutral-700/40"
          />

          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>

        {/* End-cap dot */}
        {displayPercentage > 0 && (
          <div
            className="absolute rounded-full"
            style={{
              width: `${strokeWidth + 2}px`,
              height: `${strokeWidth + 2}px`,
              left: `${dotX - (strokeWidth + 2) / 2}px`,
              top: `${dotY - (strokeWidth + 2) / 2}px`,
              backgroundColor: getDotColor(),
              boxShadow: `0 0 8px ${getDotColor()}40`,
            }}
          />
        )}

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-display">{Math.round(displayPercentage)}%</div>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${getRiskLabelColor()}`}
              style={{
                backgroundColor: getDotColor(),
              }}
            />
            <span className="text-label text-muted-foreground capitalize">
              {riskLevel} risk
            </span>
          </div>
          {showConfidence && confidence && (
            <div className="text-label text-muted-foreground mt-1">
              Confidence {confidence}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
