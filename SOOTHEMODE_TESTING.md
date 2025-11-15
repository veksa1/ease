# SootheMode Testing Guide

## What Was Fixed

### Root Cause
The risk variable names in `HomeScreenContainer` didn't match the names expected by the `generateInstructions()` function in `sootheModeInstructions.ts`.

**Before:**
```typescript
{ name: 'Poor sleep', percentage: 30, ... }  // ❌ Not recognized
```

**After:**
```typescript
{ name: 'Sleep Quality', percentage: 30, category: 'lifestyle', value: '4.2', unit: '/10' }  // ✅ Matches categoryMap
```

### Category Mapping
The `generateInstructions()` function has a `categoryMap` that maps specific trigger names to intervention categories:

```typescript
const categoryMap: Record<string, string> = {
  'Stress Level': 'stress',           // ✅
  'HRV': 'hrv',                       // ✅
  'Sleep Quality': 'sleep',           // ✅ NOW MATCHES
  'Sleep Duration': 'sleep',          // ✅
  'Barometric Pressure Change': 'weather',  // ✅
  'Weather Changes': 'weather',       // ✅
  'Screen Time': 'screen',            // ✅
  'Menstrual Phase': 'menstrual',     // ✅
};
```

## Testing Steps

### 1. Open the App
1. Navigate to http://localhost:3000
2. Skip onboarding if needed to get to HomeScreen
3. Open browser DevTools Console (Cmd+Option+J on Mac, F12 on Windows)

### 2. Click "Take it easy today" Button
The button should be in the bottom right of the grid (next to "Report migraine")

### 3. Check Console Logs
You should see:
```
🎯 HomeScreenContainer - SootheMode clicked with: {
  riskVariablesCount: 5,
  riskPercentage: 100,
  riskVariables: [
    { name: 'Sleep Quality', percentage: 30 },
    { name: 'Screen Time', percentage: 25 },
    { name: 'Stress Level', percentage: 20 },
    { name: 'Barometric Pressure Change', percentage: 15 },
    { name: 'HRV', percentage: 10 }
  ]
}
```

Then:
```
🔍 SootheMode - Loading instructions with: { ... }
📊 Historical data: []
🎯 Detected triggers: {
  id: "barometric_pressure_change_screen_time_sleep_quality_stress_level",
  triggers: ["Sleep Quality", "Screen Time", "Stress Level", "Barometric Pressure Change"],
  label: "Poor sleep + High screen time + High stress + Weather pressure drop"
}
✅ Generated instructions: [
  { id: "avoid_caffeine", text: "Skip caffeine for the rest of the day", ... },
  { id: "sleep_tonight", text: "Commit to 8+ hours of sleep tonight...", ... },
  { id: "screen_break", text: "Take a 15-minute screen break...", ... },
  { id: "blue_light", text: "Enable blue light filter...", ... },
  { id: "deep_breathing", text: "Practice 4-7-8 breathing...", ... },
  { id: "hydrate", text: "Drink 16oz of water right now", ... }
]
```

### 4. Verify UI Displays

**Should See:**
- ✅ Yellow warning box with trigger context: "Based on your current triggers: Poor sleep + High screen time + High stress + Weather pressure drop"
- ✅ "Prevention Checklist" heading
- ✅ 5-6 checkboxes with intervention instructions
- ✅ Each instruction shows estimated time and category (e.g., "~2 min · immediate")
- ✅ "Why these steps?" expandable section
- ✅ "Done" button at bottom

**Should NOT See:**
- ❌ Just a "Done" button with no checklist (this was the bug)
- ❌ "Loading personalized instructions..." message

### 5. Interact with Checklist
1. Check off some interventions - they should get strike-through styling
2. Click "Why these steps?" to expand explanation
3. Verify each intervention is described with evidence level
4. Click "Done" to save session and return to HomeScreen

## Expected Trigger Detection

With current risk variables (all ≥15% threshold):
- **Sleep Quality (30%)** → Triggers sleep interventions
- **Screen Time (25%)** → Triggers screen interventions  
- **Stress Level (20%)** → Triggers stress interventions
- **Barometric Pressure Change (15%)** → Triggers weather interventions
- **HRV (10%)** → Below threshold, not used

## Intervention Categories

The system should generate interventions from these categories:
1. **Sleep** - Caffeine avoidance, nap scheduling, sleep commitment
2. **Screen** - Screen breaks, blue light filters, 20-20-20 rule
3. **Stress** - Deep breathing, progressive relaxation
4. **Weather** - Hydration, staying indoors
5. **General** - Dark/quiet room, regular meals

## Troubleshooting

### If No Instructions Appear:
1. Check console for errors after clicking button
2. Verify risk variables are being passed (check first console.log)
3. Check if triggers are detected (should have 4 triggers)
4. Verify instructions are generated (should have 5-6 instructions)

### If Wrong Instructions Appear:
1. Check trigger combination label matches expected triggers
2. Verify categoryMap includes your trigger names
3. Check targetTriggers in intervention library match detected triggers

### If Button Does Nothing:
1. Check if `onSootheModeClick` handler is being called
2. Verify App.tsx is setting `sootheModeData` state
3. Check if route is changing to 'soothe-mode' screen

## Success Criteria

✅ Clicking "Take it easy today" opens SootheMode screen
✅ Trigger combination is displayed with human-readable label
✅ 5-6 personalized interventions appear in checklist
✅ Each intervention is relevant to detected triggers
✅ Checkboxes work and update state
✅ "Why these steps?" expandable provides explanations
✅ "Done" button saves session and returns to HomeScreen
✅ No errors in console

---

**Last Updated:** November 15, 2025
**Status:** Ready for Testing
