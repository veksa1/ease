# Delegation Package - Tickets 020-026

**Status:** ✅ Ready to delegate with all clarifications resolved  
**Last Updated:** 2025-11-16  
**Context:** Feature expansion to 35 features, weather integration, feedback loop

---

## 📋 Overview

All blocking questions resolved. Team can now work on tickets 020-026 in parallel.

### Quick Status

| Ticket | Title | Status | Dependencies | Estimate |
|--------|-------|--------|--------------|----------|
| 020 | Temporal Cycle Features | ✅ READY | None | 4-6 hrs |
| 021 | Per-User Weights | ⏸️ **SKIP** | Research shows harm | N/A |
| 022 | Information Gain Queries | ⏸️ BLOCKED | #025 | 6-8 hrs |
| 023 | OpenWeather Integration | ✅ READY | Calendar (#019) | 1-2 days |
| 024 | Wearable Sensor Roadmap | ✅ READY | None (docs only) | 2-3 hrs |
| 025 | Feature Expansion to 35 | ✅ READY | #020 recommended | 2-3 days |
| 026 | User Feedback Loop | ✅ READY | None | 1-2 days |

---

## ✅ RESOLVED DECISIONS

### Ticket 020: Temporal Cycle Features
**Decision:** Implement as specified  
**Details:**
- Add 4 cyclical features (sin/cos encodings)
- Features: `day_of_week_sin`, `day_of_week_cos`, `week_of_year_sin`, `week_of_year_cos`
- Already defined in `data/feature_order.yaml` (indices 20-23)
- No blocking questions

**Files to modify:**
- `scripts/simulator.py` - Add temporal computation
- `data/priors.yaml` - Already has cyclical encoding

**Reference implementation:**
```python
def compute_temporal_features(timestamp: datetime) -> dict:
    day_of_week = timestamp.weekday()  # 0-6
    week_of_year = timestamp.isocalendar()[1]  # 1-52
    
    return {
        20: np.sin(2 * np.pi * day_of_week / 7),
        21: np.cos(2 * np.pi * day_of_week / 7),
        22: np.sin(2 * np.pi * week_of_year / 52),
        23: np.cos(2 * np.pi * week_of_year / 52)
    }
```

---

### Ticket 021: Per-User Feature Weights
**Decision:** ❌ **SKIP ENTIRELY**  

**Reason:** Research in `notebooks/personalization_study.ipynb` showed:
- Baseline model: AUC **0.7301** ✅
- User embeddings: AUC **0.6106** ❌ (overfitting)
- Hierarchical Bayesian: AUC **0.5000** ❌ (failed to converge)

**Root cause:** Insufficient data per user (2,400 samples vs. 10,000+ needed)

**Action:** Wait for real production data before revisiting

**Unblock criteria:**
1. Collect 50+ users with 1000+ days each
2. Demonstrate significant inter-user weight variance (σ > 0.3)
3. Re-run study on real data
4. Only proceed if personalized > baseline

**No work required - ticket marked as ON HOLD**

---

### Ticket 022: Information Gain Queries
**Decision:** Wait for #025 completion  
**Reason:** Needs full 35-feature model to compute accurate IG

**Blocker:** Cannot compute information gain until model trained on 35 features

**Timeline:** Delegate after #025 complete + model retrained

---

### Ticket 023: OpenWeather Integration
**Decision:** All clarifications provided ✅

#### Location Strategy
**Choice:** Use calendar events to infer geographic location

**How it works:**
1. Parse LOCATION field from ICS calendar events
2. Geocode location → lat/lon (using OpenStreetMap Nominatim - free)
3. Use lat/lon for OpenWeather API calls
4. Fallback: Manual zip code entry if no calendar location

**Benefits:**
- No browser geolocation permission
- Works for future trips (calendar has tomorrow's location)
- Privacy-friendly (user's own calendar data)

**Integration:** n8n workflow will extract location and pass to weather service

#### Caching Strategy
**Choice:** SQLite (matches existing architecture)

**Schema:**
```sql
CREATE TABLE weather_cache (
    location_key TEXT PRIMARY KEY,  -- "lat,lon" as key
    timestamp INTEGER NOT NULL,
    temperature REAL,
    pressure REAL,
    pressure_change_3h REAL,
    humidity REAL,
    aqi INTEGER,
    weather_data JSON,  -- Full API response
    expires_at INTEGER NOT NULL
);

CREATE INDEX idx_expires ON weather_cache(expires_at);
```

**TTL:** 1 hour (configurable via `OPENWEATHER_CACHE_TTL` env var)

**Files modified:**
- `service/weather.py` (NEW) - Weather service with SQLite caching
- `service/location_inference.py` (NEW) - Calendar-based geocoding
- `service/database/database.py` - Add weather_cache table
- `.env.production` - Add `OPENWEATHER_API_KEY`

**No blocking questions - ready to implement**

---

### Ticket 025: Feature Expansion to 35
**Decision:** All specifications finalized ✅

#### Feature Selection
**Choice:** Use EXACTLY the features in `data/migraine_features.json`

**Canonical source:** `data/feature_order.yaml` (created)
- Indices 0-19: Base features (original 20)
- Indices 20-23: Temporal features (from #020)
- Indices 24-34: Expanded features (11 new from migraine_features.json)

**New features:**
1. HRV (Heart Rate Variability)
2. Resting Heart Rate
3. Body Temperature Change
4. Barometric Pressure Change (3hr)
5. Air Quality Index
6. Altitude
7. Prodrome Symptoms
8. Age
9. Body Weight
10. BMI
11. Migraine History Years

#### Data Regeneration Strategy
**Choice:** Full regenerate (Option A)

**Reasoning:**
- Clean, consistent data
- Only takes 8 minutes for 3M rows
- Ensures proper feature correlations
- No risk of schema mismatch

**Command:**
```bash
python scripts/simulator.py
```

**Expected output:**
- `synthetic_migraine_train.csv` - 2.1M rows × 36 columns (35 features + target)
- `synthetic_migraine_val.csv` - 900K rows × 36 columns
- `synthetic_migraine_meta.json` - Updated metadata

**Files to modify:**
- `scripts/simulator.py` - Refactor to read from `feature_order.yaml`
- `data/priors.yaml` - ✅ Already updated with new feature distributions

**Implementation guide:** See `scripts/simulator_refactor_guide.py`

**No blocking questions - ready to implement**

---

### Ticket 024: Wearable Sensor Roadmap
**Decision:** Documentation-only task ✅

**Scope:** Create roadmap document for future wearable integration
- No code changes
- Research Oura/Whoop/Apple Watch APIs
- Document integration strategy
- Estimate effort for Phase 2

**Deliverable:** `docs/WEARABLE_INTEGRATION_ROADMAP.md`

**No blocking questions - ready to delegate**

---

### Ticket 026: User Feedback Loop
**Decision:** Storage strategy defined ✅

#### Storage Strategy
**Choice:** SQLite (matches calendar + weather pattern)

**Schema:**
```sql
CREATE TABLE user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feedback_date TEXT NOT NULL,  -- ISO 8601 date
    predicted_risk REAL NOT NULL,  -- What we predicted (0-1)
    actual_outcome TEXT NOT NULL,  -- 'migraine' or 'no_migraine'
    severity INTEGER,  -- 1-10 if migraine, NULL otherwise
    timestamp INTEGER NOT NULL,  -- Unix timestamp
    notes TEXT,
    UNIQUE(user_id, feedback_date)
);

CREATE INDEX idx_user_feedback ON user_feedback(user_id, feedback_date);
CREATE INDEX idx_timestamp ON user_feedback(timestamp);
```

**Benefits:**
- Same database as calendar and weather
- Simple JSON export for ML retraining
- Can join with predictions for accuracy metrics
- No additional infrastructure

**Files to modify:**
- `service/database/database.py` - Add user_feedback table
- `service/main.py` - Add `/feedback/submit` endpoint
- `service/schemas.py` - Add FeedbackRequest/Response models
- `src/services/feedbackService.ts` - Frontend API client
- `src/components/DiaryScreen.tsx` - Add feedback UI

**No blocking questions - ready to implement**

---

## 🔧 Infrastructure Already Created

### Configuration Files
✅ `data/feature_order.yaml` - Canonical 35-feature ordering  
✅ `configs/model.yaml` - Updated to `in_dim: 35`  
✅ `configs/train.yaml` - Updated to `in_dim: 35`  
✅ `data/priors.yaml` - Updated with HRV, Body Temp, Barometric Pressure distributions

### Documentation
✅ `docs/TRAINING_READINESS_CHECKLIST.md` - Blocker analysis  
✅ `scripts/simulator_refactor_guide.py` - Complete refactor implementation  
✅ All ticket files updated with decisions

---

## 🚀 Recommended Execution Order

### Phase 1: Data Infrastructure (Parallel)
**Can start immediately:**
1. **Ticket 020** (4-6 hrs) - Temporal features
2. **Ticket 024** (2-3 hrs) - Wearable roadmap (docs only)

### Phase 2: Core Features (Parallel after Phase 1)
**Start after #020 complete:**
3. **Ticket 025** (2-3 days) - Feature expansion + data regeneration
   - Depends on #020 for temporal features
   - Blocks training and #022

4. **Ticket 023** (1-2 days) - Weather integration
   - Independent, can run in parallel with #025

5. **Ticket 026** (1-2 days) - Feedback loop
   - Independent, can run in parallel with #023 and #025

### Phase 3: Advanced Features (After #025)
**Start after model retrained on 35 features:**
6. **Ticket 022** (6-8 hrs) - Information gain queries
   - Blocked by #025 (needs 35-feature model)

### Timeline
- **Week 1:** #020, #024, start #025
- **Week 2:** Complete #025, #023, #026 in parallel
- **Week 3:** Retrain model, then #022

**Critical path:** #020 → #025 → Retrain → #022

---

## 📦 Deliverables Per Ticket

### Ticket 020
- [ ] Updated `scripts/simulator.py` with temporal feature computation
- [ ] Verified temporal features in generated CSV
- [ ] Unit tests for cyclical encoding

### Ticket 023
- [ ] `service/weather.py` with OpenWeather client + caching
- [ ] `service/location_inference.py` with calendar-based geocoding
- [ ] `weather_cache` table in database
- [ ] Environment variable documentation
- [ ] Integration tests

### Ticket 025
- [ ] Refactored `scripts/simulator.py` reading from `feature_order.yaml`
- [ ] Regenerated training/validation CSVs (2.1M + 900K rows)
- [ ] Verified 36 columns (35 features + target)
- [ ] Updated `synthetic_migraine_meta.json`

### Ticket 026
- [ ] `user_feedback` table in database
- [ ] `/feedback/submit` API endpoint
- [ ] Frontend feedback service
- [ ] UI component for daily check-in
- [ ] Export function for ML retraining

---

## ⚠️ Known Blockers (Already Resolved)

### ~~Location for Weather API~~ ✅ RESOLVED
**Was:** How to get user's current location?  
**Resolution:** Use calendar events (LOCATION field) → geocode to lat/lon

### ~~Weather Caching~~ ✅ RESOLVED
**Was:** In-memory or persistent cache?  
**Resolution:** SQLite with 1-hour TTL

### ~~Feature Selection~~ ✅ RESOLVED
**Was:** Which 11 features to add?  
**Resolution:** Exact features from `migraine_features.json`

### ~~Data Regeneration~~ ✅ RESOLVED
**Was:** Full regenerate or append columns?  
**Resolution:** Full regenerate (8 min, worth it for consistency)

### ~~Feedback Storage~~ ✅ RESOLVED
**Was:** Where to store user feedback?  
**Resolution:** SQLite (matches pattern)

---

## 🎯 Success Criteria

### Training Readiness (Post #025)
- [ ] `synthetic_migraine_train.csv` has 36 columns
- [ ] First row header matches `feature_order.yaml` names
- [ ] Model config `in_dim: 35` matches data
- [ ] Training script runs without shape errors
- [ ] Model converges (loss < 0.5 after 100 epochs)

### Weather Integration (Post #023)
- [ ] API call to OpenWeather succeeds with test lat/lon
- [ ] Cache hit reduces latency from ~500ms to <10ms
- [ ] Location inference from calendar event works
- [ ] Graceful fallback when no location available

### Feedback Loop (Post #026)
- [ ] User can submit feedback via DiaryScreen
- [ ] Feedback stored in database
- [ ] Can query accuracy (predicted vs. actual)
- [ ] Export JSON for model retraining

---

## 📞 Contact for Questions

If any blockers arise during implementation:
1. Check ticket markdown file for detailed specs
2. Review `scripts/simulator_refactor_guide.py` for code examples
3. Refer to `docs/TRAINING_READINESS_CHECKLIST.md` for dependencies

**All decisions documented - no ambiguity should remain!**

---

## ✅ Final Checklist Before Starting

- [x] All tickets have clear specifications
- [x] All "DECISION:" questions resolved
- [x] Infrastructure files created (feature_order.yaml, updated priors.yaml)
- [x] Reference implementations provided (simulator_refactor_guide.py)
- [x] Database schemas defined (weather_cache, user_feedback)
- [x] Dependencies mapped (#020 → #025 → #022)
- [x] Success criteria documented

**Status:** 🟢 GREEN LIGHT - Ready to delegate immediately
