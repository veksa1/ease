import React from 'react';
import { Menu, Search, MoreVertical } from 'lucide-react';

interface TopAppBarProps {
  title: string;
  showMenu?: boolean;
  showSearch?: boolean;
  showMore?: boolean;
}

export function TopAppBar({ 
  title, 
  showMenu = true, 
  showSearch = false, 
  showMore = true 
}: TopAppBarProps) {
  return (
    <div className="w-full bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {showMenu ? (
          <button className="p-2 -ml-2 text-foreground hover:bg-secondary rounded-lg transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        
        <h1 className="text-h2">{title}</h1>
        
        <div className="flex items-center gap-1">
          {showSearch && (
            <button className="p-2 text-foreground hover:bg-secondary rounded-lg transition-colors">
              <Search className="w-6 h-6" />
            </button>
          )}
          {showMore && (
            <button className="p-2 text-foreground hover:bg-secondary rounded-lg transition-colors">
              <MoreVertical className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
