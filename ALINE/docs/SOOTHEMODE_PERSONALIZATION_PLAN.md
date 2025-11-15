# SootheMode Personalized Instructions - Implementation Plan

## Overview

Transform SootheMode from a generic breathing exercise into an intelligent prevention tool that provides personalized intervention checklists based on trigger combinations detected from current risk factors and historical effectiveness data.

## Feature Specifications

### User Experience Flow

1. User clicks "Take a break" when risk is elevated
2. SootheMode analyzes current risk variables to identify trigger combinations
3. Display personalized checklist of evidence-based interventions
4. User marks completed actions during 5-minute session
5. Track outcomes and build effectiveness database over time

### Design Preferences (User-Selected)

- **Trigger Analysis**: Combinations of factors (e.g., "High stress + Poor sleep + Weather change")
- **Goal**: Prevent oncoming migraine (prodrome phase focus)
- **UI Style**: Simple checklist format with checkboxes
- **Data Source**: Historical effectiveness from sqliteService

---

## Implementation Steps

### 1. Extend Type Definitions

**File**: `src/types/index.ts` (create if doesn't exist)

```typescript
export interface RiskVariable {
  name: string;
  percentage: number;
  category: "biometric" | "environmental" | "lifestyle" | "personal";
  value: string;
  unit: string;
}

export interface TriggerCombination {
  id: string;
  triggers: string[]; // Variable names
  label: string; // Human-readable: "High stress + Poor sleep + Weather pressure"
}

export interface InterventionInstruction {
  id: string;
  text: string;
  category: "immediate" | "environment" | "self-care" | "prevention";
  estimatedMinutes: number;
  targetTriggers: string[]; // Which variables this helps with
  evidenceLevel: "high" | "moderate" | "personal"; // Clinical evidence vs personal data
}

export interface SootheModeSession {
  id: string;
  startedAt: string; // ISO timestamp
  triggerCombination: TriggerCombination;
  instructions: InterventionInstruction[];
  completedInstructionIds: string[];
  durationMinutes: number;
  outcome?: "prevented" | "reduced" | "no-effect" | "unknown";
  followUpAt?: string; // When to check outcome (2-4 hours later)
}

export interface InterventionEffectiveness {
  instructionId: string;
  triggerCombinationId: string;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  averageEffectiveness: number; // 0-1 score
}
```

---

### 2. Update SootheMode Component Interface

**File**: `src/components/SootheMode.tsx`

**Change 1**: Update props interface

```typescript
interface SootheModeProps {
  onClose: () => void;
  riskVariables: RiskVariable[]; // Add this prop
  riskPercentage: number; // Add for context
}

export function SootheMode({ onClose, riskVariables, riskPercentage }: SootheModeProps) {
```

**Change 2**: Add state for instructions and session tracking

```typescript
const [instructions, setInstructions] = useState<InterventionInstruction[]>([]);
const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
const [triggerCombination, setTriggerCombination] =
  useState<TriggerCombination | null>(null);
const [sessionId] = useState(() => `session_${Date.now()}`);
const [showWhyExpanded, setShowWhyExpanded] = useState(false);
```

**Change 3**: Initialize instructions on mount

```typescript
useEffect(() => {
  async function loadInstructions() {
    const { detectTriggerCombination, generateInstructions } = await import(
      "../utils/sootheModeInstructions"
    );
    const historicalData = await sqliteService.getInterventionEffectiveness();

    const triggers = detectTriggerCombination(riskVariables, riskPercentage);
    const personalizedInstructions = generateInstructions(
      triggers,
      historicalData
    );

    setTriggerCombination(triggers);
    setInstructions(personalizedInstructions);
  }

  loadInstructions();
}, [riskVariables, riskPercentage]);
```

**Change 4**: Save session on close

```typescript
const handleClose = async () => {
  // Save session data
  await sqliteService.saveSootheModeSession({
    id: sessionId,
    startedAt: new Date().toISOString(),
    triggerCombination: triggerCombination!,
    instructions,
    completedInstructionIds: Array.from(completedIds),
    durationMinutes: (300 - timeRemaining) / 60,
  });

  onClose();
};
```

---

### 3. Update UI to Show Personalized Checklist

**File**: `src/components/SootheMode.tsx`

Replace the generic breathing text section with:

```typescript
{
  /* Personalized Instructions Section */
}
<div className="w-full max-w-md mb-8 space-y-4">
  {/* Trigger Context */}
  {triggerCombination && (
    <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
      <p className="text-sm text-muted-foreground mb-1">
        Based on your current triggers:
      </p>
      <p className="text-body font-medium">{triggerCombination.label}</p>
    </div>
  )}

  {/* Instructions Checklist */}
  <div className="p-4 rounded-xl bg-card border border-border space-y-3">
    <h3 className="text-h3 mb-3">Prevention Checklist</h3>
    {instructions.map((instruction) => (
      <label
        key={instruction.id}
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <input
          type="checkbox"
          checked={completedIds.has(instruction.id)}
          onChange={(e) => {
            const newCompleted = new Set(completedIds);
            if (e.target.checked) {
              newCompleted.add(instruction.id);
            } else {
              newCompleted.delete(instruction.id);
            }
            setCompletedIds(newCompleted);
          }}
          className="mt-0.5 w-5 h-5 rounded border-2 border-primary text-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex-1">
          <p
            className={`text-body ${
              completedIds.has(instruction.id)
                ? "line-through text-muted-foreground"
                : ""
            }`}
          >
            {instruction.text}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ~{instruction.estimatedMinutes} min · {instruction.category}
          </p>
        </div>
      </label>
    ))}
  </div>

  {/* Why These Steps? Expandable */}
  <button
    onClick={() => setShowWhyExpanded(!showWhyExpanded)}
    className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
  >
    <div className="flex items-center justify-between">
      <span className="text-body-sm font-medium">Why these steps?</span>
      <span
        className={`transition-transform ${
          showWhyExpanded ? "rotate-180" : ""
        }`}
      >
        ▼
      </span>
    </div>
  </button>

  {showWhyExpanded && (
    <div className="p-4 rounded-lg bg-muted/30 space-y-2 text-body-sm text-muted-foreground">
      <p>
        These interventions have been effective for similar trigger patterns:
      </p>
      <ul className="space-y-1 ml-4">
        {instructions.map((inst) => (
          <li key={inst.id} className="list-disc">
            {inst.text} -{" "}
            {inst.evidenceLevel === "high"
              ? "✓ Clinical evidence"
              : "✓ Works for you"}
          </li>
        ))}
      </ul>
    </div>
  )}
</div>;
```

---

### 4. Create Instruction Generation Utility

**File**: `src/utils/sootheModeInstructions.ts` (new file)

```typescript
import {
  RiskVariable,
  TriggerCombination,
  InterventionInstruction,
  InterventionEffectiveness,
} from "../types";

/**
 * Threshold for considering a risk variable as a "trigger"
 * Variables contributing >= 15% to total risk are flagged
 */
const TRIGGER_THRESHOLD = 15;

/**
 * Detect trigger combination from current risk variables
 */
export function detectTriggerCombination(
  riskVariables: RiskVariable[],
  riskPercentage: number
): TriggerCombination {
  // Filter high-impact variables
  const topTriggers = riskVariables
    .filter((v) => v.percentage >= TRIGGER_THRESHOLD)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3); // Top 3 triggers

  const triggerNames = topTriggers.map((t) => t.name);
  const label = topTriggers
    .map((t) => {
      // Create human-readable labels
      if (t.name === "Sleep Quality" && parseFloat(t.value) < 6)
        return "Poor sleep";
      if (t.name === "Stress Level" && parseFloat(t.value) >= 7)
        return "High stress";
      if (t.name === "Barometric Pressure Change")
        return "Weather pressure drop";
      if (t.name === "Menstrual Phase" && t.value === "Premenstrual")
        return "Premenstrual phase";
      if (t.name === "Screen Time" && parseFloat(t.value) > 8)
        return "High screen time";
      if (t.name === "HRV" && parseFloat(t.value) < 50) return "Low HRV";
      return t.name;
    })
    .join(" + ");

  return {
    id: triggerNames.sort().join("_").toLowerCase().replace(/\s+/g, "_"),
    triggers: triggerNames,
    label,
  };
}

/**
 * Intervention library with evidence-based recommendations
 */
const INTERVENTION_LIBRARY: Record<string, InterventionInstruction[]> = {
  // Stress-related interventions
  stress: [
    {
      id: "deep_breathing",
      text: "Practice 4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s (repeat 4 times)",
      category: "immediate",
      estimatedMinutes: 2,
      targetTriggers: ["Stress Level", "HRV"],
      evidenceLevel: "high",
    },
    {
      id: "progressive_relaxation",
      text: "Tense and release each muscle group from toes to head",
      category: "immediate",
      estimatedMinutes: 5,
      targetTriggers: ["Stress Level"],
      evidenceLevel: "high",
    },
  ],

  // Sleep-related interventions
  sleep: [
    {
      id: "avoid_caffeine",
      text: "Skip caffeine for the rest of the day",
      category: "prevention",
      estimatedMinutes: 0,
      targetTriggers: ["Sleep Quality", "Caffeine Intake change"],
      evidenceLevel: "high",
    },
    {
      id: "schedule_nap",
      text: "Take a 20-minute power nap (set alarm)",
      category: "self-care",
      estimatedMinutes: 20,
      targetTriggers: ["Sleep Quality", "Sleep Duration"],
      evidenceLevel: "moderate",
    },
    {
      id: "sleep_tonight",
      text: "Commit to 8+ hours of sleep tonight - set bedtime alarm for 10pm",
      category: "prevention",
      estimatedMinutes: 1,
      targetTriggers: ["Sleep Duration"],
      evidenceLevel: "high",
    },
  ],

  // Weather/pressure interventions
  weather: [
    {
      id: "hydrate",
      text: "Drink 16oz of water right now",
      category: "immediate",
      estimatedMinutes: 2,
      targetTriggers: ["Barometric Pressure Change", "Water Intake"],
      evidenceLevel: "moderate",
    },
    {
      id: "stay_indoors",
      text: "Stay indoors in controlled temperature until pressure stabilizes",
      category: "environment",
      estimatedMinutes: 0,
      targetTriggers: ["Barometric Pressure Change", "Weather Changes"],
      evidenceLevel: "moderate",
    },
  ],

  // Screen time interventions
  screen: [
    {
      id: "screen_break",
      text: "Take a 15-minute screen break - go outside or close your eyes",
      category: "immediate",
      estimatedMinutes: 15,
      targetTriggers: ["Screen Time"],
      evidenceLevel: "high",
    },
    {
      id: "blue_light",
      text: "Enable blue light filter on all devices",
      category: "environment",
      estimatedMinutes: 2,
      targetTriggers: ["Screen Time"],
      evidenceLevel: "moderate",
    },
    {
      id: "eye_exercises",
      text: "20-20-20 rule: Every 20 min, look 20 feet away for 20 seconds",
      category: "prevention",
      estimatedMinutes: 0,
      targetTriggers: ["Screen Time"],
      evidenceLevel: "high",
    },
  ],

  // Menstrual/hormonal interventions
  menstrual: [
    {
      id: "magnesium",
      text: "Take magnesium supplement (if prescribed)",
      category: "self-care",
      estimatedMinutes: 1,
      targetTriggers: ["Menstrual Phase"],
      evidenceLevel: "moderate",
    },
    {
      id: "gentle_exercise",
      text: "Do 10 minutes of gentle stretching or yoga",
      category: "self-care",
      estimatedMinutes: 10,
      targetTriggers: ["Menstrual Phase"],
      evidenceLevel: "moderate",
    },
  ],

  // General prevention
  general: [
    {
      id: "dark_quiet",
      text: "Move to a dark, quiet room for the next hour",
      category: "environment",
      estimatedMinutes: 1,
      targetTriggers: ["Prodrome Symptoms"],
      evidenceLevel: "high",
    },
    {
      id: "regular_meal",
      text: "Eat a balanced meal if you skipped one",
      category: "self-care",
      estimatedMinutes: 15,
      targetTriggers: ["Meal Regularity"],
      evidenceLevel: "high",
    },
    {
      id: "cold_compress",
      text: "Apply a cold compress to your forehead for 15 minutes",
      category: "immediate",
      estimatedMinutes: 15,
      targetTriggers: ["Prodrome Symptoms"],
      evidenceLevel: "high",
    },
  ],
};

/**
 * Generate personalized instructions based on triggers and historical data
 */
export function generateInstructions(
  triggerCombination: TriggerCombination,
  historicalData: InterventionEffectiveness[]
): InterventionInstruction[] {
  const instructions: InterventionInstruction[] = [];
  const seenIds = new Set<string>();

  // Map triggers to intervention categories
  const categoryMap: Record<string, string> = {
    "Stress Level": "stress",
    HRV: "stress",
    "Sleep Quality": "sleep",
    "Sleep Duration": "sleep",
    "Barometric Pressure Change": "weather",
    "Weather Changes": "weather",
    "Screen Time": "screen",
    "Menstrual Phase": "menstrual",
  };

  // Collect relevant interventions
  triggerCombination.triggers.forEach((trigger) => {
    const category = categoryMap[trigger];
    if (category && INTERVENTION_LIBRARY[category]) {
      INTERVENTION_LIBRARY[category].forEach((instruction) => {
        if (
          !seenIds.has(instruction.id) &&
          instruction.targetTriggers.some((t) =>
            triggerCombination.triggers.includes(t)
          )
        ) {
          instructions.push(instruction);
          seenIds.add(instruction.id);
        }
      });
    }
  });

  // Add general interventions
  INTERVENTION_LIBRARY.general.forEach((instruction) => {
    if (!seenIds.has(instruction.id)) {
      instructions.push(instruction);
      seenIds.add(instruction.id);
    }
  });

  // Sort by historical effectiveness if available
  if (historicalData.length > 0) {
    const effectivenessMap = new Map(
      historicalData.map((h) => [h.instructionId, h.averageEffectiveness])
    );

    instructions.sort((a, b) => {
      const aScore = effectivenessMap.get(a.id) || 0.5;
      const bScore = effectivenessMap.get(b.id) || 0.5;
      return bScore - aScore;
    });
  } else {
    // Default sort: immediate > self-care > environment > prevention
    const categoryOrder = {
      immediate: 0,
      "self-care": 1,
      environment: 2,
      prevention: 3,
    };
    instructions.sort(
      (a, b) => categoryOrder[a.category] - categoryOrder[b.category]
    );
  }

  // Limit to 5-7 most relevant instructions
  return instructions.slice(0, 6);
}
```

---

### 5. Extend sqliteService for Session Tracking

**File**: `src/services/sqliteService.ts`

**Add new tables in `createSchema()` method**:

```typescript
// SootheMode sessions
this.db.run(`
  CREATE TABLE IF NOT EXISTS soothemode_sessions (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    trigger_combination_id TEXT NOT NULL,
    trigger_labels TEXT NOT NULL,
    completed_instruction_ids TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    outcome TEXT,
    follow_up_at TEXT,
    timestamp TEXT NOT NULL
  )
`);

// Intervention effectiveness tracking
this.db.run(`
  CREATE TABLE IF NOT EXISTS intervention_effectiveness (
    instruction_id TEXT NOT NULL,
    trigger_combination_id TEXT NOT NULL,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_used TEXT NOT NULL,
    PRIMARY KEY (instruction_id, trigger_combination_id)
  )
`);
```

**Add methods**:

```typescript
/**
 * Save SootheMode session
 */
async saveSootheModeSession(session: {
  id: string;
  startedAt: string;
  triggerCombination: TriggerCombination;
  instructions: InterventionInstruction[];
  completedInstructionIds: string[];
  durationMinutes: number;
  outcome?: string;
}): Promise<void> {
  await this.init();
  if (!this.db) throw new Error('Database not initialized');

  this.db.run(
    `INSERT INTO soothemode_sessions
     (id, started_at, trigger_combination_id, trigger_labels, completed_instruction_ids, duration_minutes, outcome, follow_up_at, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.startedAt,
      session.triggerCombination.id,
      session.triggerCombination.label,
      JSON.stringify(session.completedInstructionIds),
      session.durationMinutes,
      session.outcome || null,
      session.outcome ? null : new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
      new Date().toISOString(),
    ]
  );

  await this.saveToIndexedDB();
}

