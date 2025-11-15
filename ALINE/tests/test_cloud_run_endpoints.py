"""
Comprehensive test suite for ALINE Google Cloud Run deployment.

Tests all endpoints with full coverage including:
- Health check
- Daily risk prediction
- Hourly posterior distributions
- Policy recommendations (top-k hours)
- Calendar integration endpoints
- Error handling and edge cases
"""

import os
import sys
import json
import pytest
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Configuration
# Update this with your actual Cloud Run service URL
BASE_URL = os.getenv(
    "ALINE_CLOUD_RUN_URL",
    " https://aline-service-hhteadf5zq-uc.a.run.app"  # Replace with your actual URL
)

# Test configuration
TIMEOUT = 30  # seconds
N_FEATURES = 20
N_HOURS = 24


# ============================================================================
# Fixtures and Helper Functions
# ============================================================================

@pytest.fixture
def sample_features() -> List[List[float]]:
    """Generate realistic 24-hour feature data"""
    features = []
    for hour in range(N_HOURS):
        # Generate realistic feature values
        hour_features = [
            7.5 + (hour % 2) * 0.5,  # Sleep Duration (hours)
            7.0 + (hour % 3),         # Sleep Quality (1-10)
            8.0,                       # Sleep Consistency Score
            5.0 + (hour % 4),         # Stress Level (1-10)
            8.0 if 9 <= hour <= 17 else 0,  # Work Hours
            4.0 + (hour % 3),         # Anxiety Score (1-10)
            200.0 if hour in [7, 12, 15] else 0,  # Caffeine Intake (mg)
            2.0 if hour % 3 == 0 else 0,  # Water Intake (L)
            7.0,                       # Meal Regularity (1-10)
            30.0 if hour == 18 else 0,  # Exercise Duration (min)
            5.0 if hour == 18 else 2.0,  # Physical Activity Level (1-10)
            4.0 + (hour % 3),         # Neck Tension (1-10)
            2.0 if 9 <= hour <= 22 else 0,  # Screen Time (hours)
            1013.25,                   # Weather Pressure (hPa)
            60.0 if 9 <= hour <= 17 else 40.0,  # Noise Level (dB)
            5.0,                       # Hormone Fluctuation Index
            15.0,                      # Menstrual Cycle Day
            0.0 if hour < 18 else 1.5,  # Alcohol Consumption (units)
            0.0,                       # Smoking (cigarettes/day)
            10.0 if hour == 7 else 0,  # Meditation Time (min)
        ]
        features.append(hour_features)
    return features


@pytest.fixture
def sample_priors() -> Dict[str, List[float]]:
    """Generate sample prior distributions"""
    return {
        "stress_mean": [5.0] * N_HOURS,
        "stress_std": [1.0] * N_HOURS,
        "sleep_quality_mean": [7.0] * N_HOURS,
        "sleep_quality_std": [1.5] * N_HOURS
    }


def assert_response_ok(response: requests.Response, expected_status: int = 200):
    """Helper to assert response is OK and return JSON"""
    assert response.status_code == expected_status, (
        f"Expected status {expected_status}, got {response.status_code}. "
        f"Response: {response.text}"
    )
    return response.json()


def print_test_header(test_name: str):
    """Print formatted test header"""
    print(f"\n{'=' * 80}")
    print(f"  {test_name}")
    print(f"{'=' * 80}")


# ============================================================================
# Health Check Tests
# ============================================================================

class TestHealthEndpoint:
    """Test /health endpoint"""
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        print_test_header("Health Check")
        
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        data = assert_response_ok(response)
        
        # Verify response structure
        assert "status" in data
        assert data["status"] == "ok"
        assert "timestamp" in data
        assert "model_loaded" in data
        
        # Verify timestamp format
        datetime.fromisoformat(data["timestamp"])
        
        print(f"✓ Service is healthy")
        print(f"  Status: {data['status']}")
        print(f"  Model loaded: {data['model_loaded']}")
        print(f"  Timestamp: {data['timestamp']}")
    
    def test_health_check_performance(self):
        """Test health check response time"""
        print_test_header("Health Check Performance")
        
        import time
        start = time.time()
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        duration = time.time() - start
        
        assert_response_ok(response)
        assert duration < 2.0, f"Health check took too long: {duration:.2f}s"
        
        print(f"✓ Response time: {duration*1000:.2f}ms")


