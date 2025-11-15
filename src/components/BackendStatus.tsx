/**
 * Backend Status Indicator
 * 
 * A subtle badge that indicates whether the app is using
 * real backend predictions or demo data.
 */

import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';

interface BackendStatusProps {
  isConnected: boolean;
  className?: string;
}

export function BackendStatus({ isConnected, className = '' }: BackendStatusProps) {
  if (!isConnected) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground text-xs ${className}`}
        title="Using demo data - backend not connected"
      >
        <CloudOff className="w-3 h-3" />
        <span>Demo Mode</span>
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success text-xs ${className}`}
      title="Connected to ALINE backend"
    >
      <Cloud className="w-3 h-3" />
      <span>Live Data</span>
    </div>
  );
}
