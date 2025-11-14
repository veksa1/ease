import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ListRowProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
}

export function ListRow({ 
  icon, 
  title, 
  subtitle, 
  trailing, 
  showChevron = false,
  onClick 
}: ListRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors duration-200 text-left"
    >
      {icon && (
        <div className="flex-shrink-0 text-muted-foreground">
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="text-body text-foreground">{title}</div>
        {subtitle && (
          <div className="text-label text-muted-foreground">{subtitle}</div>
        )}
      </div>
      
      {trailing && (
        <div className="flex-shrink-0">
          {trailing}
        </div>
      )}
      
      {showChevron && (
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      )}
    </button>
  );
}
