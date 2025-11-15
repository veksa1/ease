# 🔌 Sensor & Wearable Integration Roadmap

**Purpose:** Outline available integrations for biometric data collection to enhance ALINE's migraine prediction.

**Status:** Research/Planning Phase (No implementations yet)

---

## 📊 Feature-to-Sensor Mapping

Based on `data/migraine_features.json`, here are the high-value biometric features and their data sources:

| Feature | Weight | Source Options | Availability |
|---------|--------|----------------|--------------|
| **HRV** | High (1.0) | Apple Health, Fitbit, Garmin, Oura, Whoop | iOS/Android/Devices |
| **Resting Heart Rate** | Medium (0.6) | Apple Health, Fitbit, Garmin, Samsung Health | iOS/Android/Devices |
| **Sleep Duration** | High (1.0) | Apple Health, Fitbit, Oura, Sleep Cycle | iOS/Android/Apps |
| **Sleep Quality** | High (1.0) | Oura, Whoop, Sleep Cycle, Apple Sleep | Devices/Apps |
| **Body Temperature** | Medium (0.7) | Oura, Apple Watch (limited), TempTraq | Devices |
| **Activity Level** | Medium (0.6) | Apple Health, Google Fit, Strava | iOS/Android/Apps |

---

## 🍎 Apple Health / HealthKit

**Platform:** iOS only  
**Access:** HealthKit framework (requires iOS app)  
**Coverage:** HRV, RHR, sleep, activity, body temp (limited)

### Available Metrics

- `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`: HRV in milliseconds
- `HKQuantityTypeIdentifierRestingHeartRate`: RHR in bpm
- `HKCategoryTypeIdentifierSleepAnalysis`: Sleep stages (awake, REM, deep, core)
- `HKQuantityTypeIdentifierStepCount`: Daily steps
- `HKQuantityTypeIdentifierBodyTemperature`: Manual entry or limited devices

### Implementation Requirements

1. **iOS native app or React Native with HealthKit plugin**
2. User authorization (permission prompt)
3. Background sync capability
4. Privacy policy compliance (HIPAA considerations)

### Code Snippet (React Native HealthKit)

```javascript
import AppleHealthKit from 'react-native-health';

const permissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
    ],
  },
};

AppleHealthKit.initHealthKit(permissions, (err) => {
  if (err) return;
  
  // Fetch HRV from last 24 hours
  const options = {
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  };
  
  AppleHealthKit.getHeartRateVariabilitySamples(options, (err, results) => {
    // results = [{value: 45, startDate: '...', endDate: '...'}, ...]
    // Send to ALINE backend
  });
});
```

### Effort Estimate

- **Setup & Auth:** 4-6 hours
- **Data Sync Logic:** 8-12 hours
- **Testing & Privacy Compliance:** 4-8 hours
- **Total:** 2-3 days (Medium)

### Cost

- **Free** (Apple HealthKit is free, requires Apple Developer account $99/year)

---

## 🏃 Fitbit Web API

**Platform:** Cross-platform (iOS, Android, Web)  
**Access:** OAuth 2.0 Web API  
**Coverage:** HRV, RHR, sleep (detailed stages), activity

### Available Endpoints

- `GET /1/user/-/hrv/date/{date}.json`: Daily HRV summary
- `GET /1/user/-/activities/heart/date/{date}/1d.json`: RHR
- `GET /1.2/user/-/sleep/date/{date}.json`: Sleep stages, duration, quality score
- `GET /1/user/-/activities/date/{date}.json`: Steps, active minutes

### Implementation Requirements

1. **OAuth 2.0 flow** (redirect user to Fitbit for authorization)
2. Store access/refresh tokens securely
3. Handle token expiration (refresh every 8 hours)
4. Rate limits: 150 requests/hour per user

### Code Snippet (Python/FastAPI)

```python
import httpx

async def get_fitbit_hrv(access_token: str, date: str):
    """Fetch HRV data from Fitbit API."""
    url = f"https://api.fitbit.com/1/user/-/hrv/date/{date}.json"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        data = response.json()
        
        # Example response:
        # {"hrv": [{"value": {"dailyRmssd": 45, "deepRmssd": 52}}]}
        hrv_value = data['hrv'][0]['value']['dailyRmssd']
        return hrv_value
```

### OAuth Flow

1. Redirect user to: `https://www.fitbit.com/oauth2/authorize?...`
2. User authorizes, redirected back with code
3. Exchange code for access token
4. Store tokens in database (encrypted)

### Effort Estimate

- **OAuth Setup:** 6-8 hours
- **Data Sync Endpoints:** 8-10 hours
- **Token Management:** 4-6 hours
- **Total:** 2-3 days (Medium)

### Cost

- **Free** for personal apps (<100 users)
- **Premium tier**: $500/month for commercial use (>100 users)

---

## ⌚ Garmin Connect API

