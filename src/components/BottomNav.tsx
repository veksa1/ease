import React from 'react';
import { Home, BookOpen, User } from 'lucide-react';

interface BottomNavProps {
  activeTab?: 'home' | 'diary' | 'profile';
  onNavigate?: (tab: 'home' | 'diary' | 'profile') => void;
}

export function BottomNav({ activeTab = 'home', onNavigate }: BottomNavProps) {
  const items = [
    { icon: Home, label: 'Home', id: 'home' as const },
    { icon: BookOpen, label: 'Diary', id: 'diary' as const },
    { icon: User, label: 'Profile', id: 'profile' as const },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-card border-t border-border z-40">
      <div className="flex items-center justify-around px-4 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
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
