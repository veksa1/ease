import React from 'react';
import { X } from 'lucide-react';

interface PillChipProps {
  label: string;
  onRemove?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'critical';
}

export function PillChip({ label, onRemove, variant = 'default' }: PillChipProps) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary/10 text-primary dark:bg-primary/20',
    success: 'bg-success/10 text-success dark:bg-success/20',
    warning: 'bg-warning/10 text-warning dark:bg-warning/20',
    critical: 'bg-critical/10 text-critical dark:bg-critical/20',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label
        transition-colors duration-200
        ${variants[variant]}
      `}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
