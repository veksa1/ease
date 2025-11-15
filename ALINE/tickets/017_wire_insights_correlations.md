### 💡 `017_wire_insights_correlations.md`

# 💡 Ticket 017 – Wire InsightsScreen with Correlation Data

**Date:** 2025-11-15  
**Owner:** Frontend  
**Status:** 🔧 To Do  
**Goal:** Replace static correlation data in InsightsScreen with real patterns from demo dataset. Add experiment tracking with localStorage persistence. Generate narrative insights from user timeline.

---

## 🎯 Objective

Transform InsightsScreen from static to dynamic insights:

* Load real correlations from pre-computed demo data
* Track user experiments (hydration, exercise) with localStorage
* Generate personalized narrative insights from timeline
* Show correlation strength with real calculations
* Make "How we calculate this" educational content dynamic
* Persist experiment progress across sessions

This enables:
- **Pattern discovery** - Show user's unique triggers
- **Experimentation** - Test hypotheses with tracking
- **Learning** - Understand correlation methodology
- **Personalization** - Insights based on actual timeline

---

## 📂 Inputs

| File                              | Description                        |
| --------------------------------- | ---------------------------------- |
| `src/components/InsightsScreen.tsx` | Insights component (lines 1-150)  |
| `src/hooks/useDemoData.ts`        | Data hooks from Ticket 014         |
| `src/data/demoUserAlex.json`      | Pre-computed correlations          |

---

## 🧩 Tasks

### 1. Update InsightsScreen to Load Real Correlations

Replace hardcoded correlations array:

