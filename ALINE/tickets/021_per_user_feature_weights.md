# 👤 Ticket 021 – Implement Per-User Feature Weight Learning

**Date:** 2025-11-16  
**Owner:** ML Engineering  
**Status:** ⏸️ HOLD - Blocked by Real Data Validation
**Decision:** SKIP for MVP based on personalization study results  
**Priority:** High  
**Effort:** Large (2-3 days)

---

## ⚠️ BLOCKING ISSUE - DO NOT IMPLEMENT

**Personalization study (notebooks/personalization_study.ipynb) showed:**
- Baseline model: AUC 0.73 ✅
- User embeddings: AUC 0.61 ❌ (overfitting)
- Hierarchical Bayesian: AUC 0.50 ❌ (failed)

**Root cause:** Insufficient data per user (2,400 samples vs. 10,000+ needed)

**Decision:** Wait for real production data showing user heterogeneity before implementing.

**Criteria to unblock:**
1. Collect 50+ users with 1000+ days each
2. Demonstrate significant inter-user weight variance (σ > 0.3)
3. Re-run study on real data
4. Only proceed if personalized > baseline

---

## 🎯 Original Objective (For Reference)

Replace fixed migraine prediction weights with user-specific learned embeddings to capture individual trigger profiles. Different users have different migraine triggers—this ticket enables the model to learn personalized risk patterns.

---

## 📊 Background

**Current Implementation:**
- Fixed weights: `w = [0.5, 0.4, 0.45, 0.35]` (stress, sleep debt, hormonal, environmental)
- Bias: `b = -1.8`
- Same logistic regression for ALL users: `p = sigmoid(w @ latent_mean + b)`

**Problem:**
- User A: Triggered primarily by sleep (w_sleep should be high)
- User B: Triggered primarily by weather (w_env should be high)
- Current model averages across all users, missing individual patterns

**Solution:**
- Learn user-specific weight vectors `w_u` conditioned on user_id
- Initialize with global priors from `migraine_features.json`
- Allow adaptation while preventing extreme deviations (regularization)

---

## 🧩 Tasks

### 1. Add User Embedding Layer

**File:** `models/aline.py`

Add user embedding to ALINE model:

```python
class ALINE(nn.Module):
    def __init__(self, config, num_users=1000):
        super().__init__()
        
        # Existing architecture
        self.input_proj = nn.Linear(config.in_dim, config.d_model)
        self.transformer = TransformerEncoder(...)
        self.posterior_head = GaussianHead(...)
        self.policy_head = nn.Linear(...)
        
        # NEW: User-specific embeddings
        self.user_embedding = nn.Embedding(
            num_embeddings=num_users,
            embedding_dim=config.user_embed_dim  # e.g., 16
        )
        
        # NEW: Personalized prediction head
        # Input: [latent_dim + user_embed_dim] → Output: 1 (logit)
        self.personalized_head = nn.Sequential(
            nn.Linear(config.z_dim + config.user_embed_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1)
        )
        
        # Initialize weights using priors from migraine_features.json
        self._initialize_from_priors(config.feature_priors)
    
    def _initialize_from_priors(self, priors):
        """Initialize personalized head with clinical priors."""
        # Load weight_prior and migraine_impact_pattern from JSON
        # Use as initialization for first layer weights
        pass
    
    def forward(self, x, user_ids):
        """
        Args:
            x: [B, T, in_dim] - feature sequences
            user_ids: [B] - user identifiers
        Returns:
            posteriors, policy_scores, migraine_logits
        """
        # Existing forward pass
        h = self.input_proj(x)
        h = self.transformer(h)
        
        # Posterior and policy (unchanged)
        mu_z, log_sigma_z = self.posterior_head(h)
        policy_scores = self.policy_head(h).squeeze(-1)
        
        # NEW: Personalized migraine prediction
        latent_final = mu_z[:, -1, :]  # [B, z_dim]
        user_embed = self.user_embedding(user_ids)  # [B, user_embed_dim]
        
        combined = torch.cat([latent_final, user_embed], dim=-1)  # [B, z_dim + embed_dim]
        migraine_logit = self.personalized_head(combined).squeeze(-1)  # [B]
        
        return {
            'mu_z': mu_z,
            'log_sigma_z': log_sigma_z,
            'policy_scores': policy_scores,
            'migraine_logit': migraine_logit
        }
```

### 2. Update Training Data

**File:** `scripts/augment_features.py`

Add user_id column to training CSV:

```python
def generate_dataset(num_users=100, episodes_per_user=50):
    """Generate synthetic data with user IDs."""
    data = []
    
    for user_id in range(num_users):
        # Generate user-specific trigger profile
        user_profile = sample_user_profile()  # Individual w_stress, w_sleep, etc.
        
        for episode in range(episodes_per_user):
            episode_data = simulate_episode(user_id, user_profile)
            episode_data['user_id'] = user_id
            data.append(episode_data)
    
    df = pd.DataFrame(data)
    return df
```

