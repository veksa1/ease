import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DataSourceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBgColor?: string;
  iconColor?: string;
}

export function DataSourceCard({ 
  icon: Icon, 
  title, 
  description,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary'
}: DataSourceCardProps) {
  return (
    <div 
      className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200"
      style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
    >
      <div className={`p-2.5 rounded-lg ${iconBgColor} ${iconColor} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-body mb-1">{title}</h3>
        <p className="text-label text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
