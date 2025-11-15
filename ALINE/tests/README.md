# ALINE Cloud Run Endpoint Tests

Comprehensive test suite for the ALINE backend deployed on Google Cloud Run.

## 🚀 Quick Start

### Option 1: PowerShell Script (Quick & Easy)

```powershell
# Set your Cloud Run service URL
$env:ALINE_CLOUD_RUN_URL = "https://aline-service-xxxxx.run.app"

# Run the tests
cd ALINE/tests
.\test_cloud_endpoints.ps1
```

Or pass the URL directly:

```powershell
.\test_cloud_endpoints.ps1 "https://aline-service-xxxxx.run.app"
```

### Option 2: Python Pytest (Comprehensive)

```powershell
# Install dependencies
pip install -r requirements.txt

# Set your Cloud Run service URL
$env:ALINE_CLOUD_RUN_URL = "https://aline-service-xxxxx.run.app"

# Run all tests
pytest test_cloud_run_endpoints.py -v

# Run specific test class
pytest test_cloud_run_endpoints.py::TestHealthEndpoint -v

# Run with detailed output
pytest test_cloud_run_endpoints.py -v -s
```

## 📋 Test Coverage

### 1. Health Check Endpoint
- ✅ Basic health check
- ✅ Response time validation
- ✅ Model loading status

### 2. Risk Prediction Endpoint (`/risk/daily`)
- ✅ Basic daily risk prediction
- ✅ Invalid input handling (wrong number of hours)
- ✅ Different feature patterns
- ✅ Probability bounds validation

### 3. Posterior Distribution Endpoint (`/posterior/hourly`)
- ✅ Hourly posterior retrieval
- ✅ Invalid input handling
- ✅ Response structure validation

### 4. Policy Recommendation Endpoint (`/policy/topk`)
- ✅ Top-K hour selection with default k
- ✅ Different k values (1, 3, 5, 10)
- ✅ Invalid k value handling
- ✅ Priority score ordering

### 5. Calendar Integration Endpoints
- ✅ Save calendar connection
- ✅ Invalid URL handling
- ✅ Get calendar status
- ✅ Delete calendar connection
- ✅ Generate context with calendar

### 6. Integration Tests
- ✅ Full workflow (health → risk → posterior → policy)
- ✅ Concurrent request handling

## 🎯 Test Structure

```
tests/
├── test_cloud_run_endpoints.py  # Pytest test suite
├── test_cloud_endpoints.ps1      # PowerShell quick test script
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

## 📊 Sample Output

### PowerShell Script
```
================================================================================
  ALINE Google Cloud Run - Endpoint Tests
================================================================================

  Service URL: https://aline-service-xxxxx.run.app

================================================================================

================================================================================
  Test 1: Health Check
================================================================================
✓ Health Check - Status: 200
  Status: ok
  Model Loaded: True
  Timestamp: 2025-11-15T12:34:56.789

...

================================================================================
  Test Summary
================================================================================

  Total Tests: 15
✓ Passed: 15
  Failed: 0

✓ All tests passed! 🎉
```

### Pytest Output
```
test_cloud_run_endpoints.py::TestHealthEndpoint::test_health_check PASSED
test_cloud_run_endpoints.py::TestHealthEndpoint::test_health_check_performance PASSED
test_cloud_run_endpoints.py::TestRiskDailyEndpoint::test_daily_risk_prediction PASSED
test_cloud_run_endpoints.py::TestRiskDailyEndpoint::test_daily_risk_invalid_features PASSED
...
================== 25 passed in 12.34s ==================
```

## 🔧 Configuration

### Environment Variables

- `ALINE_CLOUD_RUN_URL`: Your Cloud Run service URL (required)

### Test Parameters

Edit the configuration section in `test_cloud_run_endpoints.py`:

```python
# Configuration
BASE_URL = os.getenv("ALINE_CLOUD_RUN_URL", "https://aline-service-XXXXXXXX.run.app")
TIMEOUT = 30  # seconds
N_FEATURES = 20
N_HOURS = 24
```

## 🐛 Troubleshooting

### Connection Errors
```
Error: Failed to connect to service
```
**Solution**: Verify your Cloud Run service URL is correct and the service is publicly accessible.

### Authentication Errors
```
Error: 403 Forbidden
```
**Solution**: Ensure Cloud Run service allows unauthenticated access or add authentication headers.

### Timeout Errors
```
Error: Request timeout after 30s
```
**Solution**: Increase `TIMEOUT` value or check if your service is experiencing cold starts.

### Model Not Loaded
```
Status 503: Model not loaded
```
**Solution**: Check Cloud Run logs to see if model loading failed during startup.

## 📖 Endpoint Reference

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T12:34:56.789",
  "model_loaded": true
}
```