**Platform:** Cross-platform  
**Access:** Garmin Health API (requires partnership agreement)  
**Coverage:** Advanced HRV, stress score, body battery, sleep

### Unique Features

- **Stress Score**: Proprietary metric (0-100)
- **Body Battery**: Energy level tracking
- **Advanced HRV**: Includes frequency domain analysis

### Implementation Requirements

1. **Partner agreement with Garmin** (for commercial use)
2. OAuth 1.0a (more complex than OAuth 2.0)
3. Webhook notifications for real-time data

### Effort Estimate

- **Total:** 3-5 days (Large) - due to OAuth 1.0a complexity

### Cost

- **Free** for approved health research projects
- **Commercial:** Requires partnership agreement (varies)

---

## 💍 Oura Ring API

**Platform:** Dedicated ring device  
**Access:** OAuth 2.0 Web API  
**Coverage:** Best-in-class sleep, HRV, body temp deviation

### Why Oura?

- **Sleep Staging**: Most accurate consumer device (validated against PSG)
- **Body Temperature**: Nightly deviation from baseline (critical for migraines)
- **Readiness Score**: Combines HRV, sleep, temperature into recovery metric

### Available Endpoints

- `GET /v2/usercollection/daily_sleep`: Sleep stages, efficiency, latency
- `GET /v2/usercollection/daily_readiness`: HRV, RHR, temperature deviation
- `GET /v2/usercollection/heartrate`: Continuous HR data

### Effort Estimate

- **Total:** 2-3 days (Medium)

### Cost

- **Free API** (requires Oura ring: $299-$399 device)
- User must have Oura subscription ($5.99/month)

---

## 🔵 Generic Bluetooth / BLE

**Platform:** iOS, Android  
**Access:** Direct device connection (no cloud API)  
**Coverage:** Any Bluetooth-enabled sensor

### Use Cases

- Real-time HRV during meditation/stress tests
- Continuous temperature monitoring
- Custom medical-grade sensors

### Implementation Requirements

1. **BLE protocol understanding** (GATT services)
2. Device pairing flow
3. Background scanning permissions
4. Battery optimization

### Effort Estimate

- **Per device type:** 5-10 days (Large)
- Highly device-specific

---

## 🎯 Recommended MVP Integration Path

Based on **impact** (from `migraine_features.json`) and **implementation ease**:

### Phase 1: Foundation (MVP)
1. ✅ **Calendar** (Done - Ticket #019)
2. ✅ **Weather** (In Progress - Ticket #023)
3. **Apple Health** - iOS users (high iOS market penetration in health apps)
   - Features: HRV, RHR, Sleep, Activity
   - Effort: Medium (2-3 days)
   - Impact: High (covers 4 high-weight features)

### Phase 2: Android Parity
4. **Fitbit API** - Android + cross-platform
   - Features: Same as Apple Health
   - Effort: Medium (2-3 days)
   - Impact: High (covers remaining Android users)

### Phase 3: Premium Features
5. **Oura Ring** - Power users
   - Features: Best sleep + temperature data
   - Effort: Medium (2-3 days)
   - Impact: Very High for users with devices

### Phase 4: Advanced
6. **Garmin** - Athlete segment
7. **Bluetooth BLE** - Custom sensors

---

## 📊 Impact vs. Effort Matrix

```
High Impact │ Apple Health    Oura Ring
            │     ★             ○
            │
            │ Fitbit
            │   ★
            │
Low Impact  │                  Garmin    BLE
            │                    ○        ○
            └──────────────────────────────────
              Low Effort              High Effort
              
★ = Recommended for MVP
○ = Future consideration
```

---

## 🔐 Privacy & Compliance Considerations

All biometric integrations must address:

1. **GDPR/CCPA Compliance**
   - User consent before data collection
   - Right to deletion
   - Data minimization

2. **HIPAA** (if used in clinical settings)
   - Business Associate Agreements (BAA)
   - Encrypted storage
   - Audit logs

3. **Platform-Specific**
   - Apple: HealthKit privacy policy required
   - Fitbit: Display Fitbit branding
   - Oura: Subscription verification

---

## 📝 Next Steps

1. **Decide on MVP integration** (recommend Apple Health)
2. **Create separate implementation ticket** (e.g., #027_apple_health_integration.md)
3. **Set up developer accounts** (Apple Developer, Fitbit App)
4. **Build prototype** (single feature: HRV)
5. **User testing** (10-20 beta users)
6. **Expand to other platforms** (Fitbit, Oura)

---

## 📚 References

- Apple HealthKit: https://developer.apple.com/documentation/healthkit
- Fitbit Web API: https://dev.fitbit.com/build/reference/web-api/
- Garmin Health API: https://developer.garmin.com/health-api/overview/
- Oura API: https://cloud.ouraring.com/docs/
- React Native Health: https://github.com/agencyenterprise/react-native-health

---

**Note:** This document is **research/documentation only**. No actual API connections are implemented. Separate tickets will be created for actual integrations based on this roadmap.
