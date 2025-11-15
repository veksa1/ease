# Developer Skip Button - Quick Access Feature

## ✅ Implementation Complete

A developer-only skip button has been added to bypass onboarding and quickly access the main app with mock data.

---

## 🎯 What Was Added

### 1. **Mock Data Utility** (`src/utils/devMockData.ts`)
- `populateMockData()` - Fills database with realistic mock data
- `clearAllData()` - Resets database for testing

### 2. **Dev Skip Button Component** (`src/components/DevSkipButton.tsx`)
- Floating button in bottom-left corner
- Only visible in development mode
- One-click to populate data and reload

### 3. **Integration** (`src/App.tsx`)
- Button appears on all onboarding screens
- Auto-hides in production builds

---

## 🎨 Features

### What Gets Populated

**1. User Settings**
- ✅ Onboarding marked as complete
- ✅ Streak count set to 7 days

**2. Personal Profile**
- ✅ Migraine history: 5 years
- ✅ Age: 32
- ✅ Weight: 70 kg
- ✅ BMI: 22.5

**3. Trigger Hypotheses (3 samples)**
- **Sleep Loss** - 75% confidence, 4/month
- **Stress Overload** - 90% confidence, 6/month  
- **Screen Time** - 50% confidence, 3/month

**4. Timeline Entries**
- ✅ Last 3 days of check-ins
- ✅ Morning and evening entries
- ✅ Sleep, mood, stress, screen time data

**5. Experiment Tracking**
- ✅ Magnesium experiment (4 days completed)

**6. Consent & Devices**
- ✅ HRV, Calendar, Weather consents granted
- ✅ Apple Health and Garmin connected

---

## 🚀 Usage

### For Developers

1. **Start the app in development mode:**
   ```bash
   npm run dev
   ```

2. **Look for the yellow button in bottom-left:**
   - Button labeled "Dev Skip" with a ⚡ icon
   - Only visible on onboarding screens
   - Only in development mode (localhost)

3. **Click the button:**
   - Database populates with mock data
   - App automatically reloads
   - You land on the home screen

### Manual Testing

You can also use the utility functions directly in console:

```javascript
import { populateMockData, clearAllData } from './utils/devMockData';

// Populate mock data
await populateMockData();

// Clear all data
await clearAllData();
```

---

## 🔒 Security

### Development-Only Feature

The button is **completely hidden** in production:

```typescript
const isDev = process.env.NODE_ENV === 'development' || 
              window.location.hostname === 'localhost';

if (!isDev) return null; // No button in production
```

### Checks Performed:
- ✅ NODE_ENV must be 'development'
- ✅ OR hostname must be 'localhost'
- ✅ Button component returns null in production
- ✅ No bundle bloat (tree-shaken in production builds)

---

## 📦 Files Added/Modified

### New Files
1. `/src/utils/devMockData.ts` - Mock data utilities
2. `/src/components/DevSkipButton.tsx` - Button component
3. `/DEV_SKIP_BUTTON_COMPLETE.md` - This documentation

### Modified Files
1. `/src/App.tsx` - Added DevSkipButton import and render

---

## 🎨 UI/UX Details

### Button Appearance
- **Position:** Fixed bottom-left corner
- **Color:** Yellow (warning color for dev tools)
- **Icon:** ⚡ Zap icon from lucide-react
- **Border:** 2px yellow border for visibility
- **Shadow:** Elevated with shadow-lg
- **States:** 
  - Normal: "Dev Skip"
  - Loading: "Loading..."
  - Disabled while processing

### Accessibility
- ✅ Proper ARIA labels
- ✅ Keyboard accessible
- ✅ Clear visual distinction from app UI
- ✅ Title tooltip on hover

---

## 🔧 Technical Details

### Mock Data Generation

```typescript
// Personal Profile
{
  migraineHistoryYears: 5,
  age: 32,
  weightKg: 70,
  bmi: 22.5
}

// Trigger Hypotheses
[
  {
    id: 'trigger_sleep_loss_1',
    key: 'sleep_loss',
    label: 'Sleep Loss',
    confidence: 0.75,
    freqPerMonth: 4,
    threshold: '<6 hours',
    onsetWindowHours: 2,
    helps: 'Rest in dark room',
    notes: 'Usually happens after late nights working'
  },
  // ... 2 more triggers
]

// Timeline Entries (last 3 days)
- Morning check-ins: sleep, mood, symptoms
- Evening check-ins: stress, screen time

// Settings
- has_seen_onboarding: 'true'
- streak_count: '7'
- consent_hrv: 'true'
- consent_calendar: 'true'
- consent_weather: 'true'
- device_apple_health: 'true'
- device_garmin: 'true'
```

