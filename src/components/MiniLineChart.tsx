import React from 'react';

interface MiniLineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function MiniLineChart({ 
  data, 
  width = 120, 
  height = 40,
  color = '#6A67D8' 
}: MiniLineChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-200"
      />
    </svg>
  );
}
