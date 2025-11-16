/**
 * What-If Impact Card Component
 * 
 * Displays risk delta between current and optimized scenarios
 * Shows actionable suggestions to reduce migraine risk
 */

import React from 'react';
import { TrendingDown, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { WhatIfResult } from '../hooks/useWhatIfSimulator';

interface WhatIfImpactCardProps {
  baselineRisk: number;
  currentRisk?: number;
  suggestions: WhatIfResult[];
  isCalculating?: boolean;
  onApplySuggestion?: (suggestion: WhatIfResult) => void;
  className?: string;
}

export function WhatIfImpactCard({
  baselineRisk,
  currentRisk,
  suggestions,
  isCalculating = false,
  onApplySuggestion,
  className = '',
}: WhatIfImpactCardProps) {
  const displayRisk = currentRisk !== undefined ? currentRisk : baselineRisk;
  const hasDelta = currentRisk !== undefined && currentRisk !== baselineRisk;
  const riskDelta = hasDelta ? currentRisk - baselineRisk : 0;

  // Filter to only show improvements (negative delta)
  const improvements = suggestions.filter(s => s.delta < 0).slice(0, 3);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current Risk Display */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {hasDelta ? 'Updated risk' : 'Current risk'}
            </p>
            <p className="text-2xl font-semibold">
              {Math.round(displayRisk * 100)}%
              {isCalculating && (
                <span className="ml-2 text-sm text-muted-foreground font-normal">
                  (calculating...)
                </span>
              )}
            </p>
          </div>
          
          {/* Delta indicator */}
          {hasDelta && !isCalculating && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Change</p>
              <div className="flex items-center gap-1.5">
                {riskDelta < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-success" />
                    <span className="text-lg font-semibold text-success">
                      {Math.round(Math.abs(riskDelta) * 100)}%
                    </span>
                  </>
                ) : riskDelta > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-critical" />
                    <span className="text-lg font-semibold text-critical">
                      +{Math.round(riskDelta * 100)}%
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">
                    No change
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {improvements.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium">Ways to reduce your risk:</h4>
          </div>
          
          <div className="space-y-2">
            {improvements.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onApplySuggestion?.(suggestion)}
                disabled={isCalculating}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20 hover:bg-success/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{suggestion.icon}</span>
                  <span className="text-sm font-medium">{suggestion.label}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-success" />
                  <span className="text-success font-semibold text-sm">
                    -{Math.round(Math.abs(suggestion.delta) * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No improvements available */}
      {improvements.length === 0 && !isCalculating && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              No additional improvements available. You're already doing great!
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isCalculating && improvements.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Finding ways to reduce your risk...</span>
        </div>
      )}
    </div>
  );
}

interface WhatIfStickyFooterProps {
  suggestions: WhatIfResult[];
  onApplySuggestion?: (suggestion: WhatIfResult) => void;
  isVisible?: boolean;
}

/**
 * Sticky footer showing top risk reduction suggestions
 */
export function WhatIfStickyFooter({
  suggestions,
  onApplySuggestion,
  isVisible = true,
}: WhatIfStickyFooterProps) {
  if (!isVisible || suggestions.length === 0) return null;

  // Show top 3 improvements
  const topSuggestions = suggestions.filter(s => s.delta < 0).slice(0, 3);

  if (topSuggestions.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg z-50 animate-slide-up">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">Quick wins to reduce your risk:</h4>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {topSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onApplySuggestion?.(suggestion)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20 hover:bg-success/15 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <span className="text-lg">{suggestion.icon}</span>
              <span className="text-sm font-medium">{suggestion.label}</span>
              <span className="text-success font-semibold text-sm">
                -{Math.round(Math.abs(suggestion.delta) * 100)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface LiveRiskIndicatorProps {
  currentRisk: number;
  baselineRisk?: number;
  isCalculating?: boolean;
  className?: string;
}

/**
 * Compact live risk indicator for inline display
 */
export function LiveRiskIndicator({
  currentRisk,
  baselineRisk,
  isCalculating = false,
  className = '',
}: LiveRiskIndicatorProps) {
  const hasDelta = baselineRisk !== undefined && currentRisk !== baselineRisk;
  const delta = hasDelta ? currentRisk - baselineRisk : 0;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-lg font-semibold">
        {Math.round(currentRisk * 100)}%
      </span>
      
      {isCalculating && (
        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      )}
      
      {hasDelta && !isCalculating && Math.abs(delta) > 0.01 && (
        <span className={`text-sm font-medium ${
          delta < 0 ? 'text-success' : 'text-critical'
        }`}>
          {delta < 0 ? '↓' : '↑'}
          {Math.round(Math.abs(delta) * 100)}%
        </span>
      )}
    </div>
  );
}
