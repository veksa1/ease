# ALINE Scripts

## generate_mock_distribution.py

**Ticket:** 001 - Generate Initial Mock Distribution for ALINE

### Purpose
Creates a synthetic dataset that mimics the joint feature distribution of migraine risk factors for ALINE's warm-up phase (qϕ pretraining).

### Usage
```bash
uv run python scripts/generate_mock_distribution.py
```

### What it does
1. **Loads feature data** from `data/migraine_prediction.xlsx`
2. **Builds multivariate Gaussian** using relevance scores to scale covariances
3. **Generates 5000 samples** from the distribution
4. **Computes migraine probabilities** using a logistic model (β ∝ relevance)
5. **Estimates posterior** distribution conditioned on migraine occurrence
6. **Saves distributions** as pickle and CSV for reuse

### Output Files
- `data/mock_distribution.pkl` - Complete distribution data for ALINE training
- `data/mock_distribution.csv` - Human-readable sample data
- `data/mock_distribution_summary.csv` - Summary statistics

### Integration with ALINE
Use the generated mock distribution for ALINE's warm-up stage:
- **Prior** → `p(θ)`: sample μ, Σ from mock priors
- **Likelihood** → `p(y|x, θ)`: logistic simulator
- **Context set** → random subset of (x, y) per episode

### Validation
Run the notebook `notebooks/mock_distribution_demo.ipynb` to:
- Visualize correlation heatmap
- Verify migraine probability distribution
- Compare prior vs posterior distributions
- Validate feature distributions by migraine status