/**
 * Update session outcome after follow-up
 */
async updateSessionOutcome(sessionId: string, outcome: 'prevented' | 'reduced' | 'no-effect'): Promise<void> {
  await this.init();
  if (!this.db) throw new Error('Database not initialized');

  this.db.run(
    `UPDATE soothemode_sessions SET outcome = ?, follow_up_at = NULL WHERE id = ?`,
    [outcome, sessionId]
  );

  // Update effectiveness stats
  const session = this.db.exec(
    `SELECT trigger_combination_id, completed_instruction_ids FROM soothemode_sessions WHERE id = ?`,
    [sessionId]
  )[0];

  if (session && session.values.length > 0) {
    const [triggerCombId, completedIds] = session.values[0];
    const instructionIds = JSON.parse(completedIds as string);
    const success = outcome === 'prevented' || outcome === 'reduced' ? 1 : 0;
    const failure = success ? 0 : 1;

    instructionIds.forEach((instructionId: string) => {
      this.db!.run(
        `INSERT INTO intervention_effectiveness
         (instruction_id, trigger_combination_id, success_count, failure_count, last_used)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(instruction_id, trigger_combination_id)
         DO UPDATE SET
           success_count = success_count + ?,
           failure_count = failure_count + ?,
           last_used = ?`,
        [
          instructionId,
          triggerCombId,
          success,
          failure,
          new Date().toISOString(),
          success,
          failure,
          new Date().toISOString(),
        ]
      );
    });
  }

  await this.saveToIndexedDB();
}