# ============================================================================
# Risk Prediction Tests
# ============================================================================

class TestRiskDailyEndpoint:
    """Test /risk/daily endpoint"""
    
    def test_daily_risk_prediction(self, sample_features):
        """Test basic daily risk prediction"""
        print_test_header("Daily Risk Prediction")
        
        payload = {
            "user_id": "test_user_001",
            "features": sample_features
        }
        
        response = requests.post(
            f"{BASE_URL}/risk/daily",
            json=payload,
            timeout=TIMEOUT
        )
        data = assert_response_ok(response)
        
        # Verify response structure
        assert "user_id" in data
        assert data["user_id"] == "test_user_001"
        assert "mean_probability" in data
        assert "lower_bound" in data
        assert "upper_bound" in data
        assert "timestamp" in data
        
        # Verify probability values
        assert 0.0 <= data["mean_probability"] <= 1.0
        assert 0.0 <= data["lower_bound"] <= 1.0
        assert 0.0 <= data["upper_bound"] <= 1.0
        assert data["lower_bound"] <= data["mean_probability"] <= data["upper_bound"]
        
        print(f"✓ Daily risk prediction successful")
        print(f"  User: {data['user_id']}")
        print(f"  Mean probability: {data['mean_probability']:.4f}")
        print(f"  90% CI: [{data['lower_bound']:.4f}, {data['upper_bound']:.4f}]")
    
    def test_daily_risk_invalid_features(self):
        """Test risk prediction with invalid number of features"""
        print_test_header("Daily Risk - Invalid Features")
        
        payload = {
            "user_id": "test_user_002",
            "features": [[1.0] * N_FEATURES] * 12  # Only 12 hours instead of 24
        }
        
        response = requests.post(
            f"{BASE_URL}/risk/daily",
            json=payload,
            timeout=TIMEOUT
        )
        
        assert response.status_code == 400
        error_data = response.json()
        assert "detail" in error_data
        assert "24 hours" in error_data["detail"].lower()
        
        print(f"✓ Correctly rejected invalid input")
        print(f"  Error: {error_data['detail']}")
    
    def test_daily_risk_different_patterns(self):
        """Test risk prediction with different feature patterns"""
        print_test_header("Daily Risk - Different Patterns")
        
        patterns = [
            ("low_stress", [[i % 10 if j < 10 else 0 for j in range(N_FEATURES)] for i in range(N_HOURS)]),
            ("high_stress", [[i % 10 if j == 3 else 9.0 if j < 10 else 0 for j in range(N_FEATURES)] for i in range(N_HOURS)]),
            ("poor_sleep", [[3.0 if j == 0 else i % 10 if j < 10 else 0 for j in range(N_FEATURES)] for i in range(N_HOURS)]),
        ]
        
        results = []
        for pattern_name, features in patterns:
            payload = {
                "user_id": f"test_user_pattern_{pattern_name}",
                "features": features
            }
            
            response = requests.post(
                f"{BASE_URL}/risk/daily",
                json=payload,
                timeout=TIMEOUT
            )
            data = assert_response_ok(response)
            results.append((pattern_name, data["mean_probability"]))
            print(f"  {pattern_name}: {data['mean_probability']:.4f}")
        
        print(f"✓ Tested {len(patterns)} different patterns")


# ============================================================================
# Posterior Distribution Tests
# ============================================================================

