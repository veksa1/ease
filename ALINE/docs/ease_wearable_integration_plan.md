
# ease-app Wearable Integration – Implementation Plan

## 🎯 Overall Objective

Enable *ease-app* to ingest **sleep, HR/HRV, and activity** data from wearables with **minimal engineering and vendor overhead**, starting with OS-level health aggregators and leaving room to add unified APIs / direct vendors later.

Core data sources we will leverage:

- **Apple HealthKit** on iOS (central health repository for iPhone/Apple Watch).
- **Android Health Connect** on Android (single interface for health data across many apps/devices).
- Optional: **Oura Cloud API** for high-quality sleep/HRV/readiness data.
- Optional: **Terra (or similar)** as a unified wearable API (Garmin, Fitbit, Oura, Apple, etc.).

---

## Phase 0 – Scoping & Requirements (1–2 days)

**Goal:** Freeze scope for MVP wearable integration and align with data science needs.

### Tasks

1. **Confirm target platforms & user segment**
   - Platforms: iOS & Android.
   - Early users: focus on those with **Apple Watch or Android phones using Health Connect–compatible apps** (Garmin, Fitbit, Oura, etc.).
   - Decide whether to **skip direct vendor integrations** for MVP.

2. **Lock core signals for migraine model**
   - From HealthKit / Health Connect:
     - Sleep: duration, sleep sessions, sleep consistency.
     - HR/HRV: resting heart rate, HRV (e.g., SDNN) where available.
     - Activity: steps, active energy / activity minutes.
   - Map these to existing *ease-app* feature schema (20+ features).

3. **Define privacy & consent policy**
   - Confirm GDPR approach: explicit in-app consent + clear explanation of what’s collected.
   - Data flow: device → app → backend (aggregated) → model.
   - Decide retention window for raw vs aggregated data (e.g., 90 days).

### Deliverables

- Short spec: **“Wearable Integration v1 – Data & Privacy Spec”**.
- Approved list of HealthKit & Health Connect data types to request.

---

## Phase 1 – MVP: OS-Level Integrations Only (HealthKit + Health Connect)

### 1A. iOS – HealthKit Integration

**Goal:** Read daily aggregated sleep, HR/HRV, and activity from HealthKit and post to backend.

#### Tasks

1. **Project setup**
   - Add HealthKit capability to Xcode target.
   - Update app entitlements and `Info.plist` with HealthKit usage descriptions.

2. **Permissions & UX**
   - Implement an onboarding screen explaining:
     - Why ease-app needs health data.
     - What data types will be accessed.
   - Request read access for:
     - `HKQuantityTypeIdentifierHeartRate`
     - `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` (if appropriate).
     - `HKCategoryTypeIdentifierSleepAnalysis`
     - `HKQuantityTypeIdentifierStepCount` / `HKQuantityTypeIdentifierActiveEnergyBurned` (or equivalent).

3. **Data access layer**
   - Implement a `HealthKitService` that:
     - Checks authorization status.
     - Reads **yesterday’s**:
       - Total sleep duration + main sleep window.
       - Resting heart rate / HRV summary.
       - Steps / activity minutes.
     - Supports a “pull last N days” method (e.g., 7–30 days) for initial backfill.

4. **Feature transformation**
   - In the app or backend, convert raw samples to:
     - `sleep_hours_last_night`
     - `sleep_regularization_score`
     - `resting_hr_morning`
     - `hrv_morning`
     - `steps_last_24h`
   - Package into the JSON schema expected by the *ease-app* API.

5. **Networking**
   - Add a scheduled job (e.g., daily at 08:00 local) to:
     - Fetch the latest aggregates from HealthKit.
     - POST them to the **FastAPI** backend endpoint (e.g., `/api/v1/wearables/daily-summary`).

6. **Testing**
   - Create test accounts with Apple Watch.
   - Validate that:
     - Permissions prompt is correct.
     - Data matches what the Health app shows.
     - Backend receives consistent JSON.

#### Deliverables

- Working HealthKit integration behind a **feature flag**.
- API contract doc: **`/wearables/daily-summary – v1`** with example payloads.

---

### 1B. Android – Health Connect Integration

**Goal:** Mirror the iOS capabilities using Health Connect.

#### Tasks

1. **Project setup**
   - Add Health Connect SDK dependency (e.g., `androidx.health.connect:connect-client`) to the Android app.

2. **Permissions & UX**
   - Add onboarding copy similar to iOS.
   - Request read permissions for:
     - Heart rate, HRV (if available from source apps).
     - Sleep sessions.
     - Steps / activities.

