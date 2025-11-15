import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const heights = {
    sm: 24,
    md: 40,
    lg: 64,
  };

  const height = heights[size];
  
  return (
    <div className={`inline-block ${className}`}>
      <img
        src="data:image/svg+xml,%3Csvg width='400' height='140' viewBox='0 0 400 140' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23FF7B66' font-family='Inter, system-ui, sans-serif' font-weight='600' font-size='120' letter-spacing='-0.02em'%3Eease%3C/text%3E%3C/svg%3E"
        alt="Ease"
        style={{ height: `${height}px`, width: 'auto' }}
      />
    </div>
  );
}
