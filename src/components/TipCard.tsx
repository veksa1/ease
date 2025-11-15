import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TipCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  iconBgColor?: string;
  iconColor?: string;
}

export function TipCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary',
}: TipCardProps) {
  return (
    <div
      className="p-4 rounded-xl bg-card border border-border space-y-3 h-full"
      style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Icon */}
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-lg ${iconBgColor} shrink-0`}
        style={{ borderRadius: '8px' }}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="text-body">{title}</h3>
        <p className="text-label text-muted-foreground">{description}</p>
      </div>

      {/* Action */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-label text-primary hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