3. **Data access layer**
   - Implement `HealthConnectService` that:
     - Checks Health Connect availability & permissions.
     - Reads last night’s sleep session, last 24h HR and HRV aggregates, steps/activity.
     - Supports “pull last N days” for backfill.

4. **Feature transformation & networking**
   - Same feature mapping as iOS for cross-platform consistency.
   - Same `/wearables/daily-summary` endpoint; ensure field names match exactly.

5. **Testing**
   - Test with at least:
     - 1–2 Android devices.
     - At least one wearable that syncs into Health Connect (e.g., Fitbit, Oura, or Garmin through their official apps).
   - Compare numbers with source apps.

#### Deliverables

- Working Health Connect integration behind a feature flag.
- Updated API contract if platform-specific fields appear (clearly marked optional).

---

## Phase 2 – Optional Vendor Enhancements (Oura / Unified API)

> This phase only starts once Phase 1 is stable. It’s meant to **enhance data quality**, not block MVP.

### 2A. Direct Oura Integration (Optional)

**Goal:** Add richer sleep/HRV/readiness data for users with Oura rings.

#### Tasks

1. **Backend OAuth setup**
   - Register an Oura API application.
   - Implement OAuth2 flow in backend to obtain access/refresh tokens.

2. **Data sync**
   - Implement daily job to pull:
     - Sleep stages & duration.
     - Nightly HR & HRV.
     - Readiness / recovery score.

3. **Fusion logic**
   - For users with both HealthKit/Health Connect and Oura:
     - Define merging rules (e.g., favor Oura for sleep & HRV).
   - Extend feature schema with Oura-specific fields if needed (e.g., `oura_readiness_score`).

#### Deliverables

- Oura-specific ingestion module.
- Extended feature mapping doc: **“Wearable Features – Extended (Oura)”**.

---

### 2B. Unified Wearable API (Terra or similar) – Design Only (Optional for now)

**Goal:** De-risk future expansion to many vendors via a single API provider.

#### Tasks

1. **Desk research & vendor comparison**
   - Evaluate Terra & similar vendors:
     - Supported devices.
     - Data types (sleep, HR, HRV, activity, etc.).
     - Pricing & terms.
     - Privacy/GDPR posture.

2. **Proof-of-Concept plan**
   - Draft a minimal POC where:
     - ease-app calls Terra (or similar) to link a user’s wearable.
     - Backend receives a webhook with sleep/HR/HRV/activity and maps it into the same `/wearables/daily-summary` schema.

3. **Decision document**
   - Pros/cons table:
     - Engineering effort.
     - Monthly costs.
     - Vendor lock-in.
     - Data coverage (Garmin, Polar, Others).

#### Deliverables

- Internal note: **“Unified Wearable API Option – POC & Recommendation”** (3–5 pages, no coding required yet).

---

## Phase 3 – Productization & Ops

**Goal:** Make wearable integration robust enough for real users and pilots.

### Tasks

1. **Monitoring & alerting**
   - Add metrics to backend:
     - Number of users with successful wearable sync per day.
     - Error rates when reading HealthKit / Health Connect.
   - Set alerts if:
     - Sync errors > X% or
     - No data received from a user for Y days.

2. **User-facing status & troubleshooting**
   - A simple “Device status” section in the app:
     - Last sync time per source (HealthKit / Health Connect / Oura).
     - Clear CTA: “Tap to re-authorize health data access”.

3. **Data quality checks**
   - Implement backend sanity checks:
     - Sleep hours in [0, 16].
     - HR in plausible ranges (e.g., 30–220 bpm).
     - Reject or flag obviously corrupted data.

4. **Model feedback loop**
   - Provide metrics for data science:
     - Coverage (how many users have wearables).
     - Fraction of days with complete data.
     - Impacts on prediction performance (once available).

### Deliverables

- Observability dashboard for wearable integration.
- Basic support playbook for “health data not syncing” issues.

---

## Phase 4 – Ownership & Next Steps

### Suggested ownership

- **Mobile team**
  - Phase 1 (HealthKit & Health Connect integration + UX).
- **Backend team**
  - API endpoints, data storage, Oura/Unified API work.
- **Data science / ML**
  - Feature mapping & validation; model impact analysis.
- **Compliance / Legal**
  - Review consent wording, data retention, and any DPAs for external APIs.

### Next steps for the Project Manager agent

1. Create epics for each phase in the project tracker (e.g., Jira/Linear).
2. Break tasks into assignable tickets with estimates.
3. Coordinate cross-team dependencies (mobile ↔ backend ↔ ML).
4. Align timeline with planned pilot or demo dates for ease-app.

