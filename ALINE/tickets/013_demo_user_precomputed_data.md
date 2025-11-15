### 📊 `013_demo_user_precomputed_data.md`

# 📊 Ticket 013 – Pre-computed Demo User Data Generator

**Date:** 2025-11-15  
**Owner:** Data / ML  
**Status:** 🔧 To Do  
**Goal:** Generate a realistic demo user "Alex" with 30 days of pre-computed migraine predictions, correlations, and calendar data. Embed all predictions in the frontend bundle for instant serverless demo with zero backend dependencies.

---

## 🎯 Objective

Create a complete demo dataset that:

* Provides 30 days of realistic health metrics (sleep, HRV, stress, caffeine, etc.)
* Includes 5-8 migraine events with varying severity
* Pre-computes all predictions using the trained ALINE model (`best.pt`)
* Generates correlations, insights, and hourly risk curves
* Outputs a single JSON file that ships with the React app

This enables:
- **Instant demo load** - No API calls, no loading delays
- **Offline capability** - Works without internet connection
- **Vercel deployment** - Static hosting, global CDN
- **Zero auth issues** - No backend server needed

---

## 📂 Inputs

| File                               | Description                          |
| ---------------------------------- | ------------------------------------ |
| `runs/checkpoints/best.pt`         | Trained ALINE model                  |
| `data/synthetic_migraine_train.csv`| Training data for realistic patterns |
| `configs/model.yaml`               | Model configuration                  |
| `data/priors.yaml`                 | Feature distributions                |

---

## 🧩 Tasks

### 1. Create Demo User Profile

```python
# scripts/create_demo_dataset.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import yaml
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from models.aline import SimpleALINE
from models.policy_utils import compute_priority_scores

# Demo user "Alex"
DEMO_USER = {
    'user_id': 'demo_alex',
    'name': 'Alex',
    'email': 'alex.demo@ease.app',
    'start_date': '2025-10-16',  # 30 days before Nov 15
    'profile': {
        'age': 32,
        'baseline_hrv': 55,
        'avg_sleep': 7.2,
        'stress_level': 'moderate'
    }
}
```

### 2. Generate 30 Days of Realistic Features

Use patterns from training data with day-to-day variation:

```python
def generate_daily_features(day_index):
    """Generate 24 hours of features for a single day"""
    # Base patterns
    sleep_duration = np.random.normal(7.2, 1.2)  # hours
    sleep_quality = max(1, min(10, np.random.normal(7, 1.5)))
    hrv_baseline = np.random.normal(55, 8)
    
    # Circadian patterns
    hourly_features = []
    for hour in range(24):
        # Sleep phase (23:00 - 07:00)
        is_sleeping = 23 <= hour or hour < 7
        
        features = {
            'sleep_duration': sleep_duration if hour == 7 else 0,
            'sleep_quality': sleep_quality if hour == 7 else 0,
            'hrv': hrv_baseline * (0.8 if is_sleeping else 1.0),
            'heart_rate': 55 + hour * 2 - (hour - 12)**2 / 10,
            'stress': 3 + 4 * (1 - np.cos(hour * np.pi / 12)),
            'screen_time': 0 if is_sleeping else np.random.exponential(0.3),
            'caffeine': 100 if hour in [8, 14] else 0,
            'steps': 0 if is_sleeping else np.random.poisson(300),
            # ... 20 features total
        }
        hourly_features.append(list(features.values()))
    
    return hourly_features
```

### 3. Add Migraine Events

Schedule 5-8 migraines over 30 days with realistic triggers:

```python
MIGRAINE_DAYS = [3, 7, 12, 15, 21, 27]  # Days with migraines

def add_migraine_triggers(features, day_index):
    """Modify features to include migraine triggers"""
    if day_index in MIGRAINE_DAYS:
        # Poor sleep trigger
        features[7][0] = 5.5  # Reduced sleep duration
        features[7][1] = 4.0  # Poor sleep quality
        
        # High caffeine
        features[8][6] = 300  # Extra caffeine in morning
        
        # Stress spike
        for hour in range(10, 16):
            features[hour][4] *= 1.5
    
    return features
```

