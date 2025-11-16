/**
 * TomorrowRiskBanner Component - Ticket 028
 * 
 * Shows upcoming risk when high (>60%) with calendar context
 */

import React, { useState } from 'react';
import { AlertTriangle, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import type { TomorrowPrediction } from '../services/tomorrowPredictionService';

interface TomorrowRiskBannerProps {
  prediction: TomorrowPrediction;
  onDismiss: () => void;
}

export function TomorrowRiskBanner({ prediction, onDismiss }: TomorrowRiskBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const riskPercent = Math.round(prediction.risk * 100);
  const tomorrowDate = new Date(prediction.date);
  const dayName = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div
      className="rounded-xl border border-warning/30 bg-warning/5 p-4 mb-4"
      style={{ borderRadius: '12px' }}
      role="alert"
      aria-live="polite"
    >
      {/* Subtle accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning/40 rounded-l-xl" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">
              Tomorrow's risk is high ({riskPercent}%)
            </h3>
            <p className="text-sm text-muted-foreground">
              {dayName} • {prediction.calendarEvents.length} event{prediction.calendarEvents.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors flex-shrink-0"
          aria-label="Dismiss tomorrow's risk notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Summary */}
      {!expanded && prediction.breakdown.contributors.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {prediction.breakdown.contributors.slice(0, 2).map((contributor, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-sm"
            >
              <span>{contributor.icon}</span>
              <span className="text-muted-foreground">{contributor.label}</span>
              <span className="text-warning font-medium">+{Math.round(contributor.delta * 100)}%</span>
            </div>
          ))}
          {prediction.breakdown.contributors.length > 2 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              +{prediction.breakdown.contributors.length - 2} more
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Expanded View */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Full Breakdown */}
          {prediction.breakdown.contributors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">What's contributing:</h4>
              <div className="space-y-2">
                {prediction.breakdown.contributors.map((contributor, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span>{contributor.icon}</span>
                      <span className="text-muted-foreground">{contributor.label}</span>
                    </span>
                    <span className="text-warning font-medium">
                      +{Math.round(contributor.delta * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Events */}
          {prediction.calendarEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Tomorrow's schedule:
              </h4>
              <div className="space-y-1.5">
                {prediction.calendarEvents.slice(0, 3).map((event, i) => (
                  <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-xs opacity-50 min-w-[60px]">
                      {new Date(event.start).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </span>
                    <span className="flex-1">{event.title}</span>
                  </div>
                ))}
                {prediction.calendarEvents.length > 3 && (
                  <p className="text-xs text-muted-foreground italic">
                    +{prediction.calendarEvents.length - 3} more event{prediction.calendarEvents.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {prediction.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Suggested actions:</h4>
              <div className="space-y-1.5">
                {prediction.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5">✓</span>
                    <span className="text-muted-foreground">{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded(false)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Show less
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* CTA */}
      {!expanded && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full border-warning/30 hover:bg-warning/10"
          onClick={() => setExpanded(true)}
        >
          View details & suggestions
        </Button>
      )}
    </div>
  );
}