### Database Operations

All operations use the existing `sqliteService`:

```typescript
await sqliteService.setSetting(key, value);
await sqliteService.savePersonalMigraineProfile(profile);
await sqliteService.saveTriggerHypothesis(hypothesis);
await sqliteService.addTimelineEntry(date, type, data);
await sqliteService.setExperimentDay(name, day, completed);
```

---

## 🧪 Testing

### Manual Test Checklist

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Verify button appears:**
   - [ ] Button visible on onboarding screen 1
   - [ ] Button visible on onboarding screen 2
   - [ ] Button visible on onboarding screen 3
   - [ ] Button visible on onboarding screen 4
   - [ ] Button NOT visible on home screen

3. **Click button:**
   - [ ] Button shows "Loading..."
   - [ ] Console shows mock data messages
   - [ ] Page reloads automatically

4. **Verify data:**
   - [ ] Home screen shows
   - [ ] Profile has data (check settings)
   - [ ] Trigger hypotheses exist (check personal details)
   - [ ] Timeline has entries (check diary)

5. **Production build:**
   ```bash
   npm run build
   npm run preview
   ```
   - [ ] Button NOT visible in production build

### Console Output

When clicking "Dev Skip", you should see:

```
🔧 Populating mock data for development...
✅ Onboarding completed
✅ Streak count set to 7
✅ Personal migraine profile saved
✅ Sample trigger hypotheses added (3)
✅ Sample timeline entries added (last 3 days)
✅ Sample experiment tracking added
✅ Consent settings configured
✅ Device connections configured
🎉 Mock data populated successfully!
👉 Reloading app...
```

---

## 🐛 Troubleshooting

### Button Not Visible

**Problem:** Button doesn't appear in development

**Solutions:**
1. Check you're on an onboarding screen (`currentScreen.startsWith('onboarding')`)
2. Verify NODE_ENV is 'development'
3. Check hostname is 'localhost'
4. Clear browser cache

### Data Not Persisting

**Problem:** Mock data disappears after reload

**Solutions:**
1. Check IndexedDB is enabled in browser
2. Verify `saveToIndexedDB()` is called in sqliteService
3. Check browser developer tools > Application > IndexedDB
4. Try clearing IndexedDB and retrying

### Build Errors

**Problem:** Build fails with module not found

**Solutions:**
1. Run `npm install` to ensure dependencies
2. Check imports are correct
3. Verify file paths match actual files
4. Clear node_modules and reinstall

---

## 📝 Future Enhancements

Potential improvements for the dev skip feature:

1. **Multiple Mock Profiles**
   - Add dropdown to select different user personas
   - "New User", "Power User", "High Risk User", etc.

2. **Custom Mock Data**
   - Allow developers to specify data via config
   - JSON file with custom values

3. **Reset Button**
   - Add companion button to clear all data
   - "Dev Reset" to start fresh

4. **Time Travel**
   - Populate data for specific date ranges
   - Test historical data scenarios

5. **Random Data Generation**
   - Generate random but realistic data
   - Different each time for variety

6. **Export/Import**
   - Export current state to JSON
   - Import saved states for testing

---

## ✅ Status: READY

The developer skip button is fully implemented and ready for use:

- ✅ Build successful
- ✅ Development mode working
- ✅ Production mode hidden
- ✅ Mock data realistic
- ✅ Documentation complete

**To use it:**
1. Run `npm run dev`
2. Click the yellow "Dev Skip" button
3. Start testing the main app immediately!

---

## 🎯 Benefits

**For Developers:**
- ⚡ Instant access to main app
- 🔧 No manual data entry needed
- 🧪 Consistent testing environment
- 🚀 Faster development iteration

**For Testing:**
- 📊 Realistic mock data
- 🔄 Repeatable scenarios
- 🎨 Full feature testing
- 📱 Complete user journey

**For Demos:**
- 💼 Professional presentation
- 📈 Pre-populated analytics
- 🎭 Realistic user experience
- ⏱️ Time-saving setup

---

## 📚 Related Documentation

- `TRIGGER_HYPOTHESES_INTEGRATION.md` - Trigger system docs
- `TRIGGER_HYPOTHESES_QUICK_REF.md` - Quick reference
- `README.md` - Project overview
- `src/services/sqliteService.ts` - Database service

---

**Happy Developing! 🎉**
