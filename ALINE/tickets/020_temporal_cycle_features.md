# 🕐 Ticket 020 – Add Temporal Cycle Features (Day of Week, Week of Year)

**Date:** 2025-11-16  
**Owner:** Data/Backend  
**Status:** 🔧 To Do  
**Priority:** Medium  
**Effort:** Small (4-6 hours)

---

## 🎯 Objective

Extend the feature set with cyclical time encodings to capture weekly and seasonal migraine patterns. Many migraine sufferers experience patterns related to work schedules (weekday vs. weekend) and seasonal changes.

---

## 📊 Background

Current ALINE model operates on 24-hour sequences but doesn't capture:
- **Weekly patterns**: Work stress cycles, weekend recovery, "Sunday migraine" phenomenon
- **Seasonal patterns**: Seasonal affective disorder, allergy seasons, daylight changes

Research shows:
- 40% of migraine patients report weekend migraines (stress letdown effect)
- Seasonal variations in migraine frequency (peaks in spring/fall)

---

## 🧩 Tasks

### 1. Add Temporal Features to Data Pipeline

**File:** `data/priors.yaml`

Add cyclical encodings (using sine/cosine to preserve periodicity):

```yaml
# Temporal cycle features
day_of_week_sin:
  mean: 0.0
  std: 0.707  # std of sin(uniform) ≈ 1/√2
  min: -1.0
  max: 1.0
  distribution: "cyclical"
  
day_of_week_cos:
  mean: 0.0
  std: 0.707
  min: -1.0
  max: 1.0
  distribution: "cyclical"
  
week_of_year_sin:
  mean: 0.0
  std: 0.707
  min: -1.0
  max: 1.0
  distribution: "cyclical"
  
week_of_year_cos:
  mean: 0.0
  std: 0.707
  min: -1.0
  max: 1.0
  distribution: "cyclical"
```

### 2. Update Simulator

**File:** `scripts/simulator.py`

Add temporal feature generation:

```python
import numpy as np
from datetime import datetime

def add_temporal_features(df):
    """Add cyclical temporal encodings to dataframe."""
    # Assuming df has a 'timestamp' column
    df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek
    df['week_of_year'] = pd.to_datetime(df['timestamp']).dt.isocalendar().week
    
    # Cyclical encoding
    df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    df['week_of_year_sin'] = np.sin(2 * np.pi * df['week_of_year'] / 52)
    df['week_of_year_cos'] = np.cos(2 * np.pi * df['week_of_year'] / 52)
    
    return df
```

### 3. Update Feature Configuration

**File:** `configs/train.yaml`

Update feature count and order:

```yaml
model:
  in_dim: 24  # Was 20, now 20 + 4 temporal features
  
# Add to feature_order list
feature_order:
  - Sleep Duration
  - Sleep Quality
  # ... existing 20 features ...
  - day_of_week_sin
  - day_of_week_cos
  - week_of_year_sin
  - week_of_year_cos
```

### 4. Update Data Augmentation

**File:** `scripts/augment_features.py`

Ensure temporal features are generated for all synthetic data:

```python
# In generate_episode() or similar function
timestamps = pd.date_range(start=episode_start, periods=24, freq='H')
df['timestamp'] = timestamps
df = add_temporal_features(df)
```

### 5. Retrain and Evaluate

Run training pipeline:

```bash
uv run python scripts/train_aline.py --config configs/train.yaml --experiment temporal_features
```

Perform ablation study:
- Baseline: Original 20 features
- With daily cycles: 20 + 2 (day_of_week only)
- With seasonal cycles: 20 + 2 (week_of_year only)
- Full temporal: 20 + 4 (both)

### 6. Validate Feature Importance

Create analysis notebook to visualize:
- Feature attention weights from Transformer
- Correlation between temporal features and migraine occurrence
- Improved prediction on weekend vs. weekday events

---

## ✅ Acceptance Criteria

- [ ] Model input shape changes from `[B, 24, 20]` → `[B, 24, 24]`
- [ ] All temporal features use cyclical encoding (sin/cos pairs)
- [ ] Feature order documented in `configs/train.yaml`
- [ ] Simulator generates realistic temporal patterns
- [ ] Ablation study shows temporal features reduce validation loss by ≥3%
- [ ] No performance regression on existing test cases
- [ ] Documentation updated with temporal feature rationale

---

## 📈 Expected Impact

- **AUC improvement**: +2-5% on validation set
- **Weekend prediction**: +10-15% accuracy for Saturday/Sunday migraines
- **Seasonal awareness**: Model captures spring/fall peaks
- **Interpretability**: Users can see "you tend to have migraines on Mondays"

---

## 🔗 Related Tickets

- #021: Per-user feature weights (will show individual temporal patterns)
- #025: Feature expansion (temporal features are part of 25+ schema)

---

## 📚 References

- Cainazzo, M. M., et al. (2016). "Weekly and seasonal patterns of migraine." _Cephalalgia_.
- Torelli, P., et al. (2009). "Weekend and holiday headaches: stress-related phenomena?"
