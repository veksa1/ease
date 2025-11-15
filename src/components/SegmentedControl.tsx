import React, { useState } from 'react';

interface SegmentedControlOption {
  id: string;
  label: string;
}

interface SegmentedControlProps {
  options: string[] | SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function SegmentedControl({ 
  options, 
  value,
  defaultValue, 
  onChange 
}: SegmentedControlProps) {
  const firstOptionId = typeof options[0] === 'string' ? options[0] : options[0]?.id;
  const [internalSelected, setInternalSelected] = useState(defaultValue || firstOptionId || '');
  const selected = value ?? internalSelected;

  const handleSelect = (optionValue: string) => {
    setInternalSelected(optionValue);
    onChange?.(optionValue);
  };

  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' 
      ? { id: opt, label: opt }
      : opt
  );

  return (
    <div className="inline-flex p-1 bg-secondary rounded-lg w-full">
      {normalizedOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => handleSelect(option.id)}
          className={`
            flex-1 px-4 py-1.5 rounded-md text-label transition-all duration-200
            ${selected === option.id
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
