# 🎯 Ticket 022 – Add Information Gain-Based Query Recommendations

**Date:** 2025-11-16  
**Owner:** ML Engineering  
**Status:** 🔧 To Do  
**Priority:** High  
**Effort:** Medium (1-2 days)

---

## 🎯 Objective

Extend active learning policy to recommend both **temporal queries** (when to measure) AND **feature queries** (what to measure), prioritizing highest information gain. Show users the most impactful measurements to make.

---

## 📊 Background

**Current Implementation:**
- Policy head outputs per-timestep scores: `[B, 24]`
- Recommends "check stress at 2pm, 6pm, 9pm"
- Only temporal dimension—assumes all features measured

**Problem:**
- Users can't measure everything continuously
- Some features are expensive/inconvenient (blood draw, manual logging)
- Wasteful to measure low-impact features

**Solution:**
- Compute feature-level information gain: ∂p/∂x_i
- Recommend **both** when to measure AND what to measure
- Example: "Measure your HRV at 2pm for +15% prediction improvement"

---

## 🧩 Tasks

### 1. Implement Feature-Level Information Gain

**File:** `models/policy_utils.py`

Add feature sensitivity calculation:

```python
import torch

def compute_feature_information_gain(model, x, user_id, feature_availability):
    """
    Compute information gain for each feature at each timestep.
    
    Args:
        model: ALINE model
        x: [B, T, F] input features
        user_id: [B] user IDs
        feature_availability: [B, T, F] binary mask (1=available, 0=missing)
    
    Returns:
        feature_gains: [B, T, F] information gain scores per feature
    """
    x.requires_grad = True
    
    # Forward pass
    outputs = model(x, user_id)
    migraine_logit = outputs['migraine_logit']
    migraine_prob = torch.sigmoid(migraine_logit)
    
    # Compute gradient of prediction w.r.t. each input feature
    grad_outputs = torch.ones_like(migraine_prob)
    gradients = torch.autograd.grad(
        outputs=migraine_prob,
        inputs=x,
        grad_outputs=grad_outputs,
        create_graph=True
    )[0]  # [B, T, F]
    
    # Information gain = |gradient| × uncertainty × (1 - availability)
    uncertainty = migraine_prob * (1 - migraine_prob)  # [B]
    uncertainty = uncertainty.unsqueeze(1).unsqueeze(2)  # [B, 1, 1]
    
    feature_gains = (
        torch.abs(gradients) *  # Sensitivity
        uncertainty *  # Prediction uncertainty
        (1 - feature_availability)  # Boost missing features
    )
    
    return feature_gains  # [B, T, F]


def get_priority_queries(
    model, 
    x, 
    user_id, 
    feature_availability,
    feature_names,
    k_temporal=3,
    k_features=5
):
    """
    Get top-k temporal and feature queries.
    
    Returns:
        {
            "temporal_queries": [
                {"hour": 14, "score": 0.87, "features": ["HRV", "Stress"]},
                {"hour": 18, "score": 0.82, "features": ["Sleep Quality"]},
                {"hour": 21, "score": 0.79, "features": ["Screen Time"]}
            ],
            "feature_queries": [
                {"feature": "HRV", "score": 0.92, "best_hour": 14},
                {"feature": "Stress Level", "score": 0.88, "best_hour": 18},
                {"feature": "Barometric Pressure", "score": 0.85, "best_hour": 14}
            ]
        }
    """
    # Get feature-level information gain
    feature_gains = compute_feature_information_gain(
        model, x, user_id, feature_availability
    )  # [B, T, F]
    
    # Temporal queries: max across features per timestep
    temporal_scores = feature_gains.max(dim=-1).values  # [B, T]
    top_temporal_indices = torch.topk(temporal_scores, k_temporal, dim=-1).indices  # [B, k]
    
    # Feature queries: max across timesteps per feature
    feature_scores = feature_gains.max(dim=1).values  # [B, F]
    top_feature_indices = torch.topk(feature_scores, k_features, dim=-1).indices  # [B, k]
    
    # Format results
    batch_results = []
    for b in range(x.shape[0]):
        # Temporal queries
        temporal_queries = []
        for i in range(k_temporal):
            hour_idx = top_temporal_indices[b, i].item()
            score = temporal_scores[b, hour_idx].item()
            
            # Find which features are most important at this hour
            hour_feature_gains = feature_gains[b, hour_idx]
            top_features_at_hour = torch.topk(hour_feature_gains, 3).indices
            feature_list = [feature_names[idx.item()] for idx in top_features_at_hour]
            
            temporal_queries.append({
                "hour": hour_idx,
                "score": float(score),
                "features": feature_list
            })
        
        # Feature queries
        feature_queries = []
        for i in range(k_features):
            feat_idx = top_feature_indices[b, i].item()
            score = feature_scores[b, feat_idx].item()
            
            # Find best hour to measure this feature
            best_hour = feature_gains[b, :, feat_idx].argmax().item()
            
            feature_queries.append({
                "feature": feature_names[feat_idx],
                "score": float(score),
                "best_hour": best_hour
            })
        
        batch_results.append({
            "temporal_queries": temporal_queries,
            "feature_queries": feature_queries
        })
    
    return batch_results
```