### 3. Add Weight Regularization

**File:** `scripts/train_aline.py`

Add regularization loss to keep weights near priors:

```python
def compute_regularization_loss(model, priors, lambda_reg=0.1):
    """
    Regularize user embeddings toward clinical priors.
    
    Prevents overfitting while allowing personalization.
    Note: In production, overfitting is less critical (per user feedback),
    but we keep this for interpretability and stability.
    """
    # Extract learned weights from personalized_head
    learned_weights = model.personalized_head[0].weight  # [32, z_dim + embed_dim]
    
    # Compare to prior distributions from migraine_features.json
    # L2 penalty = ||learned - prior||^2
    reg_loss = lambda_reg * torch.norm(learned_weights - prior_weights)
    
    return reg_loss

# In training loop
total_loss = posterior_loss + policy_loss + migraine_loss + compute_regularization_loss(model, priors)
```

### 4. Initialize from Feature Priors

**File:** `models/aline.py` (continuation)

```python
def _initialize_from_priors(self, priors_path='data/migraine_features.json'):
    """Use weight_prior and impact_pattern from clinical data."""
    import json
    
    with open(priors_path) as f:
        features = json.load(f)['variables']
    
    # Extract high-weight features
    high_weight_features = [f for f in features if f['weight_prior'] >= 0.8]
    
    # Use impact patterns to initialize first layer biases
    # Features with steeper impact patterns get higher initial weights
    for feature in high_weight_features:
        pattern = feature['migraine_impact_pattern']
        # Compute gradient: how steeply risk increases
        gradient = np.mean(np.diff(pattern))
        # Use as initialization weight...
```

### 5. Create User Profile Endpoint

**File:** `service/main.py`

```python
@app.get("/user/{user_id}/trigger_profile")
async def get_trigger_profile(user_id: str):
    """
    Return learned feature importance for specific user.
    
    Returns:
        {
            "user_id": "user123",
            "trigger_weights": {
                "stress": 0.85,
                "sleep_debt": 0.62,
                "hormonal": 0.43,
                "environmental": 0.71
            },
            "top_triggers": [
                {"name": "Stress Level", "weight": 0.85, "category": "Manual"},
                {"name": "Barometric Pressure", "weight": 0.71, "category": "Environment"}
            ],
            "personalization_confidence": 0.78  # Based on number of data points
        }
    """
    # Extract user embedding and decode weights
    user_idx = user_id_to_idx[user_id]
    user_embed = model.user_embedding.weight[user_idx].detach().cpu().numpy()
    
    # Decode embedding to interpretable weights
    weights = decode_user_weights(user_embed)
    
    return {
        "user_id": user_id,
        "trigger_weights": weights,
        "top_triggers": get_top_triggers(weights),
        "personalization_confidence": compute_confidence(user_id)
    }
```

### 6. Update Configuration

**File:** `configs/train.yaml`

```yaml
model:
  in_dim: 24
  d_model: 64
  z_dim: 4
  user_embed_dim: 16  # NEW
  num_users: 1000  # NEW - adjust based on dataset
  
training:
  lambda_reg: 0.1  # NEW - regularization strength
  feature_priors: "data/migraine_features.json"  # NEW
```

---

## ✅ Acceptance Criteria

- [ ] Model accepts `user_id` tensor input alongside feature sequences
- [ ] User embedding layer initialized with sensible defaults
- [ ] Per-user weights visualizable via API endpoint
- [ ] Cross-user validation shows personalized model improves per-user AUC by ≥10%
- [ ] Regularization prevents weight explosions (all weights within [-3, 3])
- [ ] Feature importance heatmap shows interpretable patterns
- [ ] Documentation explains personalization mechanism

---

## 📈 Expected Impact

- **Per-user AUC**: +10-20% improvement over global model
- **Interpretability**: Users see "YOUR top triggers are: Stress (85%), Weather (71%)"
- **Adaptation**: Model learns individual patterns after 20-50 episodes
- **Cold start**: New users start with global priors, improve over time

---

## 🔬 Validation Plan

Create ablation study comparing:

1. **Global model**: Fixed weights for all users
2. **User embeddings**: This implementation
3. **User embeddings + regularization**: This implementation with L2 penalty
4. **User embeddings + priors**: Initialize from `migraine_features.json`

Metrics:
- Per-user AUC
- Calibration (Brier score)
- Weight stability over time
- Interpretability score (human evaluation)

---

## 🔗 Related Tickets

- #020: Temporal features (will have user-specific temporal patterns)
- #022: Information gain queries (will use user-specific weights for prioritization)
- #026: Feedback loop (will update user weights based on outcomes)

---

## 📚 References

- `data/migraine_features.json` - Feature priors and impact patterns
- Androulakis, X. M., et al. (2018). "Individualized migraine triggers."
- Personalized medicine approaches in headache disorders
