import React from 'react';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: BarData[];
  maxValue?: number;
}

export function HorizontalBarChart({ data, maxValue }: HorizontalBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <div className="flex flex-col gap-3 w-full">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-label text-muted-foreground w-16 text-right">
            {item.label}
          </span>
          <div className="flex-1 bg-neutral-200 dark:bg-neutral-200/20 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color || '#6A67D8',
              }}
            />
          </div>
          <span className="text-label text-muted-foreground w-8">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
