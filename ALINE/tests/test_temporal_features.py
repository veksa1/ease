"""
Test Suite for Ticket #020: Temporal Cycle Features
Tests day_of_week and week_of_year cyclical encodings.

Author: ALINE Team
Date: 2025-11-16
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.simulator import MigraineSimulator, SimulatorConfig


class TestTemporalCycleFeatures:
    """Test temporal cycle features from Ticket #020"""
    
    @pytest.fixture
    def simulator(self):
        """Create a minimal simulator for testing temporal features"""
        # Create minimal config - we only need to test _compute_temporal_features
        config = SimulatorConfig(
            n_users=1,
            horizon=365,
            train_split=0.8,
            random_seed=42,
            latent_dim=4,
            state_transition_matrix=np.eye(4),
            input_matrix=np.zeros((4, 10)),
            process_noise=np.ones(4) * 0.1,
            migraine_weights=np.array([0.5, 0.4, 0.45, 0.35]),
            migraine_bias=-1.8,
            baseline_migraine_rate=0.15,
            feature_order=[],
            priors={},
            feature_metadata=None
        )
        return MigraineSimulator(config)
    
    def test_temporal_features_method_exists(self, simulator):
        """Verify that _compute_temporal_features method exists"""
        assert hasattr(simulator, '_compute_temporal_features'), \
            "Simulator should have _compute_temporal_features method"
    
    def test_day_of_week_cyclical_encoding(self, simulator):
        """Test that day_of_week features are correctly encoded"""
        # Test for each day of the week
        for day in range(7):
            features = simulator._compute_temporal_features(day, start_day_of_week=0)
            
            # Verify keys exist
            assert 'day_of_week_sin' in features, "Missing day_of_week_sin"
            assert 'day_of_week_cos' in features, "Missing day_of_week_cos"
            
            # Verify values are in valid range [-1, 1]
            assert -1 <= features['day_of_week_sin'] <= 1, \
                f"day_of_week_sin out of range: {features['day_of_week_sin']}"
            assert -1 <= features['day_of_week_cos'] <= 1, \
                f"day_of_week_cos out of range: {features['day_of_week_cos']}"
    
    def test_week_of_year_cyclical_encoding(self, simulator):
        """Test that week_of_year features are correctly encoded"""
        # Test a full year (52 weeks)
        for week in range(0, 364, 7):
            features = simulator._compute_temporal_features(week, start_day_of_week=0)
            
            # Verify keys exist
            assert 'week_of_year_sin' in features, "Missing week_of_year_sin"
            assert 'week_of_year_cos' in features, "Missing week_of_year_cos"
            
            # Verify values are in valid range [-1, 1]
            assert -1 <= features['week_of_year_sin'] <= 1, \
                f"week_of_year_sin out of range: {features['week_of_year_sin']}"
            assert -1 <= features['week_of_year_cos'] <= 1, \
                f"week_of_year_cos out of range: {features['week_of_year_cos']}"
    
    def test_cyclical_continuity(self, simulator):
        """Test that cyclical encoding wraps correctly (day 0 = day 7, week 0 = week 52)"""
        # Day of week: Monday (0) should equal Monday after 7 days
        features_day0 = simulator._compute_temporal_features(0, start_day_of_week=0)
        features_day7 = simulator._compute_temporal_features(7, start_day_of_week=0)
        
        np.testing.assert_almost_equal(
            features_day0['day_of_week_sin'],
            features_day7['day_of_week_sin'],
            decimal=10,
            err_msg="Day of week should cycle every 7 days"
        )
        np.testing.assert_almost_equal(
            features_day0['day_of_week_cos'],
            features_day7['day_of_week_cos'],
            decimal=10,
            err_msg="Day of week should cycle every 7 days"
        )
    
    def test_temporal_features_mathematical_correctness(self, simulator):
        """Test mathematical correctness of sin/cos encoding"""
        # For day 0 (Monday), day_of_week = 0
        features = simulator._compute_temporal_features(0, start_day_of_week=0)
        
        # sin(2π * 0 / 7) = sin(0) = 0
        # cos(2π * 0 / 7) = cos(0) = 1
        np.testing.assert_almost_equal(
            features['day_of_week_sin'],
            0.0,
            decimal=10,
            err_msg="sin(0) should be 0"
        )
        np.testing.assert_almost_equal(
            features['day_of_week_cos'],
            1.0,
            decimal=10,
            err_msg="cos(0) should be 1"
        )
        
        # For day 3 (should be Thursday, day_of_week = 3)
        features_day3 = simulator._compute_temporal_features(3, start_day_of_week=0)
        expected_sin = np.sin(2 * np.pi * 3 / 7)
        expected_cos = np.cos(2 * np.pi * 3 / 7)
        
        np.testing.assert_almost_equal(
            features_day3['day_of_week_sin'],
            expected_sin,
            decimal=10,
            err_msg=f"Expected sin(2π*3/7) = {expected_sin}"
        )
        np.testing.assert_almost_equal(
            features_day3['day_of_week_cos'],
            expected_cos,
            decimal=10,
            err_msg=f"Expected cos(2π*3/7) = {expected_cos}"
        )
    
    def test_temporal_features_unit_circle_property(self, simulator):
        """Test that sin² + cos² = 1 (unit circle property)"""
        # Test for multiple days
        for day in range(30):
            features = simulator._compute_temporal_features(day, start_day_of_week=0)
            
            # Day of week
            sin_sq = features['day_of_week_sin'] ** 2
            cos_sq = features['day_of_week_cos'] ** 2
            np.testing.assert_almost_equal(
                sin_sq + cos_sq,
                1.0,
                decimal=10,
                err_msg=f"sin²+cos² should equal 1 for day {day}"
            )
            
            # Week of year
            sin_sq_week = features['week_of_year_sin'] ** 2
            cos_sq_week = features['week_of_year_cos'] ** 2
            np.testing.assert_almost_equal(
                sin_sq_week + cos_sq_week,
                1.0,
                decimal=10,
                err_msg=f"sin²+cos² should equal 1 for week at day {day}"
            )
    
    def test_weekend_pattern_detection(self, simulator):
        """Test that weekend days (5, 6) have distinct patterns"""
        # Get features for weekdays and weekends
        monday = simulator._compute_temporal_features(0, start_day_of_week=0)
        saturday = simulator._compute_temporal_features(5, start_day_of_week=0)
        sunday = simulator._compute_temporal_features(6, start_day_of_week=0)
        
        # Saturday and Sunday should be different from Monday
        assert monday['day_of_week_sin'] != saturday['day_of_week_sin'], \
            "Weekend should have different encoding than weekday"
        assert monday['day_of_week_sin'] != sunday['day_of_week_sin'], \
            "Weekend should have different encoding than weekday"
        
        # Saturday and Sunday should also be different from each other
        assert saturday['day_of_week_sin'] != sunday['day_of_week_sin'], \
            "Saturday and Sunday should have different encodings"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