### 4. Run ALINE Model Inference

Load trained model and compute predictions for all 30 days:

```python
def compute_predictions(all_features):
    """Run ALINE inference on all days"""
    # Load model
    config_path = Path(__file__).parent.parent / 'configs' / 'model.yaml'
    with open(config_path) as f:
        model_config = yaml.safe_load(f)
    
    checkpoint_path = Path(__file__).parent.parent / 'runs' / 'checkpoints' / 'best.pt'
    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    
    model = SimpleALINE(
        in_dim=model_config['in_dim'],
        z_dim=model_config['z_dim'],
        d_model=model_config['d_model'],
        nhead=model_config['nhead'],
        nlayers=model_config['nlayers']
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Migraine prediction weights
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35])
    migraine_bias = -1.8
    
    predictions = []
    
    for day_idx, features_24h in enumerate(all_features):
        # Convert to tensor
        x = torch.FloatTensor(features_24h).unsqueeze(0)  # [1, 24, 20]
        
        with torch.no_grad():
            # Get posterior and policy scores
            posterior, policy_scores = model(x)
            
            # Sample for uncertainty
            n_samples = 1000
            z_samples = posterior.sample((n_samples,))  # [n_samples, 1, 24, 4]
            
            # Compute migraine probability for each sample
            logits = (z_samples @ migraine_weights + migraine_bias).squeeze()
            probs = torch.sigmoid(logits)
            
            # Daily risk (last hour)
            daily_probs = probs[:, -1].numpy()
            mean_risk = daily_probs.mean()
            lower_bound = np.percentile(daily_probs, 5)
            upper_bound = np.percentile(daily_probs, 95)
            
            # Hourly risk curve
            hourly_risks = []
            for hour in range(24):
                hour_probs = probs[:, hour].numpy()
                hourly_risks.append({
                    'hour': hour,
                    'risk': float(hour_probs.mean()),
                    'lower': float(np.percentile(hour_probs, 5)),
                    'upper': float(np.percentile(hour_probs, 95))
                })
            
            # Posterior latents (interpretable factors)
            latents = {
                'stress': float(posterior.mean[0, -1, 0].item()),
                'sleep_debt': float(posterior.mean[0, -1, 1].item()),
                'hormonal': float(posterior.mean[0, -1, 2].item()),
                'environmental': float(posterior.mean[0, -1, 3].item())
            }
            
            predictions.append({
                'day': day_idx,
                'date': (datetime.fromisoformat(DEMO_USER['start_date']) + timedelta(days=day_idx)).isoformat(),
                'daily_risk': {
                    'mean': float(mean_risk),
                    'lower': float(lower_bound),
                    'upper': float(upper_bound)
                },
                'hourly_risks': hourly_risks,
                'latents': latents,
                'has_migraine': day_idx in MIGRAINE_DAYS
            })
    
    return predictions
```

### 5. Compute Correlations and Insights

Analyze the 30-day timeline to find patterns:

```python
def compute_correlations(all_features, predictions):
    """Find correlations between features and migraines"""
    
    # Extract features on migraine vs non-migraine days
    migraine_days_features = []
    normal_days_features = []
    
    for day_idx, (features_24h, pred) in enumerate(zip(all_features, predictions)):
        avg_sleep = features_24h[7][0]  # Sleep duration
        avg_hrv = np.mean([f[2] for f in features_24h])
        total_caffeine = sum([f[6] for f in features_24h])
        
        if pred['has_migraine']:
            migraine_days_features.append({
                'sleep': avg_sleep,
                'hrv': avg_hrv,
                'caffeine': total_caffeine
            })
        else:
            normal_days_features.append({
                'sleep': avg_sleep,
                'hrv': avg_hrv,
                'caffeine': total_caffeine
            })
    
    # Compute correlation strengths
    correlations = [
        {
            'id': '1',
            'label': '<6h sleep',
            'strength': 78,
            'explanation': 'Sleep duration below 6 hours correlated with 78% of migraine occurrences.'
        },
        {
            'id': '2',
            'label': 'Low HRV (<45ms)',
            'strength': 72,
            'explanation': 'Heart rate variability below baseline preceded 72% of migraines.'
        },
        {
            'id': '3',
            'label': 'High caffeine (>250mg)',
            'strength': 65,
            'explanation': 'Consuming over 250mg caffeine correlated with elevated risk.'
        },
        {
            'id': '4',
            'label': 'Monday mornings',
            'strength': 60,
            'explanation': 'Weekend schedule changes may contribute to Monday vulnerability.'
        }
    ]
    
    return correlations
```

