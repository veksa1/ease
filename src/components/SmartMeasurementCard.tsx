/**
 * Smart Measurement Card
 * 
 * Displays AI-recommended measurement times based on policy top-k
 * Shows urgency and allows users to set reminders
 */

import React from 'react';
import { Clock, Bell, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { policyService, type SelectedHour } from '../services/policyService';

interface SmartMeasurementCardProps {
  selectedHours: SelectedHour[];
  onSetReminder?: (hour: number) => void;
  className?: string;
}

export function SmartMeasurementCard({
  selectedHours,
  onSetReminder,
  className = '',
}: SmartMeasurementCardProps) {
  if (!selectedHours || selectedHours.length === 0) {
    return null;
  }

  // Sort by priority score descending
  const sortedHours = [...selectedHours].sort((a, b) => b.priority_score - a.priority_score);

  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 ${className}`}
      style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-h3">Smart measurement times</h3>
            <p className="text-label text-muted-foreground">
              AI-recommended check-in hours for best insights
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Hours */}
      <div className="space-y-3">
        {sortedHours.map((hourData, index) => {
          const urgency = policyService.getUrgencyLevel(hourData.priority_score);
          const timeString = policyService.formatHour(hourData.hour);
          
          return (
            <div
              key={hourData.hour}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                  ${urgency === 'high' ? 'bg-critical/10 text-critical' : ''}
                  ${urgency === 'medium' ? 'bg-warning/10 text-warning' : ''}
                  ${urgency === 'low' ? 'bg-primary/10 text-primary' : ''}
                `}>
                  {index + 1}
                </div>

                {/* Time */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-body font-medium">{timeString}</span>
                </div>

                {/* Priority Indicator */}
                <div className="flex items-center gap-1">
                  <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        urgency === 'high' ? 'bg-critical' : ''
                      }${urgency === 'medium' ? 'bg-warning' : ''}${
                        urgency === 'low' ? 'bg-primary' : ''
                      }`}
                      style={{
                        width: `${Math.min(100, (hourData.priority_score / 1.5) * 100)}%`,
                      }}
                    />
                  </div>
                  {urgency === 'high' && (
                    <TrendingUp className="w-3 h-3 text-critical" />
                  )}
                </div>
              </div>

              {/* Set Reminder Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSetReminder?.(hourData.hour)}
                className="gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remind me</span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <p className="text-sm text-muted-foreground">
          💡 These times offer the <strong>highest information gain</strong> for your predictions.
          Checking in at these hours helps ALINE learn your patterns faster.
        </p>
      </div>
    </div>
  );
}
