import React from 'react';

interface HeatmapDotsProps {
  data: number[][]; // 7 rows (weeks) x 7 columns (days)
}

export function HeatmapDots({ data }: HeatmapDotsProps) {
  const getColor = (value: number) => {
    if (value === 0) return 'bg-neutral-200 dark:bg-neutral-200/20';
    if (value <= 25) return 'bg-success/30';
    if (value <= 50) return 'bg-success/50';
    if (value <= 75) return 'bg-success/70';
    return 'bg-success';
  };

  return (
    <div className="inline-flex flex-col gap-1">
      {data.map((week, weekIndex) => (
        <div key={weekIndex} className="flex gap-1">
          {week.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className={`w-3 h-3 rounded-sm transition-colors duration-200 ${getColor(day)}`}
              title={`Day ${dayIndex + 1}, Week ${weekIndex + 1}: ${day}%`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
