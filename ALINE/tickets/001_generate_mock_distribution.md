# 🧠 Ticket 001 – Generate Initial Mock Distribution for ALINE

**Date:** 2025-11-15  
**Owner:** Data / Modelling  
**Status:** 🔧 To Do  
**Goal:** Create a mock multidimensional Gaussian + logistic simulator from clinical migraine features to pretrain ALINE’s inference model.

---

## 🎯 Objective

We need a synthetic dataset that mimics the joint feature distribution of migraine risk factors as derived from clinical trial data.

This mock dataset will serve as:
- The **prior** and **posterior reference** for ALINE’s warm-up phase (`qϕ` pretraining).  
- A source of synthetic `D_T` episodes for initial amortized inference training.

---

## 📂 Inputs

File: `data/migraine_prediction.xlsx`  
Expected columns:
| category | variable | Description | Weight | Typical Range | Normalized range (1-10) | Migrane impact pattern |
|----------|------|-----|-----|-----|------------|
| ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... |

---

## 🧩 Tasks

### 1. Parse Feature Table
```python
import pandas as pd
df = pd.read_excel("data/migraine_prediction.xlsx")

# Fill missing stats
df['mean'] = df['mean'].fillna(df['min'] + (df['max'] - df['min']) / 2)
df['std'] = df['std'].fillna((df['max'] - df['min']) / 4)
```

### 2. Build Multivariate Gaussian

Use relevance scores to scale covariances.

```python
import numpy as np
mu = df['mean'].values
std = df['std'].values
relevance = df['relevance'].values / df['relevance'].max()

corr = np.outer(relevance, relevance)
np.fill_diagonal(corr, 1)
Sigma = np.diag(std) @ corr @ np.diag(std)

samples = np.random.multivariate_normal(mu, Sigma, size=5000)
```

### 3. Generate Migraine Probability

Define logistic model with β ∝ relevance.

```python
from scipy.special import expit
beta = relevance / relevance.sum()
logits = samples @ beta * 0.5 - 1.0
p_migraine = expit(logits)
y = np.random.binomial(1, p_migraine)
```

### 4. Estimate Posterior (Mock)

Compute mean/covariance of features given migraine occurrence.

```python
X_pos = samples[y == 1]
mu_post = X_pos.mean(axis=0)
Sigma_post = np.cov(X_pos, rowvar=False)
```

### 5. Save Distributions

Store synthetic prior & posterior for reuse.

```python
import pickle
mock_data = dict(
    features=df['Feature'].tolist(),
    mu_prior=mu,
    Sigma_prior=Sigma,
    mu_post=mu_post,
    Sigma_post=Sigma_post,
    samples=samples,
    migraine=y,
)
with open("data/mock_distribution.pkl", "wb") as f:
    pickle.dump(mock_data, f)
```

---

## 🧠 Integration with ALINE

Use this generator for ALINE’s warm-up stage (`E_warm` in Algorithm 1):

* **Prior** → `p(θ)` : sample μ, Σ from mock priors
* **Likelihood** → `p(y|x, θ)` : logistic simulator above
* **Context set** → random subset of (x, y) per episode

Future steps:

* Add reinforcement learning policy πψ after warm-up.
* Replace mock priors with learned Bayesian parameters once trial data access is available.

---

## 🧪 Validation Checklist

* [ ] Correlation heatmap matches clinical intuition (e.g. sleep ↓ → migraine ↑).
* [ ] `p_migraine` distribution unimodal and within [0, 1].
* [ ] Posterior mean differs meaningfully from prior mean.
* [ ] Export `.pkl` and `.csv` verified in `notebooks/mock_data_inspect.ipynb`.

---

## 📎 Output Files

```
data/
 ├── migraine_prediction.xlsx
 ├── mock_distribution.pkl
 └── mock_distribution.csv
```

---

## ✅ Deliverables

* [ ] `scripts/generate_mock_distribution.py` (based on this ticket)
* [ ] `notebooks/mock_distribution_demo.ipynb` for visualization
* [ ] Verified artifacts under `/data/`

---

> *“Train the inference before the intelligence.” – ALINE warm-up principle*

```

