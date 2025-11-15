import React from 'react';

interface CalendarGridProps {
  month?: string;
  selectedDays?: number[];
}

export function CalendarGrid({ 
  month = 'November 2025', 
  selectedDays = [15] 
}: CalendarGridProps) {
  const daysInMonth = 30;
  const startDay = 4; // Friday
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const allDays = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - startDay + 1;
    return dayNum > 0 && dayNum <= daysInMonth ? dayNum : null;
  });

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-h2">{month}</h3>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-label text-muted-foreground py-2">
            {day}
          </div>
        ))}
        {allDays.map((day, i) => (
          <div
            key={i}
            className={`
              aspect-square flex items-center justify-center rounded-lg text-body
              transition-colors duration-200
              ${!day ? 'invisible' : ''}
              ${selectedDays.includes(day || 0) 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-secondary cursor-pointer'
              }
            `}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