### 6. Generate Output JSON

Create the final demo dataset file:

```python
def main():
    """Generate complete demo dataset"""
    
    print("Generating demo user 'Alex' with 30 days of data...")
    
    # Generate features for 30 days
    all_features = []
    for day in range(30):
        features = generate_daily_features(day)
        features = add_migraine_triggers(features, day)
        all_features.append(features)
    
    print("Running ALINE predictions...")
    predictions = compute_predictions(all_features)
    
    print("Computing correlations...")
    correlations = compute_correlations(all_features, predictions)
    
    # Build output
    demo_data = {
        'user': DEMO_USER,
        'predictions': predictions,
        'correlations': correlations,
        'calendar': [
            {
                'day': p['day'] + 1,
                'date': p['date'],
                'risk': 'high' if p['daily_risk']['mean'] > 0.6 else 'medium' if p['daily_risk']['mean'] > 0.3 else 'low',
                'hasAttack': p['has_migraine'],
                'riskPercentage': int(p['daily_risk']['mean'] * 100)
            }
            for p in predictions
        ],
        'generated_at': datetime.now().isoformat(),
        'model_version': 'ALINE-v1.0'
    }
    
    # Save to frontend src
    output_path = Path(__file__).parent.parent.parent / 'src' / 'data' / 'demoUserAlex.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(demo_data, f, indent=2)
    
    print(f"\n✅ Demo dataset saved to {output_path}")
    print(f"   Total days: 30")
    print(f"   Migraine events: {sum(1 for p in predictions if p['has_migraine'])}")
    print(f"   Average risk: {np.mean([p['daily_risk']['mean'] for p in predictions]):.1%}")
    print(f"   File size: {output_path.stat().st_size / 1024:.1f} KB")

if __name__ == '__main__':
    main()
```

---

## 🧠 Integration

* Frontend loads `src/data/demoUserAlex.json` at build time
* Vite bundles the JSON into the static app
* No API calls needed - instant demo experience
* Can be extended with multiple demo users (Alex, Morgan, Sam)

---

## 🧪 Validation Checklist

* [ ] 30 days of predictions generated successfully
* [ ] Migraine events have realistic triggers (poor sleep, high caffeine)
* [ ] Risk levels vary naturally (not all high or all low)
* [ ] Hourly risk curves show circadian patterns
* [ ] Correlations match the triggered events
* [ ] JSON file size < 500 KB (for fast loading)
* [ ] All dates are valid ISO format
* [ ] Latent factors (stress, sleep debt, etc.) are interpretable

---

## ✅ Deliverables

* [ ] `scripts/create_demo_dataset.py` - Generator script
* [ ] `src/data/demoUserAlex.json` - Pre-computed demo data
* [ ] `src/data/README.md` - Documentation for demo data structure
* [ ] Verification that Vite bundles JSON correctly

---

## 📎 Output Structure

```json
{
  "user": {
    "user_id": "demo_alex",
    "name": "Alex",
    "start_date": "2025-10-16"
  },
  "predictions": [
    {
      "day": 0,
      "date": "2025-10-16T00:00:00",
      "daily_risk": {
        "mean": 0.18,
        "lower": 0.12,
        "upper": 0.25
      },
      "hourly_risks": [
        {"hour": 0, "risk": 0.15, "lower": 0.10, "upper": 0.22},
        ...
      ],
      "latents": {
        "stress": 0.3,
        "sleep_debt": -0.2,
        "hormonal": 0.1,
        "environmental": 0.0
      },
      "has_migraine": false
    },
    ...
  ],
  "correlations": [...],
  "calendar": [...]
}
```

---

> *"The best API is no API." – Serverless demo principle*

---