### 2. Update Service Endpoint

**File:** `service/main.py`

```python
from models.policy_utils import get_priority_queries

@app.post("/queries/recommended")
async def get_recommended_queries(request: QueryRequest):
    """
    Return both temporal and feature-level query recommendations.
    
    Request body:
        {
            "user_id": "user123",
            "current_features": [...],  # 24-hour history
            "available_features": [...],  # Binary mask of what's measured
            "k_temporal": 3,
            "k_features": 5
        }
    
    Response:
        {
            "temporal_queries": [
                {
                    "hour": 14,
                    "score": 0.87,
                    "features": ["HRV", "Stress Level", "Sleep Quality"],
                    "recommendation": "Best time to log data today"
                }
            ],
            "feature_queries": [
                {
                    "feature": "HRV",
                    "score": 0.92,
                    "best_hour": 14,
                    "category": "Biometrics",
                    "weight": "High",
                    "recommendation": "Measure HRV at 2pm for maximum insight"
                }
            ],
            "impact_estimate": "Following these recommendations could improve prediction accuracy by ~15%"
        }
    """
    # Parse request
    user_id = request.user_id
    x = torch.tensor(request.current_features).unsqueeze(0)  # [1, 24, F]
    feature_availability = torch.tensor(request.available_features).unsqueeze(0)
    
    # Get feature metadata
    with open('data/migraine_features.json') as f:
        feature_metadata = json.load(f)['variables']
    feature_names = [f['variable'] for f in feature_metadata]
    
    # Compute queries
    results = get_priority_queries(
        model=model,
        x=x,
        user_id=torch.tensor([user_id_to_idx[user_id]]),
        feature_availability=feature_availability,
        feature_names=feature_names,
        k_temporal=request.k_temporal or 3,
        k_features=request.k_features or 5
    )[0]  # First batch element
    
    # Enrich with metadata
    for fq in results['feature_queries']:
        feat_meta = next(f for f in feature_metadata if f['variable'] == fq['feature'])
        fq['category'] = feat_meta['category']
        fq['weight'] = feat_meta['weight']
        fq['recommendation'] = f"Measure {fq['feature']} at {fq['best_hour']}:00 for maximum insight"
    
    # Estimate impact
    avg_score = np.mean([fq['score'] for fq in results['feature_queries']])
    impact_estimate = f"Following these recommendations could improve prediction accuracy by ~{int(avg_score * 20)}%"
    
    return {
        **results,
        "impact_estimate": impact_estimate
    }
```

### 3. Add Feature Availability Tracking

**File:** `service/schemas.py`

