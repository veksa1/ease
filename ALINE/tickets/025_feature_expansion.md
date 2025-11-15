# 📊 Ticket 025 – Feature Expansion to 25-Variable Schema

**Date:** 2025-11-16  
**Owner:** Data Engineering  
**Status:** 🔧 To Do  
**Priority:** High  
**Effort:** Large (2-3 days)

---

## 🎯 Objective

Add missing biometric, demographic, and medical features from `data/migraine_features.json` to complete the feature set. Expand from current 20 features to full 25+ variable schema.

---

## 📊 Background

**Current Feature Count:** 20 features  
**Target Feature Count:** 35 features (25 from JSON + 4 temporal from #020 + 6 existing extras)

**Missing High-Impact Features:**
- HRV (High weight: 1.0)
- Body Temperature Change (Medium weight: 0.7)
- Barometric Pressure Change (High weight: 1.0) - currently only base pressure
- Air Quality Index (Medium weight: 0.6)
- Prodrome Symptoms (High weight: 1.0) - very strong indicator
- Migraine History (High weight: 1.0)

**Missing Demographics:**
- Age (Medium weight: 0.6)
- Body Weight (Low-Med weight: 0.4)
- BMI (Medium weight: 0.6)

---

## 🧩 Tasks

### 1. Update Feature Priors Configuration

**File:** `data/priors.yaml`

Add normalization statistics for new features:

```yaml
# ============================================================================
# BIOMETRIC FEATURES (New)
# ============================================================================

HRV:
  description: "Heart Rate Variability (SDNN)"
  mean: 50.0
  std: 30.0
  min: 10.0
  max: 120.0
  unit: "ms"
  distribution: "lognormal"
  weight_prior: 1.0
  category: "Biometrics"
  migraine_impact_pattern: [10, 10, 9, 8, 6, 4, 3, 2, 1, 1]

Resting_Heart_Rate:
  description: "Resting heart rate"
  mean: 70.0
  std: 12.0
  min: 45.0
  max: 100.0
  unit: "bpm"
  distribution: "normal"
  weight_prior: 0.6
  category: "Biometrics"
  migraine_impact_pattern: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

Body_Temperature_Change:
  description: "Change from baseline body temperature"
  mean: 0.0
  std: 0.3
  min: -1.0
  max: 1.0
  unit: "°C"
  distribution: "normal"
  weight_prior: 0.7
  category: "Biometrics"
  migraine_impact_pattern: [10, 6, 1, 4, 7, 8, 9, 10, 10, 10]

# ============================================================================
# ENVIRONMENTAL FEATURES (Extended)
# ============================================================================

Barometric_Pressure_Change:
  description: "Change in barometric pressure over 3 hours"
  mean: 0.0
  std: 3.0
  min: 0.0
  max: 20.0
  unit: "hPa"
  distribution: "exponential"
  weight_prior: 1.0
  category: "Environment"
  migraine_impact_pattern: [1, 1, 2, 3, 4, 5, 6, 7, 9, 10]

Air_Quality_Index:
  description: "Air quality index (AQI)"
  mean: 50.0
  std: 40.0
  min: 0.0
  max: 300.0
  unit: "AQI"
  distribution: "lognormal"
  weight_prior: 0.6
  category: "Environment"
  migraine_impact_pattern: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

Altitude:
  description: "Current altitude/elevation"
  mean: 100.0
  std: 200.0
  min: 0.0
  max: 4000.0
  unit: "meters"
  distribution: "lognormal"
  weight_prior: 0.6
  category: "Environment"
  migraine_impact_pattern: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# ============================================================================
# MANUAL TRACKING FEATURES (Extended)
# ============================================================================

Prodrome_Symptoms:
  description: "Intensity of prodrome symptoms (yawning, neck stiffness, mood changes)"
  mean: 2.0
  std: 2.5
  min: 0.0
  max: 10.0
  unit: "scale"
  distribution: "exponential"
  weight_prior: 1.0
  category: "Manual"
  migraine_impact_pattern: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# ============================================================================
# DEMOGRAPHIC FEATURES (New)
# ============================================================================

Age:
  description: "User age in years"
  mean: 35.0
  std: 12.0
  min: 18.0
  max: 80.0
  unit: "years"
  distribution: "normal"
  weight_prior: 0.6
  category: "Demographics"
  migraine_impact_pattern: [3, 5, 7, 9, 10, 8, 6, 5, 4, 3]

Body_Weight:
  description: "Body weight in kilograms"
  mean: 70.0
  std: 15.0
  min: 40.0
  max: 150.0
  unit: "kg"
  distribution: "normal"
  weight_prior: 0.4
  category: "Demographics"
  migraine_impact_pattern: [6, 5, 4, 3, 2, 3, 5, 7, 9, 10]

BMI:
  description: "Body Mass Index"
  mean: 24.0
  std: 5.0
  min: 15.0
  max: 40.0
  unit: "kg/m²"
  distribution: "normal"
  weight_prior: 0.6
  category: "Demographics"
  migraine_impact_pattern: [5, 4, 3, 2, 2, 3, 4, 6, 8, 9]

# ============================================================================
# MEDICAL HISTORY (New)
# ============================================================================

Migraine_History_Years:
  description: "Years since first migraine"
  mean: 5.0
  std: 8.0
  min: 0.0
  max: 40.0
  unit: "years"
  distribution: "exponential"
  weight_prior: 1.0
  category: "Medical"
  migraine_impact_pattern: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

### 2. Update Simulator to Generate New Features

**File:** `scripts/simulator.py`

Add generation logic for new features:

```python
import numpy as np
from scipy.stats import lognorm, expon

def generate_biometric_features(num_samples, user_profile):
    """Generate biometric features with realistic correlations."""
    
    # HRV (inversely correlated with stress)
    stress_level = user_profile.get('stress_baseline', 5.0)
    hrv_mean = 70 - (stress_level * 5)  # Higher stress → lower HRV
    hrv = np.clip(
        np.random.lognormal(np.log(hrv_mean), 0.3, num_samples),
        10, 120
    )
    
    # Resting Heart Rate (correlated with fitness, stress)
    fitness = user_profile.get('fitness_level', 5.0)
    rhr_mean = 80 - (fitness * 2) + (stress_level * 1.5)
    rhr = np.clip(
        np.random.normal(rhr_mean, 12, num_samples),
        45, 100
    )
    
    # Body Temperature Change (small random fluctuations + fever spikes)
    temp_change = np.random.normal(0, 0.2, num_samples)
    # Occasional fever (5% chance)
    fever_mask = np.random.random(num_samples) < 0.05
    temp_change[fever_mask] += np.random.uniform(0.5, 1.5, fever_mask.sum())
    temp_change = np.clip(temp_change, -1, 1)
    
    return {
        'HRV': hrv,
        'Resting_Heart_Rate': rhr,
        'Body_Temperature_Change': temp_change
    }


def generate_environmental_features(num_samples, location_profile):
    """Generate environmental features based on location."""
    
    # Barometric Pressure Change (weather-dependent)
    # Most days stable, occasional fronts cause large changes
    pressure_change = np.abs(np.random.normal(0, 2, num_samples))
    # 10% chance of significant pressure change
    front_mask = np.random.random(num_samples) < 0.1
    pressure_change[front_mask] += np.random.uniform(5, 15, front_mask.sum())
    pressure_change = np.clip(pressure_change, 0, 20)
    
    # Air Quality Index (location-dependent)
    base_aqi = location_profile.get('base_aqi', 50)
    aqi = np.clip(
        np.random.lognormal(np.log(base_aqi), 0.5, num_samples),
        0, 300
    )
    
    # Altitude (mostly constant for user, with travel variation)
    base_altitude = location_profile.get('altitude', 100)
    altitude = np.random.normal(base_altitude, 50, num_samples)
    altitude = np.clip(altitude, 0, 4000)
    
    return {
        'Barometric_Pressure_Change': pressure_change,
        'Air_Quality_Index': aqi,
        'Altitude': altitude
    }


def generate_prodrome_symptoms(num_samples, migraine_days):
    """
    Generate prodrome symptoms (appear 24-48h before migraine).
    
    Args:
        migraine_days: Binary array indicating migraine occurrence
    """
    prodrome = np.zeros(num_samples)
    
    # For each migraine, add prodrome 1-2 days before
    for i, has_migraine in enumerate(migraine_days):
        if has_migraine and i > 1:
            # 80% chance of prodrome symptoms
            if np.random.random() < 0.8:
                # Symptoms appear 1-2 days before
                onset = max(0, i - np.random.randint(1, 3))
                prodrome[onset:i] = np.random.uniform(4, 9)
    
    return prodrome


def generate_demographic_features(user_profile):
    """Generate static demographic features (constant per user)."""
    
    # Age (sampled once, stays constant)
    age = user_profile.get('age', np.random.normal(35, 12))
    age = np.clip(age, 18, 80)
    
    # Body Weight (slow drift over time)
    base_weight = user_profile.get('weight', np.random.normal(70, 15))
    weight = np.clip(base_weight, 40, 150)
    
    # BMI (calculated from weight and height)
    height = user_profile.get('height', np.random.normal(1.70, 0.1))
    bmi = weight / (height ** 2)
    bmi = np.clip(bmi, 15, 40)
    
    # Migraine History
    migraine_years = user_profile.get('migraine_history', np.random.exponential(5))
    migraine_years = np.clip(migraine_years, 0, 40)
    
    return {
        'Age': age,
        'Body_Weight': weight,
        'BMI': bmi,
        'Migraine_History_Years': migraine_years
    }


# Update main simulation function
def simulate_user_episode(user_id, episode_length=720):  # 30 days × 24 hours
    """Generate complete episode with all 35 features."""
    
    # Generate user profile
    user_profile = sample_user_profile(user_id)
    location_profile = sample_location_profile(user_id)
    
    # Demographics (constant)
    demographics = generate_demographic_features(user_profile)
    
    # Time-varying features
    biometrics = generate_biometric_features(episode_length, user_profile)
    environment = generate_environmental_features(episode_length, location_profile)
    
    # ... existing feature generation (sleep, stress, etc.) ...
    
    # Generate migraine outcomes first
    migraine_outcomes = generate_migraine_outcomes(
        latent_states, biometrics, environment, demographics
    )
    
    # Prodrome depends on future migraines
    prodrome = generate_prodrome_symptoms(episode_length, migraine_outcomes)
    
    # Combine all features
    features = {
        **biometrics,
        **environment,
        'Prodrome_Symptoms': prodrome,
        # Broadcast demographics across all timesteps
        'Age': np.full(episode_length, demographics['Age']),
        'Body_Weight': np.full(episode_length, demographics['Body_Weight']),
        'BMI': np.full(episode_length, demographics['BMI']),
        'Migraine_History_Years': np.full(episode_length, demographics['Migraine_History_Years']),
        # ... existing features ...
    }
    
    return pd.DataFrame(features)
```

### 3. Update Training Configuration

**File:** `configs/train.yaml`

```yaml
model:
  in_dim: 35  # Was 20, now 35 (includes 4 temporal from #020)
  d_model: 64  # May need to increase to 128 for higher capacity
  
# Update feature order (CRITICAL - index alignment)
feature_order:
  # Existing 20 features
  - Sleep Duration
  - Sleep Quality
  - Sleep Consistency Score
  - Stress Level
  - Work Hours
  - Anxiety Score
  - Caffeine Intake
  - Water Intake
  - Meal Regularity
  - Exercise Duration
  - Physical Activity Level
  - Neck Tension
  - Screen Time
  - Weather Pressure
  - Noise Level
  - Hormone Fluctuation Index
  - Menstrual Cycle Day
  - Alcohol Consumption
  - Smoking
  - Meditation Time
  
  # New biometric features
  - HRV
  - Resting Heart Rate
  - Body Temperature Change
  
  # Extended environmental features
  - Barometric Pressure Change
  - Air Quality Index
  - Altitude
  
  # Extended manual features
  - Prodrome Symptoms
  
  # Demographics
  - Age
  - Body Weight
  - BMI
  
  # Medical history
  - Migraine History Years
  
  # Temporal features (from #020)
  - day_of_week_sin
  - day_of_week_cos
  - week_of_year_sin
  - week_of_year_cos
```

### 4. Update Data Augmentation Script

**File:** `scripts/augment_features.py`

```python
def augment_dataset_with_new_features(input_csv, output_csv):
    """
    Augment existing 20-feature dataset with 15 new features.
    
    For testing: generate synthetic values for new features.
    For production: collect from sensors/APIs.
    """
    df = pd.read_csv(input_csv)
    
    # Load priors
    with open('data/priors.yaml') as f:
        priors = yaml.safe_load(f)
    
    # Add new features with realistic distributions
    for feature_name in ['HRV', 'Resting_Heart_Rate', 'Body_Temperature_Change',
                         'Barometric_Pressure_Change', 'Air_Quality_Index', 
                         'Altitude', 'Prodrome_Symptoms', 'Age', 'Body_Weight', 
                         'BMI', 'Migraine_History_Years']:
        
        prior = priors[feature_name]
        
        if prior['distribution'] == 'normal':
            values = np.random.normal(prior['mean'], prior['std'], len(df))
        elif prior['distribution'] == 'lognormal':
            values = np.random.lognormal(np.log(prior['mean']), 0.5, len(df))
        elif prior['distribution'] == 'exponential':
            values = np.random.exponential(prior['mean'], len(df))
        else:
            values = np.random.uniform(prior['min'], prior['max'], len(df))
        
        # Clip to valid range
        values = np.clip(values, prior['min'], prior['max'])
        df[feature_name] = values
    
    # Add temporal features
    df = add_temporal_features(df)  # From #020
    
    # Validate feature count
    assert len(df.columns) >= 35, f"Expected 35+ features, got {len(df.columns)}"
    
    df.to_csv(output_csv, index=False)
    print(f"Augmented dataset saved: {output_csv}")
    print(f"Feature count: {len(df.columns)}")
```

### 5. Add Data Collection Forms (Frontend)

**File:** `docs/FEATURE_COLLECTION_UI.md`

Document UI requirements for manual features:

```markdown
## Manual Feature Collection UI

### Prodrome Symptoms Tracker

**When:** Daily check-in (morning)

**UI:**
```
Did you experience any of these symptoms yesterday?

[ ] Excessive yawning
[ ] Neck stiffness
[ ] Mood changes (irritability, depression)
[ ] Food cravings
[ ] Frequent urination
[ ] Difficulty concentrating

Intensity: [slider 0-10]
```

### Demographic Onboarding

**When:** First-time user setup

**UI:**
```
Help us personalize your experience:

Age: [__ years]
Weight: [__ kg] or [__ lbs]
Height: [__ cm] or [__ ft __ in]

When did you experience your first migraine?
[__ years ago] or [Select year: dropdown]
```

### Biometric Integration Prompts

**If no wearable connected:**
```
📱 Connect a wearable to track:
  • Heart Rate Variability (HRV)
  • Resting Heart Rate
  • Body Temperature

[Connect Apple Health] [Connect Fitbit] [Skip]
```
```

### 6. Update Normalization Pipeline

**File:** `scripts/normalize_features.py`

```python
def normalize_all_features(df, priors):
    """Apply z-score normalization to all 35 features."""
    
    normalized_df = df.copy()
    
    for feature_name in df.columns:
        if feature_name in priors:
            prior = priors[feature_name]
            mean = prior['mean']
            std = prior['std']
            
            # Z-score normalization
            normalized_df[feature_name] = (df[feature_name] - mean) / std
    
    return normalized_df
```

### 7. Validate Feature Correlations

Create validation notebook to check realistic correlations:

**File:** `notebooks/feature_validation_v2.ipynb`

```python
# Check expected correlations
assert correlation(HRV, Stress) < -0.3, "HRV should be negatively correlated with stress"
assert correlation(RHR, Physical_Activity) > 0.2, "RHR increases during activity"
assert correlation(Prodrome, Migraine_next_day) > 0.5, "Prodrome predicts migraines"
```

---

## ✅ Acceptance Criteria

- [ ] `data/priors.yaml` includes all 11 new features with normalization stats
- [ ] `scripts/simulator.py` generates realistic synthetic data for new features
- [ ] `configs/train.yaml` updated: `in_dim: 35`, feature_order documented
- [ ] Model architecture handles increased input dimensionality
- [ ] Data validation ensures ranges respected (no negative HRV, etc.)
- [ ] Feature correlations match clinical expectations
- [ ] Documentation updated with new feature descriptions
- [ ] Ablation study shows new features improve AUC

---

## 📈 Expected Impact

- **AUC improvement**: +8-12% from high-weight features (HRV, Prodrome, Pressure Change)
- **Personalization**: Demographics enable user-specific baseline adjustment
- **Coverage**: All features from `migraine_features.json` now supported
- **Clinical validity**: Prodrome symptoms provide 24-48h early warning

**Feature Impact Estimates:**
- Prodrome Symptoms: +5-7% AUC (strongest predictor)
- HRV: +3-4% AUC
- Barometric Pressure Change: +2-3% AUC
- Demographics (Age, BMI): +1-2% AUC (baseline adjustment)

---

## 🔬 Validation Plan

### Ablation Study

Train models with progressive feature addition:

1. Baseline: Original 20 features
2. +Temporal: 20 + 4 (#020)
3. +Biometrics: 24 + 3 (HRV, RHR, Temp)
4. +Environment: 27 + 3 (Pressure Δ, AQI, Altitude)
5. +Manual: 30 + 1 (Prodrome)
6. +Demographics: 31 + 3 (Age, Weight, BMI)
7. Full: 34 + 1 (Migraine History) = **35 features**

Metrics:
- Per-stage AUC improvement
- Feature importance (SHAP values)
- Prediction calibration (reliability diagram)

---

## 🔗 Related Tickets

- #020: Temporal features (already adds 4 features)
- #021: Per-user weights (will use new feature priors)
- #023: OpenWeather API (auto-populates pressure change, AQI)
- #024: Sensor roadmap (biometrics from wearables)

---

## 📚 References

- `data/migraine_features.json` - Source of truth for feature schema
- Clinical migraine research on prodrome symptoms
- HRV and migraine: Autonomic dysfunction studies
- Barometric pressure sensitivity: Weather trigger literature