/**
 * Get intervention effectiveness data
 */
async getInterventionEffectiveness(): Promise<InterventionEffectiveness[]> {
  await this.init();
  if (!this.db) throw new Error('Database not initialized');

  const results = this.db.exec(`
    SELECT
      instruction_id,
      trigger_combination_id,
      success_count,
      failure_count,
      last_used,
      CAST(success_count AS FLOAT) / (success_count + failure_count) as average_effectiveness
    FROM intervention_effectiveness
    WHERE success_count + failure_count > 0
    ORDER BY average_effectiveness DESC
  `);

  if (!results || results.length === 0) return [];

  return results[0].values.map(row => ({
    instructionId: row[0] as string,
    triggerCombinationId: row[1] as string,
    successCount: row[2] as number,
    failureCount: row[3] as number,
    lastUsed: row[4] as string,
    averageEffectiveness: row[5] as number,
  }));
}

/**
 * Get sessions pending follow-up
 */
async getPendingFollowUps(): Promise<any[]> {
  await this.init();
  if (!this.db) throw new Error('Database not initialized');

  const results = this.db.exec(`
    SELECT id, trigger_labels, follow_up_at
    FROM soothemode_sessions
    WHERE outcome IS NULL
      AND follow_up_at IS NOT NULL
      AND follow_up_at <= ?
    ORDER BY follow_up_at ASC
  `, [new Date().toISOString()]);

  if (!results || results.length === 0) return [];

  return results[0].values.map(row => ({
    id: row[0] as string,
    triggerLabels: row[1] as string,
    followUpAt: row[2] as string,
  }));
}
```

---

### 6. Wire Props from App to SootheMode

**File**: `src/components/HomeScreen.tsx`

Update the button that triggers SootheMode:

```typescript
<Button
  variant="outline"
  className="h-12 gap-2"
  style={{ borderRadius: '12px' }}
  onClick={() => onSootheModeClick && onSootheModeClick(riskVariables)} // Pass riskVariables