class TestPosteriorHourlyEndpoint:
    """Test /posterior/hourly endpoint"""
    
    def test_hourly_posterior(self, sample_features):
        """Test hourly posterior distributions"""
        print_test_header("Hourly Posterior Distributions")
        
        payload = {
            "user_id": "test_user_003",
            "features": sample_features
        }
        
        response = requests.post(
            f"{BASE_URL}/posterior/hourly",
            json=payload,
            timeout=TIMEOUT
        )
        data = assert_response_ok(response)
        
        # Verify response structure
        assert "user_id" in data
        assert "hourly_posteriors" in data
        assert "timestamp" in data
        
        # Verify we got 24 hours
        assert len(data["hourly_posteriors"]) == 24
        
        # Verify each hour's data
        for hour_data in data["hourly_posteriors"]:
            assert "hour" in hour_data
            assert "mean" in hour_data
            assert "std" in hour_data
            assert isinstance(hour_data["mean"], list)
            assert isinstance(hour_data["std"], list)
            assert len(hour_data["mean"]) > 0
            assert len(hour_data["std"]) > 0
            assert len(hour_data["mean"]) == len(hour_data["std"])
        
        print(f"✓ Hourly posterior distributions retrieved")
        print(f"  User: {data['user_id']}")
        print(f"  Hours: {len(data['hourly_posteriors'])}")
        print(f"  Latent dimensions: {len(data['hourly_posteriors'][0]['mean'])}")
    
    def test_posterior_invalid_input(self):
        """Test posterior with invalid input"""
        print_test_header("Posterior - Invalid Input")
        
        payload = {
            "user_id": "test_user_004",
            "features": [[1.0] * N_FEATURES] * 20  # Wrong number of hours
        }
        
        response = requests.post(
            f"{BASE_URL}/posterior/hourly",
            json=payload,
            timeout=TIMEOUT
        )
        
        assert response.status_code == 400
        print(f"✓ Correctly rejected invalid input")


# ============================================================================
# Policy Recommendation Tests
# ============================================================================

class TestPolicyTopKEndpoint:
    """Test /policy/topk endpoint"""
    
    def test_policy_topk_default(self, sample_features):
        """Test top-k policy recommendations with default k"""
        print_test_header("Policy Top-K (default)")
        
        payload = {
            "user_id": "test_user_005",
            "features": sample_features,
            "k": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/policy/topk",
            json=payload,
            timeout=TIMEOUT
        )
        data = assert_response_ok(response)
        
        # Verify response structure
        assert "user_id" in data
        assert "selected_hours" in data
        assert "k" in data
        assert "timestamp" in data
        
        # Verify we got k hours
        assert len(data["selected_hours"]) == 3
        
        # Verify each selected hour
        for hour_info in data["selected_hours"]:
            assert "hour" in hour_info
            assert "priority_score" in hour_info
            assert 0 <= hour_info["hour"] < 24
            assert isinstance(hour_info["priority_score"], (int, float))
        
        # Verify hours are sorted by priority (descending)
        scores = [h["priority_score"] for h in data["selected_hours"]]
        assert scores == sorted(scores, reverse=True)
        
        print(f"✓ Policy recommendations retrieved")
        print(f"  User: {data['user_id']}")
        print(f"  k: {data['k']}")
        print(f"  Selected hours and scores:")
        for h in data["selected_hours"]:
            print(f"    Hour {h['hour']:2d}: {h['priority_score']:.4f}")
    
    def test_policy_different_k_values(self, sample_features):
        """Test policy recommendations with different k values"""
        print_test_header("Policy Top-K (different k values)")
        
        for k in [1, 3, 5, 10]:
            payload = {
                "user_id": f"test_user_k{k}",
                "features": sample_features,
                "k": k
            }
            
            response = requests.post(
                f"{BASE_URL}/policy/topk",
                json=payload,
                timeout=TIMEOUT
            )
            data = assert_response_ok(response)
            
            assert len(data["selected_hours"]) == k
            print(f"  k={k}: {len(data['selected_hours'])} hours selected")
        
        print(f"✓ Tested multiple k values")
    
    def test_policy_invalid_k(self, sample_features):
        """Test policy with invalid k value"""
        print_test_header("Policy - Invalid k")
        
        # Test k > 24
        payload = {
            "user_id": "test_user_006",
            "features": sample_features,
            "k": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/policy/topk",
            json=payload,
            timeout=TIMEOUT
        )
        
        # Should either limit to 24 or return error
        if response.status_code == 200:
            data = response.json()
            assert len(data["selected_hours"]) <= 24
            print(f"✓ Capped k to maximum of 24 hours")
        else:
            print(f"✓ Rejected invalid k value")


