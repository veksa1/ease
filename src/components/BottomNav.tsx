import React from 'react';
import { Home, BookOpen, User } from 'lucide-react';

interface BottomNavProps {
  activeIndex?: number;
  onNavigate?: (index: number) => void;
}

export function BottomNav({ activeIndex = 0, onNavigate }: BottomNavProps) {
  const items = [
    { icon: Home, label: 'Home' },
    { icon: BookOpen, label: 'Diary' },
    { icon: User, label: 'Profile' },
  ];

  return (
    <div className="w-full bg-card border-t border-border">
      <div className="flex items-center justify-around px-4 py-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === activeIndex;
          
          return (
            <button
              key={index}
              onClick={() => onNavigate?.(index)}
              className={`
                flex flex-col items-center gap-1 py-2 px-6 transition-colors duration-200
                ${isActive ? 'text-primary' : 'text-muted-foreground'}
              `}
            >
              <Icon className="w-6 h-6" />
              <span className="text-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
