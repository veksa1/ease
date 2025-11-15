import React from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';

interface InsightsTeaserCardProps {
  onTap: () => void;
}

export function InsightsTeaserCard({ onTap }: InsightsTeaserCardProps) {
  return (
    <button
      onClick={onTap}
      className="w-full bg-card border border-border rounded-xl p-4 hover:bg-accent/5 transition-colors text-left"
      style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header with Icon */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-h3">Insights</h3>
          </div>

          {/* Content */}
          <p className="text-body text-foreground mb-1">
            Top pattern: Mondays + low HRV
          </p>
          <p className="text-label text-muted-foreground">
            3 correlations updated
          </p>
        </div>

        {/* Chevron */}
        <div className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-muted transition-colors shrink-0">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