```python
from pydantic import BaseModel
from typing import List, Optional

class QueryRequest(BaseModel):
    user_id: str
    current_features: List[List[float]]  # [24, num_features]
    available_features: List[List[int]]  # [24, num_features] binary mask
    k_temporal: Optional[int] = 3
    k_features: Optional[int] = 5

class FeatureQuery(BaseModel):
    feature: str
    score: float
    best_hour: int
    category: str
    weight: str
    recommendation: str

class TemporalQuery(BaseModel):
    hour: int
    score: float
    features: List[str]
    recommendation: str

class QueryResponse(BaseModel):
    temporal_queries: List[TemporalQuery]
    feature_queries: List[FeatureQuery]
    impact_estimate: str
```

### 4. Create Frontend Integration

**File:** `service/README.md` (API documentation)

Add example usage:

```markdown
## Query Recommendations API

### POST `/queries/recommended`

Get smart recommendations for what and when to measure.

**Example Request:**
```json
{
  "user_id": "user123",
  "current_features": [[...], [...], ...],  // 24 hours of data
  "available_features": [[1, 0, 1, ...], ...],  // 1=measured, 0=missing
  "k_temporal": 3,
  "k_features": 5
}
```

**Example Response:**
```json
{
  "temporal_queries": [
    {
      "hour": 14,
      "score": 0.87,
      "features": ["HRV", "Stress Level"],
      "recommendation": "Best time to log data today"
    }
  ],
  "feature_queries": [
    {
      "feature": "HRV",
      "score": 0.92,
      "best_hour": 14,
      "category": "Biometrics",
      "weight": "High",
      "recommendation": "Measure HRV at 2pm for maximum insight"
    }
  ],
  "impact_estimate": "Following these recommendations could improve prediction accuracy by ~18%"
}
```
```

---

## ✅ Acceptance Criteria

- [ ] API returns both temporal AND feature queries
- [ ] Features with missing data get boosted scores
- [ ] UI displays actionable recommendations with impact estimates
- [ ] Gradient-based sensitivity calculation runs efficiently (<200ms)
- [ ] Simulation shows 20% fewer total measurements for same prediction accuracy
- [ ] Feature queries respect user-specific weights (from Ticket #021)
- [ ] Documentation includes usage examples

---

## 📈 Expected Impact

- **Measurement burden**: Reduce by 20-30% while maintaining accuracy
- **User engagement**: Clear actionable items increase compliance
- **Prediction quality**: Focus on high-impact features improves signal
- **Battery life**: Fewer sensor queries = longer device runtime

**Example User Experience:**
```
🎯 Today's Priority Measurements

⏰ When to measure:
  • 2:00 PM (High priority) - Check HRV and Stress
  • 6:00 PM (Medium) - Log Sleep Quality
  
📊 What to track:
  • HRV (Impact: +18%) - Use wearable at 2pm
  • Stress Level (Impact: +15%) - Quick check-in at 6pm
  • Barometric Pressure (Impact: +12%) - Auto-fetched from weather API
```

---

## 🔬 Validation Plan

Run simulation study:

1. **Baseline**: Measure all features at all times
2. **Random sampling**: Randomly select k features/times
3. **Temporal only**: Current policy head (when, not what)
4. **Feature only**: Best features, all times
5. **Combined (this ticket)**: Smart when + what selection

Metrics:
- Prediction AUC at different measurement budgets (10%, 25%, 50%, 75%)
- User burden (total measurements per day)
- Cost-effectiveness (AUC gain per measurement)

---

## 🔗 Related Tickets

- #021: Per-user weights (feature importance is user-specific)
- #024: Sensor integration roadmap (determines which features are expensive)
- #026: Feedback loop (validate if recommended queries actually helped)

---

## 📚 References

- Settles, B. (2009). "Active Learning Literature Survey."
- Information gain in Bayesian experimental design
- `models/policy_utils.py` - Current temporal query implementation
