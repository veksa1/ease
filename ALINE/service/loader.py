"""
Data Contract and Loader - Ticket 011

Maps incoming JSON requests to model tensors.
Validates input and applies normalization.

Author: ALINE Team
Date: 2025-11-15
"""

import torch
import numpy as np
from typing import List, Dict, Optional
from service.schemas import DailyRiskRequest, PosteriorRequest, PolicyRequest


def validate_features(
    features: List[List[float]],
    expected_hours: int = 24,
    expected_features: int = 20
) -> None:
    """
    Validate feature dimensions.
    
    Args:
        features: Feature array [hours, n_features]
        expected_hours: Expected number of hours
        expected_features: Expected number of features
        
    Raises:
        ValueError: If dimensions don't match
    """
    if len(features) != expected_hours:
        raise ValueError(
            f"Expected {expected_hours} hours of data, got {len(features)}"
        )
    
    for i, hour_features in enumerate(features):
        if len(hour_features) != expected_features:
            raise ValueError(
                f"Hour {i}: expected {expected_features} features, got {len(hour_features)}"
            )


def normalize_features(
    features: List[List[float]],
    feature_stats: Optional[Dict] = None
) -> torch.Tensor:
    """
    Normalize features to standard scale.
    
    Args:
        features: Raw feature values
        feature_stats: Optional dict with 'mean' and 'std' for each feature
        
    Returns:
        Normalized tensor [hours, n_features]
    """
    features_array = np.array(features, dtype=np.float32)
    
    if feature_stats is not None:
        # Apply z-score normalization
        means = np.array(feature_stats['mean'])
        stds = np.array(feature_stats['std'])
        features_array = (features_array - means) / (stds + 1e-6)
    
    return torch.FloatTensor(features_array)


def parse_daily_risk_request(
    request: DailyRiskRequest,
    feature_stats: Optional[Dict] = None
) -> torch.Tensor:
    """
    Parse and validate daily risk request.
    
    Args:
        request: DailyRiskRequest object
        feature_stats: Optional feature statistics for normalization
        
    Returns:
        Feature tensor ready for model [1, 24, n_features]
    """
    validate_features(request.features)
    features = normalize_features(request.features, feature_stats)
    return features.unsqueeze(0)


def parse_posterior_request(
    request: PosteriorRequest,
    feature_stats: Optional[Dict] = None
) -> torch.Tensor:
    """
    Parse and validate posterior request.
    
    Args:
        request: PosteriorRequest object
        feature_stats: Optional feature statistics
        
    Returns:
        Feature tensor [1, 24, n_features]
    """
    validate_features(request.features)
    features = normalize_features(request.features, feature_stats)
    return features.unsqueeze(0)


def parse_policy_request(
    request: PolicyRequest,
    feature_stats: Optional[Dict] = None
) -> torch.Tensor:
    """
    Parse and validate policy request.
    
    Args:
        request: PolicyRequest object
        feature_stats: Optional feature statistics
        
    Returns:
        Feature tensor [1, 24, n_features]
    """
    validate_features(request.features)
    features = normalize_features(request.features, feature_stats)
    return features.unsqueeze(0)


def create_sample_request_data(
    n_features: int = 20,
    hours: int = 24,
    user_id: str = "test_user"
) -> Dict:
    """
    Create sample request data for testing.
    
    Args:
        n_features: Number of features
        hours: Number of hours
        user_id: User ID
        
    Returns:
        Sample request dictionary
    """
    # Generate random but realistic-looking data
    np.random.seed(42)
    
    features = []
    for hour in range(hours):
        hour_features = []
        
        # Sleep Duration (4-10 hours)
        hour_features.append(np.random.uniform(4, 10))
        
        # Sleep Quality (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Sleep Consistency (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Stress Level (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Work Hours (0-12)
        hour_features.append(np.random.uniform(0, 12))
        
        # Anxiety Score (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Caffeine Intake (0-500 mg)
        hour_features.append(np.random.uniform(0, 500))
        
        # Water Intake (0-5 L)
        hour_features.append(np.random.uniform(0, 5))
        
        # Meal Regularity (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Exercise Duration (0-120 min)
        hour_features.append(np.random.uniform(0, 120))
        
        # Physical Activity Level (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Neck Tension (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Screen Time (0-12 hours)
        hour_features.append(np.random.uniform(0, 12))
        
        # Weather Pressure (980-1050 hPa)
        hour_features.append(np.random.uniform(980, 1050))
        
        # Noise Level (30-90 dB)
        hour_features.append(np.random.uniform(30, 90))
        
        # Hormone Fluctuation Index (1-10)
        hour_features.append(np.random.uniform(1, 10))
        
        # Menstrual Cycle Day (1-28)
        hour_features.append(np.random.uniform(1, 28))
        
        # Alcohol Consumption (0-5 units)
        hour_features.append(np.random.uniform(0, 5))
        
        # Smoking (0-20 cigarettes/day)
        hour_features.append(np.random.uniform(0, 20))
        
        # Meditation Time (0-60 min)
        hour_features.append(np.random.uniform(0, 60))
        
        features.append(hour_features)
    
    return {
        "user_id": user_id,
        "features": features
    }