### POST /risk/daily
Predict daily migraine risk from 24 hours of data.

**Request:**
```json
{
  "user_id": "user_123",
  "features": [[...], [...], ...] // 24 hours x 20 features
}
```

**Response:**
```json
{
  "user_id": "user_123",
  "mean_probability": 0.3456,
  "lower_bound": 0.2123,
  "upper_bound": 0.4789,
  "timestamp": "2025-11-15T12:34:56.789"
}
```

### POST /posterior/hourly
Get hourly posterior distributions over latent states.

**Request:**
```json
{
  "user_id": "user_123",
  "features": [[...], [...], ...] // 24 hours x 20 features
}
```

**Response:**
```json
{
  "user_id": "user_123",
  "hourly_posteriors": [
    {
      "hour": 0,
      "mean": [0.1, 0.2, ...],
      "std": [0.05, 0.03, ...]
    },
    ...
  ],
  "timestamp": "2025-11-15T12:34:56.789"
}
```

### POST /policy/topk
Recommend top-k hours to sample based on priority scores.

**Request:**
```json
{
  "user_id": "user_123",
  "features": [[...], [...], ...], // 24 hours x 20 features
  "k": 3
}
```

**Response:**
```json
{
  "user_id": "user_123",
  "selected_hours": [
    {"hour": 14, "priority_score": 2.345},
    {"hour": 18, "priority_score": 1.987},
    {"hour": 9, "priority_score": 1.654}
  ],
  "k": 3,
  "timestamp": "2025-11-15T12:34:56.789"
}
```

### POST /user/calendar
Save user's calendar ICS/WebCal URL.

**Request:**
```json
{
  "userId": "user_123",
  "calendarUrl": "https://calendar.google.com/calendar/ical/example/basic.ics"
}
```

**Response:**
```json
{
  "status": "ok",
  "userId": "user_123",
  "lastVerifiedAt": "2025-11-15T12:34:56.789",
  "message": "Calendar connected successfully"
}
```

### GET /user/calendar/{user_id}
Get calendar connection status for a user.

**Response:**
```json
{
  "connected": true,
  "userId": "user_123",
  "lastVerifiedAt": "2025-11-15T12:34:56.789"
}
```

### DELETE /user/calendar/{user_id}
Delete calendar connection for a user.

**Response:**
```json
{
  "status": "ok",
  "message": "Calendar connection deleted"
}
```

### POST /aline/generate-context
Generate context posteriors from calendar and priors.

**Request:**
```json
{
  "userId": "user_123",
  "priors": {
    "stress_mean": [5.0, 5.0, ...],
    "stress_std": [1.0, 1.0, ...]
  }
}
```

**Response:**
```json
{
  "userId": "user_123",
  "posteriors": {...},
  "features": [...],
  "timestamp": "2025-11-15T12:34:56.789"
}
```

## 🚀 CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Test Cloud Run Endpoints
  env:
    ALINE_CLOUD_RUN_URL: ${{ secrets.CLOUD_RUN_URL }}
  run: |
    cd ALINE/tests
    pip install -r requirements.txt
    pytest test_cloud_run_endpoints.py -v
```

## 📝 Notes

- All endpoints accept JSON payloads
- Feature arrays must contain exactly 24 hours of data
- Each hour must have exactly 20 features
- Calendar URLs should be valid HTTPS or WebCal URLs
- The service uses port 8080 internally (Cloud Run managed)

## 🤝 Contributing

To add new tests:

1. Add test method to appropriate class in `test_cloud_run_endpoints.py`
2. Update PowerShell script if needed
3. Update this README with new endpoint documentation
4. Run tests to verify

## 📄 License

Part of the ALINE project.
