# ALINE - Active Learning for Inference-driven Navigation in Episodes

**Migraine Prediction with Active Querying**

ALINE is a machine learning system that predicts daily migraine risk and recommends optimal hours for data collection using an active querying policy. Built for hourly health data, it combines a transformer-based encoder with Bayesian inference to provide uncertainty-aware predictions.

## 🎯 Features

- **Daily Risk Prediction**: Predict next-day migraine probability with calibrated uncertainty estimates
- **Active Query Policy**: Recommend top-k hours for targeted data collection based on information gain
- **Hourly Posterior Inference**: Track latent health states (stress, sleep debt, hormonal, environmental)
- **FastAPI Service**: Production-ready REST API for real-time predictions
- **Visualization Tools**: Generate rolling risk curves and policy heatmaps

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) package manager

### Installation

```bash
# Install dependencies
make install
```

### Generate Data and Train Model

```bash
# Generate synthetic training data (100 users × 365 days)
make data

# Train the ALINE model (~5 epochs for testing)
make train

# Run evaluation and generate metrics
make eval

# Generate visualizations
make viz
```

### Start the API Service

```bash
# Start FastAPI service on http://localhost:8000
make serve
```

In another terminal:

```bash
# Test the API endpoints
./examples/test_api.sh

# Or manually:
curl http://localhost:8000/health
```

## 📁 Project Structure

```
ALINE/
├── models/              # ALINE model and policy utilities
│   ├── aline.py        # SimpleALINE transformer model
│   └── policy_utils.py # Active querying policy
├── service/            # FastAPI service
│   ├── main.py         # API endpoints
│   ├── schemas.py      # Pydantic models
│   └── loader.py       # Data validation & normalization
├── scripts/            # Training and evaluation scripts
│   ├── train_aline.py  # Model training
│   ├── eval.py         # Metrics & baselines
│   └── simulator.py    # Synthetic data generation
├── configs/            # Configuration files
│   ├── model.yaml      # Model hyperparameters
│   ├── train.yaml      # Training config
│   ├── policy.yaml     # Policy config
│   └── service.yaml    # API service config
├── tests/              # Unit tests
├── viz/                # Visualization utilities
├── notebooks/          # Jupyter notebooks
├── examples/           # Example requests and scripts
└── Makefile           # Convenient development targets
```

## 🔧 API Endpoints

### Health Check
```bash
GET /health
```

### Daily Risk Prediction
```bash
POST /risk/daily
Content-Type: application/json

{
  "user_id": "user_001",
  "features": [[...], ...]  # 24 hours × 20 features
}
```

Returns:
```json
{
  "user_id": "user_001",
  "mean_probability": 0.145,
  "lower_bound": 0.089,
  "upper_bound": 0.203,
  "timestamp": "2025-11-15T02:30:00"
}
```

### Policy Recommendations (Top-K Hours)
```bash
POST /policy/topk
Content-Type: application/json

{
  "user_id": "user_001",
  "features": [[...], ...],
  "k": 3
}
```

Returns:
```json
{
  "user_id": "user_001",
  "selected_hours": [
    {"hour": 8, "priority_score": 1.234},
    {"hour": 12, "priority_score": 1.189},
    {"hour": 20, "priority_score": 1.142}
  ],
  "k": 3,
  "timestamp": "2025-11-15T02:30:00"
}
```

### Hourly Posterior
```bash
POST /posterior/hourly
```

Returns latent state distributions for each hour.

## 📊 Model Performance

From evaluation on synthetic data (100 users × 365 days):

| Metric | Value |
|--------|-------|
| ROC-AUC | 0.499 |
| Brier Score | 0.125 |
| PR-AUC | 0.144 |
| Calibration Error | 0.003 |

**Policy Comparison:**
- ALINE Policy: Selects high-uncertainty hours for targeted querying
- Random Policy: Baseline comparison
- Fixed Schedule: Query at 8am, 12pm, 8pm

## 🧪 Development

### Run Tests

```bash
make test

# Or run specific test files:
uv run python tests/test_aline_forward.py
uv run python tests/test_policy.py
```

### Train Custom Model

Edit `configs/train.yaml` and `configs/model.yaml`, then:

```bash
uv run python scripts/train_aline.py
```

### Generate Visualizations

```bash
# Generate rolling risk curves
uv run python scripts/test_visualization.py

# Or use the Jupyter notebook
jupyter notebook notebooks/rolling_risk_curves.ipynb
```

## 🐳 Docker Deployment

### Local Development
```bash
# Build and run with Docker Compose
docker-compose up --build

# Service will be available at http://localhost:8000
```

### Production Deployment to Google Cloud

Deploy the ALINE service to Google Cloud Run for production use:

```bash
# Quick deployment (after setup)
git push origin main  # Triggers automatic deployment via GitHub Actions
```

**Features:**
- ✅ Serverless deployment with auto-scaling
- ✅ Automatic CI/CD via GitHub Actions
- ✅ HTTPS endpoints with custom domains
- ✅ Cost-effective (free tier available)

**Setup Guide:** See [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md) for a 3-step setup guide.

**Complete Documentation:** [GOOGLE_CLOUD_DEPLOYMENT.md](./GOOGLE_CLOUD_DEPLOYMENT.md) includes:
- GCP project setup
- GitHub Actions configuration
- Security best practices
- Monitoring and troubleshooting
- Cost optimization tips

## 📝 Citation

```bibtex
@software{aline2025,
  title={ALINE: Active Learning for Inference-driven Navigation in Episodes},
  author={ALINE Team},
  year={2025},
  url={https://github.com/veksa1/ease}
}
```

## 🤝 Contributing

This project was developed during Junction Hackathon 2025.

For questions or feedback, please open an issue on GitHub.