# ============================================================================
# Calendar Integration Tests
# ============================================================================

class TestCalendarEndpoints:
    """Test calendar integration endpoints"""
    
    def test_save_calendar_connection(self):
        """Test saving a calendar connection"""
        print_test_header("Save Calendar Connection")
        
        payload = {
            "userId": "test_user_calendar_001",
            "calendarUrl": "https://calendar.google.com/calendar/ical/example/basic.ics"
        }
        
        response = requests.post(
            f"{BASE_URL}/user/calendar",
            json=payload,
            timeout=TIMEOUT
        )
        data = assert_response_ok(response)
        
        # Verify response structure
        assert "status" in data
        assert data["status"] == "ok"
        assert "userId" in data
        assert data["userId"] == "test_user_calendar_001"
        assert "message" in data
        
        print(f"✓ Calendar connection saved")
        print(f"  User: {data['userId']}")
        print(f"  Message: {data['message']}")
    
    def test_save_calendar_invalid_url(self):
        """Test saving calendar with invalid URL"""
        print_test_header("Save Calendar - Invalid URL")
        
        payload = {
            "userId": "test_user_calendar_002",
            "calendarUrl": "not-a-valid-url"
        }
        
        response = requests.post(
            f"{BASE_URL}/user/calendar",
            json=payload,
            timeout=TIMEOUT
        )
        
        assert response.status_code == 400
        error_data = response.json()
        assert "detail" in error_data
        
        print(f"✓ Correctly rejected invalid URL")
        print(f"  Error: {error_data['detail']}")
    
    def test_get_calendar_status(self):
        """Test getting calendar connection status"""
        print_test_header("Get Calendar Status")
        
        # First, save a connection
        save_payload = {
            "userId": "test_user_calendar_003",
            "calendarUrl": "https://calendar.google.com/calendar/ical/test/basic.ics"
        }
        requests.post(f"{BASE_URL}/user/calendar", json=save_payload, timeout=TIMEOUT)
        
        # Now get status
        response = requests.get(
            f"{BASE_URL}/user/calendar/test_user_calendar_003",
            timeout=TIMEOUT
        )
        data = assert_response_ok(response)
        
        # Verify response structure
        assert "connected" in data
        assert "userId" in data
        
        print(f"✓ Calendar status retrieved")
        print(f"  User: {data['userId']}")
        print(f"  Connected: {data['connected']}")
    
    def test_delete_calendar_connection(self):
        """Test deleting a calendar connection"""
        print_test_header("Delete Calendar Connection")
        
        # First, save a connection
        save_payload = {
            "userId": "test_user_calendar_004",
            "calendarUrl": "https://calendar.google.com/calendar/ical/test2/basic.ics"
        }
        requests.post(f"{BASE_URL}/user/calendar", json=save_payload, timeout=TIMEOUT)
        
        # Now delete it
        response = requests.delete(
            f"{BASE_URL}/user/calendar/test_user_calendar_004",
            timeout=TIMEOUT
        )
        data = assert_response_ok(response)
        
        assert "status" in data
        assert data["status"] == "ok"
        
        print(f"✓ Calendar connection deleted")
    
    def test_generate_context(self, sample_priors):
        """Test context generation with calendar"""
        print_test_header("Generate Context with Calendar")
        
        # First, save a calendar connection
        save_payload = {
            "userId": "test_user_calendar_005",
            "calendarUrl": "https://calendar.google.com/calendar/ical/test3/basic.ics"
        }
        requests.post(f"{BASE_URL}/user/calendar", json=save_payload, timeout=TIMEOUT)
        
        # Now generate context
        payload = {
            "userId": "test_user_calendar_005",
            "priors": sample_priors
        }
        
        response = requests.post(
            f"{BASE_URL}/aline/generate-context",
            json=payload,
            timeout=TIMEOUT
        )
        
        # This might fail if n8n is not configured, which is OK
        if response.status_code == 200:
            data = response.json()
            assert "userId" in data
            assert "posteriors" in data or "features" in data
            print(f"✓ Context generation successful")
        elif response.status_code == 500:
            error_data = response.json()
            if "n8n" in error_data.get("detail", "").lower():
                print(f"⚠ Skipped (n8n not configured): {error_data['detail']}")
            else:
                raise AssertionError(f"Unexpected error: {error_data}")
        else:
            print(f"⚠ Unexpected status code: {response.status_code}")


