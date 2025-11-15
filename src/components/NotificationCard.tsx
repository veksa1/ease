import React from 'react';
import { X, AlertCircle, Info } from 'lucide-react';
import { Button } from './ui/button';

type NotificationVariant = 'alert' | 'nudge';

interface NotificationCardProps {
  variant: NotificationVariant;
  message: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export function NotificationCard({
  variant,
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
}: NotificationCardProps) {
  const isAlert = variant === 'alert';

  return (
    <div
      className={`
        relative overflow-hidden
        ${isAlert ? 'bg-warning/5 border-warning/20' : 'bg-accent/5 border-accent/20'}
        border rounded-xl p-4
        shadow-sm
      `}
      style={{ borderRadius: '12px' }}
      role="alert"
      aria-live="polite"
    >
      {/* Subtle accent bar on the left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          isAlert ? 'bg-warning/40' : 'bg-accent/40'
        }`}
      />

      <div className="flex items-start gap-3 pl-2">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 mt-0.5
            ${isAlert ? 'text-warning' : 'text-accent'}
          `}
        >
          {isAlert ? (
            <AlertCircle className="w-5 h-5" strokeWidth={2} />
          ) : (
            <Info className="w-5 h-5" strokeWidth={2} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-body text-foreground mb-3">{message}</p>

          {/* Actions */}
          {(primaryAction || secondaryAction) && (
            <div className="flex flex-wrap gap-2">
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  size="sm"
                  className={`
                    ${
                      isAlert
                        ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
                        : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    }
                    shadow-none
                  `}
                  style={{ borderRadius: '8px' }}
                >
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button
                  onClick={secondaryAction.onClick}
                  variant="outline"
                  size="sm"
                  className={`
                    ${
                      isAlert
                        ? 'border-warning/30 text-warning hover:bg-warning/10'
                        : 'border-accent/30 text-accent hover:bg-accent/10'
                    }
                    shadow-none
                  `}
                  style={{ borderRadius: '8px' }}
                >
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
            aria-label="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
