/**
 * Hourly Risk Chart
 * 
 * Displays hourly risk predictions in a timeline format
 * Shows high-risk hours and allows users to see patterns throughout the day
 */

import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { useHourlyRiskTimeline } from '../hooks/useHourlyPosterior';
import type { QuickCheckData } from '../services/featureConverter';

interface HourlyRiskChartProps {
  checkData?: QuickCheckData;
  className?: string;
}

export function HourlyRiskChart({ checkData, className = '' }: HourlyRiskChartProps) {
  const { loading, timelineData, highRiskHours } = useHourlyRiskTimeline(checkData);

  if (loading) {
    return (
      <div className={`rounded-xl border border-border bg-card p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (timelineData.length === 0) {
    return (
      <div className={`rounded-xl border border-border bg-card p-6 ${className}`}>
        <div className="text-center text-muted-foreground space-y-2">
          <Clock className="w-8 h-8 mx-auto opacity-50" />
          <p className="text-sm">Complete a Quick Check to see hourly risk patterns</p>
        </div>
      </div>
    );
  }

  const maxRisk = Math.max(...timelineData.map((d: any) => d.risk));

  return (
    <div className={`rounded-xl border border-border bg-card p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-body font-medium">Today's Risk Pattern</h3>
          {highRiskHours.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-warning">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{highRiskHours.length} high-risk hours</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="space-y-2">
          {timelineData.map((data: any) => {
            const heightPercent = maxRisk > 0 ? (data.risk / maxRisk) * 100 : 0;
            const isHighRisk = data.isHighRisk;
            
            let barColor = 'bg-success/40';
            if (data.riskLevel === 'moderate') barColor = 'bg-warning/40';
            if (data.riskLevel === 'high') barColor = 'bg-critical/40';
            
            if (isHighRisk) {
              barColor = data.riskLevel === 'high' ? 'bg-critical/70' : 'bg-warning/70';
            }

            return (
              <div key={data.hour} className="flex items-center gap-2">
                {/* Time label */}
                <div className="w-12 text-xs text-muted-foreground text-right">
                  {data.time}
                </div>
                
                {/* Bar */}
                <div className="flex-1 h-6 bg-muted/30 rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-300 flex items-center justify-end px-2`}
                    style={{ width: `${heightPercent}%` }}
                  >
                    {heightPercent > 20 && (
                      <span className="text-xs font-medium text-foreground">
                        {data.risk}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Risk indicator */}
                {isHighRisk && (
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success/40" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-warning/40" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-critical/40" />
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
