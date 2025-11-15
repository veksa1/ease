# ALINE API Reference

Complete API documentation for the ALINE Migraine Prediction Service.

**Base URL:** `http://localhost:8000` (local) or your deployed Cloud Run URL

---

## 📋 Table of Contents

- [Authentication](#authentication)
- [Core Prediction Endpoints](#core-prediction-endpoints)
  - [Health Check](#health-check)
  - [Daily Risk Prediction](#daily-risk-prediction)
  - [Hourly Posterior Distributions](#hourly-posterior-distributions)
  - [Policy Recommendations (Top-K Hours)](#policy-recommendations-top-k-hours)
- [Calendar Integration Endpoints](#calendar-integration-endpoints)
  - [Save Calendar Connection](#save-calendar-connection)
  - [Get Calendar Status](#get-calendar-status)
  - [Delete Calendar Connection](#delete-calendar-connection)
  - [Generate Context from Calendar](#generate-context-from-calendar)
- [Data Formats](#data-formats)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Authentication

Currently, the API does not require authentication. User identification is handled via `user_id` in request bodies.

---

## Core Prediction Endpoints

### Health Check

Check if the service is running and the model is loaded.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T14:30:00",
  "model_loaded": true
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Model not loaded

---

### Daily Risk Prediction

Predict daily migraine risk from 24 hours of normalized feature data.

**Endpoint:** `POST /risk/daily`

**Request Body:**
```json
{
  "user_id": "user_001",
  "features": [
    [0.5, 0.3, 0.2, ..., 0.1],  // Hour 0 (midnight) - 20 features
    [0.4, 0.5, 0.3, ..., 0.2],  // Hour 1
    ...
    [0.6, 0.4, 0.1, ..., 0.3]   // Hour 23
  ]
}
```

**⚠️ CRITICAL: Feature Format Requirements**
- **Exactly 24 arrays** (one per hour, midnight to 11pm)
- **Exactly 20 features per hour** (see [Feature List](#feature-list))
- All features must be **normalized to [-1, 1]** range
- Features must be provided in the correct order

**Response:**
```json
{
  "user_id": "user_001",
  "mean_probability": 0.145,
  "lower_bound": 0.089,
  "upper_bound": 0.203,
  "timestamp": "2025-11-15T14:30:00"
}
```

**Response Fields:**
- `mean_probability`: Mean migraine probability (0.0 to 1.0)
- `lower_bound`: 5th percentile of probability distribution
- `upper_bound`: 95th percentile of probability distribution
- `timestamp`: ISO 8601 timestamp of prediction

**Status Codes:**
- `200 OK` - Prediction successful
- `400 Bad Request` - Invalid input (wrong number of hours/features)
- `500 Internal Server Error` - Model inference error
- `503 Service Unavailable` - Model not loaded

**Common Errors:**

```json
// Wrong number of hours
{
  "detail": "Expected 24 hours of features, got 12"
}

// Wrong feature dimension (MOST COMMON ERROR)
{
  "detail": "mat1 and mat2 shapes cannot be multiplied (24x10 and 20x64)"
}
// This means you provided 10 features per hour instead of 20
```

---

### Hourly Posterior Distributions

Get the latent state posterior distributions for each hour of the day.

**Endpoint:** `POST /posterior/hourly`

**Request Body:**
```json
{
  "user_id": "user_001",
  "features": [[...], [...], ...]  // 24 hours × 20 features
}
```

**Response:**
```json
{
  "user_id": "user_001",
  "hourly_posteriors": [
    {
      "hour": 0,
      "mean": [0.23, -0.45, 0.12, 0.67],  // [stress, sleepDebt, hormonal, envLoad]
      "std": [0.15, 0.22, 0.18, 0.20]
    },
    {
      "hour": 1,
      "mean": [0.25, -0.42, 0.14, 0.65],
      "std": [0.14, 0.21, 0.17, 0.19]
    },
    ...
  ],
  "timestamp": "2025-11-15T14:30:00"
}
```

**Latent State Dimensions:**
1. `stress`: Stress level
2. `sleepDebt`: Sleep debt accumulation
3. `hormonal`: Hormonal fluctuations
4. `envLoad`: Environmental load (noise, light, pressure, etc.)

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid input
- `503 Service Unavailable` - Model not loaded

---

### Policy Recommendations (Top-K Hours)

Get recommendations for the most informative hours to collect data, based on uncertainty and potential impact.

**Endpoint:** `POST /policy/topk`

**Request Body:**
```json
{
  "user_id": "user_001",
  "features": [[...], [...], ...],  // 24 hours × 20 features
  "k": 3  // Number of hours to recommend (1-24)
}
```

**Response:**
```json
{
  "user_id": "user_001",
  "selected_hours": [
    {
      "hour": 8,
      "priority_score": 1.234
    },
    {
      "hour": 12,
      "priority_score": 1.189
    },
    {
      "hour": 20,
      "priority_score": 1.142
    }
  ],
  "k": 3,
  "timestamp": "2025-11-15T14:30:00"
}
```

**Priority Score Calculation:**
Priority scores combine:
- **Entropy** (λ₁ = 1.0): Uncertainty in latent state
- **Uncertainty** (λ₂ = 0.5): Variance in predictions
- **Gradient** (λ₃ = 0.3): Impact on migraine risk

Higher scores indicate more valuable data collection opportunities.

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid k value or input format
- `503 Service Unavailable` - Model not loaded

---

## Calendar Integration Endpoints

### Save Calendar Connection

Save a user's calendar ICS/WebCal URL for context generation.

**Endpoint:** `POST /user/calendar`

**Request Body:**
```json
{
  "userId": "user_001",
  "calendarUrl": "webcal://calendar.google.com/calendar/ical/example%40gmail.com/private-abc123/basic.ics"
}
```

**Response:**
```json
{
  "status": "ok",
  "userId": "user_001",
  "lastVerifiedAt": "2025-11-15T14:30:00",
  "message": "Calendar connected successfully"
}
```

**Supported URL Formats:**
- `webcal://` - WebCal URLs (automatically converted to https://)
- `https://` - Direct HTTPS URLs to ICS files
- Google Calendar, Outlook, Apple Calendar, etc.

**Status Codes:**
- `200 OK` - Calendar saved successfully
- `400 Bad Request` - Invalid URL format
- `500 Internal Server Error` - Database or validation error

---

### Get Calendar Status

Check if a user has a calendar connected.

**Endpoint:** `GET /user/calendar/{user_id}`

**Response:**
```json
{
  "connected": true,
  "userId": "user_001",
  "lastVerifiedAt": "2025-11-15T14:30:00"
}
```

**Status Codes:**
- `200 OK` - Status retrieved (connected or not)

---

### Delete Calendar Connection

Remove a user's calendar connection.

**Endpoint:** `DELETE /user/calendar/{user_id}`

**Response:**
```json
{
  "status": "ok",
  "message": "Calendar connection deleted"
}
```

**Status Codes:**
- `200 OK` - Deleted successfully
- `404 Not Found` - No calendar connection found

---

### Generate Context from Calendar

Analyze calendar events to generate context-aware feature priors.

**Endpoint:** `POST /aline/generate-context`

**Request Body:**
```json
{
  "userId": "user_001",
  "priors": {
    "stress": {"mean": 0.5, "std": 0.2},
    "sleepDebt": {"mean": 0.3, "std": 0.15},
    "hormonal": {"mean": 0.0, "std": 0.1},
    "envLoad": {"mean": 0.4, "std": 0.18}
  }
}
```

**Response:**
```json
{
  "userId": "user_001",
  "posteriors": {
    "stress": {"mean": 0.65, "std": 0.18},
    "sleepDebt": {"mean": 0.35, "std": 0.14},
    "hormonal": {"mean": 0.05, "std": 0.09},
    "envLoad": {"mean": 0.55, "std": 0.16}
  },
  "features": [0.45, 0.32, ...],  // Updated feature vector (20 values)
  "timestamp": "2025-11-15T14:30:00"
}
```

**Requirements:**
- User must have a calendar connected (see [Save Calendar Connection](#save-calendar-connection))
- n8n webhook must be configured in `configs/service.yaml`

**Status Codes:**
- `200 OK` - Context generated successfully
- `404 Not Found` - No calendar connected for user
- `500 Internal Server Error` - n8n workflow error

---

## Data Formats

### Feature List

All prediction endpoints require **exactly 20 features per hour** in this order:

| Index | Feature Name | Description | Typical Range |
|-------|-------------|-------------|---------------|
| 0 | Sleep Duration | Hours of sleep | 3-12 h |
| 1 | Sleep Quality | Quality score | 1-10 |
| 2 | Sleep Consistency | Consistency score | 1-10 |
| 3 | Stress Level | Stress score | 1-10 |
| 4 | Work Hours | Hours worked | 0-16 h |
| 5 | Anxiety Score | Anxiety level | 1-10 |
| 6 | Caffeine Intake | Milligrams consumed | 0-500 mg |
| 7 | Water Intake | Liters consumed | 0-5 L |
| 8 | Meal Regularity | Regularity score | 1-10 |
| 9 | Exercise Duration | Minutes of exercise | 0-180 min |
| 10 | Physical Activity Level | Activity score | 1-10 |
| 11 | Neck Tension | Tension score | 1-10 |
| 12 | Screen Time | Hours on screens | 0-24 h |
| 13 | Weather Pressure | Atmospheric pressure | 950-1050 hPa |
| 14 | Noise Level | Ambient noise | 30-100 dB |
| 15 | Temperature Change | Temperature delta | -20 to +20°C |
| 16 | Light Exposure | Light level | 0-100 klux |
| 17 | Medication Taken | Boolean (0 or 1) | 0-1 |
| 18 | Alcohol Consumed | Standard drinks | 0-10 |
| 19 | Hormonal Phase | Menstrual cycle day | 1-28 |

**Normalization:** All features should be normalized to approximately [-1, 1] range using their typical ranges.

### Feature Normalization Example

```python
# Example: Normalizing caffeine intake (0-500 mg range)
raw_value = 200  # mg
min_val = 0
max_val = 500
normalized = 2 * (raw_value - min_val) / (max_val - min_val) - 1
# Result: normalized = -0.2
```

---

## Error Handling

### Standard Error Response

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid input data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server-side error
- `503 Service Unavailable` - Service not ready (model not loaded)

### Common Errors and Solutions

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `mat1 and mat2 shapes cannot be multiplied (24x10 and 20x64)` | Wrong feature count | Ensure each hour has exactly 20 features |
| `Expected 24 hours of features, got X` | Wrong hour count | Provide exactly 24 hourly arrays |
| `Model not loaded` | Service starting up | Wait a few seconds and retry |
| `No calendar connected for this user` | Missing calendar | Call `/user/calendar` first |

---

## Examples

### Python Example

```python
import requests
import numpy as np

BASE_URL = "http://localhost:8000"

# Generate sample normalized features (24 hours × 20 features)
features = np.random.randn(24, 20).tolist()

# Daily risk prediction
response = requests.post(
    f"{BASE_URL}/risk/daily",
    json={
        "user_id": "user_001",
        "features": features
    }
)

print(response.json())
# Output:
# {
#   "user_id": "user_001",
#   "mean_probability": 0.145,
#   "lower_bound": 0.089,
#   "upper_bound": 0.203,
#   "timestamp": "2025-11-15T14:30:00"
# }
```

### JavaScript Example

```javascript
const BASE_URL = "http://localhost:8000";

// Generate sample features
const features = Array.from({ length: 24 }, () => 
  Array.from({ length: 20 }, () => Math.random() * 2 - 1)
);

// Get policy recommendations
const response = await fetch(`${BASE_URL}/policy/topk`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user_001',
    features: features,
    k: 3
  })
});

const data = await response.json();
console.log(data.selected_hours);
// Output: [{ hour: 8, priority_score: 1.234 }, ...]
```

### cURL Example

```bash
# Health check
curl http://localhost:8000/health

# Daily risk prediction (use a JSON file)
curl -X POST http://localhost:8000/risk/daily \
  -H "Content-Type: application/json" \
  -d @request.json

# Save calendar connection
curl -X POST http://localhost:8000/user/calendar \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_001",
    "calendarUrl": "webcal://calendar.google.com/calendar/ical/example%40gmail.com/private-abc123/basic.ics"
  }'
```

### PowerShell Example

```powershell
# Generate random features (24 hours × 20 features)
$features = @()
for ($i = 0; $i -lt 24; $i++) {
    $hour = @()
    for ($j = 0; $j -lt 20; $j++) {
        $hour += (Get-Random -Minimum -1.0 -Maximum 1.0)
    }
    $features += ,@($hour)
}

# Make request
$body = @{
    user_id = "user_001"
    features = $features
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Method Post -Uri "http://localhost:8000/risk/daily" `
    -ContentType "application/json" -Body $body
```

---

## Interactive API Documentation

FastAPI provides interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

These provide interactive testing capabilities and auto-generated schema documentation.

---

## Configuration

Key configuration in `configs/service.yaml`:

```yaml
model:
  checkpoint_path: runs/checkpoints/best.pt
  device: auto  # 'cuda', 'cpu', or 'auto'

policy:
  default_k: 3
  lambda1: 1.0  # Entropy weight
  lambda2: 0.5  # Uncertainty weight
  lambda3: 0.3  # Gradient weight

server:
  host: 0.0.0.0
  port: 8080

features:
  n_features: 20  # CRITICAL: Must match model training
```

---

## Rate Limits

Currently no rate limits are enforced. For production deployment, consider:
- API Gateway rate limiting
- Per-user request quotas
- Cost monitoring for Cloud Run

---

## Support

For issues or questions:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review interactive docs at `/docs`
- Open an issue on GitHub

---

**Last Updated:** November 15, 2025  
**API Version:** 1.0.0