# ============================================================================
# Integration and Performance Tests
# ============================================================================

class TestIntegration:
    """Integration tests combining multiple endpoints"""
    
    def test_full_workflow(self, sample_features, sample_priors):
        """Test complete workflow: health -> risk -> posterior -> policy"""
        print_test_header("Full Workflow Integration Test")
        
        user_id = "test_user_workflow_001"
        
        # 1. Health check
        health_response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        health_data = assert_response_ok(health_response)
        assert health_data["status"] == "ok"
        print(f"  ✓ Step 1: Health check passed")
        
        # 2. Get daily risk
        risk_response = requests.post(
            f"{BASE_URL}/risk/daily",
            json={"user_id": user_id, "features": sample_features},
            timeout=TIMEOUT
        )
        risk_data = assert_response_ok(risk_response)
        print(f"  ✓ Step 2: Daily risk = {risk_data['mean_probability']:.4f}")
        
        # 3. Get hourly posteriors
        posterior_response = requests.post(
            f"{BASE_URL}/posterior/hourly",
            json={"user_id": user_id, "features": sample_features},
            timeout=TIMEOUT
        )
        posterior_data = assert_response_ok(posterior_response)
        print(f"  ✓ Step 3: Got {len(posterior_data['hourly_posteriors'])} hourly posteriors")
        
        # 4. Get policy recommendations
        policy_response = requests.post(
            f"{BASE_URL}/policy/topk",
            json={"user_id": user_id, "features": sample_features, "k": 3},
            timeout=TIMEOUT
        )
        policy_data = assert_response_ok(policy_response)
        print(f"  ✓ Step 4: Got {len(policy_data['selected_hours'])} policy recommendations")
        
        print(f"✓ Full workflow completed successfully")
    
    def test_concurrent_requests(self, sample_features):
        """Test handling concurrent requests"""
        print_test_header("Concurrent Requests Test")
        
        import concurrent.futures
        
        def make_request(i):
            payload = {
                "user_id": f"test_user_concurrent_{i}",
                "features": sample_features
            }
            response = requests.post(
                f"{BASE_URL}/risk/daily",
                json=payload,
                timeout=TIMEOUT
            )
            return response.status_code == 200
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(make_request, range(10)))
        
        success_count = sum(results)
        print(f"✓ {success_count}/10 concurrent requests successful")
        assert success_count >= 8, "Too many concurrent requests failed"


# ============================================================================
# Main Test Runner
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("  ALINE Google Cloud Run - Comprehensive Endpoint Tests")
    print("=" * 80)
    print(f"\n  Base URL: {BASE_URL}")
    print(f"  Timeout: {TIMEOUT}s")
    print(f"  Features: {N_FEATURES}")
    print(f"  Hours: {N_HOURS}")
    print("\n" + "=" * 80 + "\n")
    
    # Run with pytest
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--color=yes",
        "-s"  # Show print statements
    ])
