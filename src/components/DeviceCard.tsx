import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface DeviceCardProps {
  icon: LucideIcon;
  name: string;
  status: 'connected' | 'not-connected';
  lastSync?: string;
  onManageClick: () => void;
  onConnectClick?: () => void;
}

export function DeviceCard({
  icon: Icon,
  name,
  status,
  lastSync,
  onManageClick,
  onConnectClick,
}: DeviceCardProps) {
  const isConnected = status === 'connected';

  return (
    <div
      className="p-4 rounded-xl bg-card border border-border space-y-3"
      style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 shrink-0"
          style={{ borderRadius: '8px' }}
        >
          <Icon className="w-6 h-6 text-primary" />
        </div>

        {/* Name and Status */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body">{name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-success' : 'bg-neutral-600'
              }`}
            />
            <span className="text-label text-muted-foreground">
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
      </div>

      {/* Last Sync (only shown when connected) */}
      {isConnected && lastSync && (
        <div className="flex items-center justify-between text-label text-muted-foreground">
          <span>Last synced: {lastSync}</span>
        </div>
      )}

      {/* Action Button */}
      <div>
        {isConnected ? (
          <button
            onClick={onManageClick}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            style={{ borderRadius: '8px' }}
          >
            <span className="text-label">Manage permissions</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ) : (
          <Button
            onClick={onConnectClick}
            variant="outline"
            className="w-full rounded-lg"
            style={{ borderRadius: '8px' }}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
