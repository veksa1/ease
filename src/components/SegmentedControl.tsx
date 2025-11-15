import React, { useState } from 'react';

interface SegmentedControlProps {
  options: string[];
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function SegmentedControl({ 
  options, 
  defaultValue, 
  onChange 
}: SegmentedControlProps) {
  const [selected, setSelected] = useState(defaultValue || options[0]);

  const handleSelect = (option: string) => {
    setSelected(option);
    onChange?.(option);
  };

  return (
    <div className="inline-flex p-1 bg-secondary rounded-lg">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => handleSelect(option)}
          className={`
            px-4 py-1.5 rounded-md text-label transition-all duration-200
            ${selected === option
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