>
```

**File**: `src/components/HomeScreenContainer.tsx`

Update the callback:

```typescript
const handleSootheMode = (riskVariables: RiskVariable[]) => {
  setShowSootheMode(true);
  setCurrentRiskVariables(riskVariables);
};

// In return statement
{
  showSootheMode && (
    <SootheMode
      onClose={() => setShowSootheMode(false)}
      riskVariables={currentRiskVariables}
      riskPercentage={riskPercentage}
    />
  );
}
```

**File**: `src/App.tsx`

Ensure HomeScreen props are updated:

```typescript
interface HomeScreenProps {
  // ... existing props
  onSootheModeClick?: (riskVariables: RiskVariable[]) => void;
}
```

---

### 7. Add Follow-Up Notification System

**File**: `src/hooks/useFollowUpReminders.ts` (new file)

```typescript
import { useState, useEffect } from "react";
import { sqliteService } from "../services/sqliteService";

export function useFollowUpReminders() {
  const [pendingFollowUps, setPendingFollowUps] = useState<any[]>([]);

  useEffect(() => {
    const checkFollowUps = async () => {
      const pending = await sqliteService.getPendingFollowUps();
      setPendingFollowUps(pending);
    };

    checkFollowUps();
    const interval = setInterval(checkFollowUps, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const recordOutcome = async (
    sessionId: string,
    outcome: "prevented" | "reduced" | "no-effect"
  ) => {
    await sqliteService.updateSessionOutcome(sessionId, outcome);
    setPendingFollowUps((prev) => prev.filter((f) => f.id !== sessionId));
  };

  return { pendingFollowUps, recordOutcome };
}
```

Display in HomeScreen as a notification card when follow-ups are pending.

---

## Testing Checklist

### Unit Tests

- [ ] `detectTriggerCombination()` correctly identifies top 3 triggers
- [ ] `generateInstructions()` returns 5-7 relevant interventions
- [ ] Historical effectiveness sorting works correctly
- [ ] sqliteService methods save/retrieve session data

### Integration Tests

- [ ] Props flow correctly: App → HomeScreen → SootheMode
- [ ] Checkbox state updates properly
- [ ] Session saves to database on close
- [ ] Follow-up reminders appear at correct time
- [ ] Outcome recording updates effectiveness stats

### User Testing

- [ ] Checklist items are clear and actionable
- [ ] "Why these steps?" explanation is helpful
- [ ] Checkbox interaction feels responsive
- [ ] Instructions are relevant to displayed triggers
- [ ] Follow-up timing feels appropriate (not annoying)

---

## Future Enhancements

### Phase 2: Advanced Personalization

- **Time-of-day patterns**: Different instructions for morning vs evening prodrome
- **Location awareness**: Add "Go to your dark room" if at home
- **Calendar integration**: "Cancel your 3pm meeting" if high risk detected
- **Effectiveness trends**: Show "This worked 4/5 times for you" badges

### Phase 3: Social & Accountability

- **Share plan**: Send checklist to trusted contact
- **Reminders**: Push notifications for uncompleted high-priority items
- **Reflection**: Post-session journal prompt "What helped most?"

### Phase 4: ML-Enhanced Ranking

- **Connect to ALINE backend**: Use model confidence scores
- **A/B testing**: Randomize instruction order to discover what works
- **Contextual factors**: Consider time-since-last-migraine, medication timing

---

## Implementation Order

1. **Start with types** (`src/types/index.ts`)
2. **Build utility** (`src/utils/sootheModeInstructions.ts`)
3. **Extend database** (`sqliteService.ts`)
4. **Update SootheMode UI** (`SootheMode.tsx`)
5. **Wire props** (App → HomeScreen → SootheMode)
6. **Add follow-up system** (`useFollowUpReminders.ts`)
7. **Test with real data**
8. **Iterate based on usage**

---

## Success Metrics

- **Engagement**: % of high-risk sessions where SootheMode is used
- **Completion rate**: Average % of checklist items completed
- **Effectiveness**: % of sessions marked as "prevented" or "reduced"
- **Learning**: Growth in effectiveness scores over 30 days
- **User satisfaction**: Qualitative feedback on instruction relevance

---

## Notes for Developer

- Keep intervention library easily expandable (add new items to `INTERVENTION_LIBRARY`)
- Evidence levels should link to research papers (future: add `evidenceUrl` field)
- Consider privacy: All data stays local (sql.js + IndexedDB)
- Accessibility: Ensure checkboxes meet WCAG 2.1 AA standards
- Performance: Memoize `generateInstructions()` if riskVariables haven't changed

---

## Example Session Flow

**Scenario**: Sarah has 100% risk with triggers: Sleep Quality (22%), Barometric Pressure (28%), Stress (18%)

1. **Opens SootheMode** → Sees: "Based on your current triggers: Poor sleep + Weather pressure drop + High stress"
2. **Checklist displays**:
   - ✅ Drink 16oz of water right now (2 min)
   - ✅ Practice 4-7-8 breathing (2 min)
   - ☐ Skip caffeine for rest of day (0 min)
   - ☐ Take a 20-minute power nap (20 min)
   - ☐ Stay indoors until pressure stabilizes (0 min)
   - ☐ Move to dark, quiet room for next hour (1 min)
3. **Completes 2 items** during 5-minute timer
4. **Closes session** → Data saved to database
5. **3 hours later** → Notification: "How did your prevention plan work?"
6. **Sarah responds**: "Prevented" → Effectiveness +1 for water + breathing combo

Over time, the system learns that for Sarah's specific trigger pattern, immediate hydration + breathing is most effective, so it ranks those higher in future sessions.