```typescript
// src/components/InsightsScreen.tsx

import { useCorrelations } from '../hooks/useDemoData';
import { useState, useEffect } from 'react';

export function InsightsScreen({ onBack, onNavigate }: InsightsScreenProps) {
  const [activeBottomSheet, setActiveBottomSheet] = useState<BottomSheetType>(null);
  const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelationData | null>(null);
  
  // Load correlations from demo data
  const { loading, correlations } = useCorrelations();
  
  // Experiment tracking (persisted to localStorage)
  const [experiments, setExperiments] = useState(() => {
    const stored = localStorage.getItem('ease_experiments');
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      hydration: {
        active: false,
        goal: 'Drink 8 glasses of water daily',
        days: [false, false, false, false, false, false, false],
        startDate: null
      },
      exercise: {
        active: false,
        goal: '30 minutes of exercise daily',
        days: [false, false, false, false, false, false, false],
        startDate: null
      }
    };
  });

  // Save experiments to localStorage
  useEffect(() => {
    localStorage.setItem('ease_experiments', JSON.stringify(experiments));
  }, [experiments]);

  // Generate pattern chip text from top correlations
  const patternText = correlations.slice(0, 2)
    .map(c => c.label)
    .join(' + ');

  const handleViewDetails = (correlation: CorrelationData) => {
    setSelectedCorrelation(correlation);
    setActiveBottomSheet('correlation-details');
  };

  const toggleExperimentDay = (experimentKey: string, dayIndex: number) => {
    setExperiments(prev => ({
      ...prev,
      [experimentKey]: {
        ...prev[experimentKey],
        days: prev[experimentKey].days.map((checked, i) => 
          i === dayIndex ? !checked : checked
        )
      }
    }));
  };

  const startExperiment = (experimentKey: string) => {
    setExperiments(prev => ({
      ...prev,
      [experimentKey]: {
        ...prev[experimentKey],
        active: true,
        startDate: new Date().toISOString(),
        days: [false, false, false, false, false, false, false]
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-label text-muted-foreground">Analyzing patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with dynamic pattern chip */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onBack} /* ... */>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-h2 absolute left-1/2 -translate-x-1/2">Insights</h1>
            <button onClick={() => setActiveBottomSheet('header-info')} /* ... */>
              <Info className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Dynamic pattern chip */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
              <span className="text-label">
                Your pattern this month: {patternText || 'Building patterns...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24 px-6 pt-6">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Top Correlations - now dynamic */}
          <section>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-h3">Top correlations</h2>
                <button
                  onClick={() => setActiveBottomSheet('correlations-info')}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Correlation list from demo data */}
              <div className="space-y-0">
                {correlations.map((correlation, index) => (
                  <React.Fragment key={correlation.id}>
                    {index > 0 && <div className="border-t border-border my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-body font-medium">{correlation.label}</span>
                        <span className="text-body font-bold text-primary">
                          {correlation.strength}%
                        </span>
                      </div>
                      
                      {/* Strength bar */}
                      <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${correlation.strength}%` }}
                        />
                      </div>
                      
                      <button
                        onClick={() => handleViewDetails(correlation)}
                        className="text-label text-primary hover:underline"
                      >
                        View details
                      </button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          {/* Experiments - with localStorage persistence */}
          <section>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-h3">Try an experiment</h2>
                <button
                  onClick={() => setActiveBottomSheet('experiment-info')}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Hydration experiment */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                    <span className="text-xl">💧</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-body font-medium">Stay hydrated</h3>
                    <p className="text-label text-muted-foreground">
                      {experiments.hydration.goal}
                    </p>
                  </div>
                </div>

                {experiments.hydration.active ? (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                        <button
                          key={i}
                          onClick={() => toggleExperimentDay('hydration', i)}
                          className={`flex-1 aspect-square rounded-lg border transition-colors ${
                            experiments.hydration.days[i]
                              ? 'bg-success border-success text-white'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          <div className="text-xs font-medium">{day}</div>
                          {experiments.hydration.days[i] && <Check className="w-4 h-4 mx-auto" />}
                        </button>
                      ))}
                    </div>
                    <p className="text-label text-muted-foreground text-center">
                      {experiments.hydration.days.filter(Boolean).length}/7 days completed
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => startExperiment('hydration')}
                    className="w-full px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    Start experiment
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Narrative insights - generated from timeline */}
          <section>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h2 className="text-h3">This month</h2>
              <p className="text-body text-muted-foreground leading-relaxed">
                {generateNarrativeInsight(correlations)}
              </p>
              <button
                onClick={() => setActiveBottomSheet('narrative-details')}
                className="text-label text-primary hover:underline"
              >
                Learn more
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNav current="insights" onNavigate={onNavigate} />
    </div>
  );
}

// Generate narrative insight from correlations
function generateNarrativeInsight(correlations: CorrelationData[]): string {
  if (correlations.length === 0) {
    return "We're still learning your patterns. Keep logging your daily check-ins for personalized insights.";
  }

  const top = correlations[0];
  const second = correlations[1];

  if (top.strength > 70 && second) {
    return `This month you often reported higher risk when ${top.label.toLowerCase()} and ${second.label.toLowerCase()}. These patterns appear consistently in your data.`;
  } else if (top.strength > 60) {
    return `Your data shows that ${top.label.toLowerCase()} is a significant factor, appearing in ${top.strength}% of high-risk periods.`;
  } else {
    return `We're detecting early patterns around ${top.label.toLowerCase()}. Continue tracking to strengthen these insights.`;
  }
}
```

### 2. Add Correlation Detail View

Show detailed statistics in bottom sheet:

```typescript
// Enhanced bottom sheet for correlation details

{activeBottomSheet === 'correlation-details' && selectedCorrelation && (
  <BottomSheet
    title={selectedCorrelation.label}
    onClose={() => setActiveBottomSheet(null)}
  >
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary">
            {selectedCorrelation.strength}%
          </div>
          <div className="text-label text-muted-foreground">Correlation</div>
        </div>
        <div className="flex-1">
          <p className="text-body text-muted-foreground">
            {selectedCorrelation.explanation}
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-body font-medium mb-2">How we found this</h3>
        <p className="text-label text-muted-foreground leading-relaxed">
          Our AI analyzed your 30-day history and found this factor present in{' '}
          {selectedCorrelation.strength}% of your high-risk periods. This suggests
          a meaningful relationship worth monitoring.
        </p>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-body font-medium mb-2">What to try</h3>
        <ul className="space-y-2 text-label text-muted-foreground">
          <li>• Track this factor more closely in your check-ins</li>
          <li>• Try modifying it and observe changes</li>
          <li>• Share this pattern with your healthcare provider</li>
        </ul>
      </div>
    </div>
  </BottomSheet>
)}
```

---

## 🧠 Integration

* Depends on Ticket 014 (data hooks)
* Works with Ticket 015 (HomeScreen) and Ticket 016 (DiaryScreen)
* Provides actionable insights from demo data

---

## 🧪 Validation Checklist

* [ ] Correlations load from demo data (not hardcoded)
* [ ] Pattern chip updates with top 2 correlations
* [ ] Correlation strength bars animate
* [ ] Experiment tracking persists to localStorage
* [ ] Day checkboxes in experiment toggle correctly
* [ ] "Start experiment" activates experiment
* [ ] Narrative insight generates dynamically
* [ ] Bottom sheets show correlation details
* [ ] Loading state displays briefly
* [ ] No console errors

---

## ✅ Deliverables

* [ ] Updated `src/components/InsightsScreen.tsx` with live data
* [ ] Experiment tracking with localStorage
* [ ] Dynamic narrative insight generation
* [ ] Enhanced correlation detail views
* [ ] Pattern chip with real correlations

---

## 📝 Testing Script

```
1. Open InsightsScreen → See correlations from demo data
2. Verify pattern chip shows top 2 correlations
3. Click "View details" → See correlation explanation
4. Start hydration experiment → Days appear
5. Check off M, T, W → See 3/7 completed
6. Refresh page → Experiment progress persists
7. Read narrative insight → Should mention top correlation
8. Toggle between screens → Return to insights, data persists
```

---

> *"Insights without action are just observations."*

---
