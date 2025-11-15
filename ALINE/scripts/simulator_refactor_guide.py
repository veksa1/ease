"""
SIMULATOR REFACTOR GUIDE
========================

This guide shows how to update simulator.py to generate 35-feature synthetic data.

CRITICAL CHANGES:
1. Load feature order from feature_order.yaml
2. Generate temporal features (20-23)
3. Sample all 35 features from priors.yaml
4. Output 36-column CSV (35 features + 1 target)

"""

import yaml
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path

# ============================================================================
# STEP 1: Load Feature Order Configuration
# ============================================================================

def load_feature_order() -> dict:
    """
    Load canonical feature ordering from feature_order.yaml.
    
    Returns:
        dict: {index: {name, category, unit, weight_prior, ...}}
    """
    feature_path = Path(__file__).parent.parent / "data" / "feature_order.yaml"
    with open(feature_path) as f:
        config = yaml.safe_load(f)
    return config['features']


def load_priors() -> dict:
    """
    Load feature distribution parameters from priors.yaml.
    
    Returns:
        dict: {feature_name: {dist, mu, sigma, min, max, ...}}
    """
    priors_path = Path(__file__).parent.parent / "data" / "priors.yaml"
    with open(priors_path) as f:
        return yaml.safe_load(f)


# ============================================================================
# STEP 2: Temporal Feature Computation
# ============================================================================

def compute_temporal_features(timestamp: datetime) -> dict:
    """
    Compute cyclical temporal encodings for a given timestamp.
    
    Features:
        - day_of_week_sin/cos: Weekly cycle (indices 20-21)
        - week_of_year_sin/cos: Annual cycle (indices 22-23)
    
    Args:
        timestamp: datetime object
    
    Returns:
        dict: {20: sin_dow, 21: cos_dow, 22: sin_woy, 23: cos_woy}
    """
    day_of_week = timestamp.weekday()  # 0 (Monday) to 6 (Sunday)
    week_of_year = timestamp.isocalendar()[1]  # 1 to 52
    
    return {
        20: np.sin(2 * np.pi * day_of_week / 7),
        21: np.cos(2 * np.pi * day_of_week / 7),
        22: np.sin(2 * np.pi * week_of_year / 52),
        23: np.cos(2 * np.pi * week_of_year / 52)
    }


# ============================================================================
# STEP 3: Feature Sampling Functions
# ============================================================================

def sample_from_prior(feature_name: str, priors: dict, rng: np.random.Generator) -> float:
    """
    Sample a feature value from its prior distribution.
    
    Supported distributions:
        - normal: Normal(mu, sigma)
        - lognormal: LogNormal(mu_ln, sigma_ln)
        - exponential: Exponential(lambda) truncated to [min, max]
        - uniform: Uniform(min, max)
        - cyclical: Already computed in compute_temporal_features()
    
    Args:
        feature_name: Name of feature (matches priors.yaml keys)
        priors: Full priors dictionary
        rng: NumPy random generator
    
    Returns:
        float: Sampled value
    """
    if feature_name not in priors:
        raise ValueError(f"Feature '{feature_name}' not found in priors.yaml")
    
    params = priors[feature_name]
    dist_type = params.get('dist', 'normal')
    
    if dist_type == 'normal':
        value = rng.normal(params['mu'], params['sigma'])
        
    elif dist_type == 'lognormal':
        value = rng.lognormal(params['mu_ln'], params['sigma_ln'])
        
    elif dist_type == 'exponential':
        # Exponential with truncation
        lambda_param = 1.0 / params.get('sigma', 1.0)
        value = rng.exponential(1.0 / lambda_param)
        
    elif dist_type == 'uniform':
        value = rng.uniform(params['min'], params['max'])
        
    else:
        raise ValueError(f"Unknown distribution: {dist_type}")
    
    # Apply bounds if specified
    if 'min' in params:
        value = max(value, params['min'])
    if 'max' in params:
        value = min(value, params['max'])
    
    return value


# ============================================================================
# STEP 4: MigraineSimulator Refactor
# ============================================================================

class MigraineSimulator:
    """
    Generate synthetic migraine episodes with 35 features.
    
    Architecture:
        - Latent state model: Z_t ∈ R^4 (stress, sleepDebt, hormonal, envLoad)
        - Observed features: X_t ∈ R^35 (conditionally independent given Z_t)
        - Target: Y_t ∈ {0, 1} (migraine occurrence)
    
    Usage:
        >>> sim = MigraineSimulator(n_samples=1000000)
        >>> data = sim.generate()
        >>> sim.save_to_csv(data, "synthetic_migraine_train.csv")
    """
    
    def __init__(self, n_samples: int = 1000000, seed: int = 42):
        """
        Initialize simulator.
        
        Args:
            n_samples: Number of hourly observations to generate
            seed: Random seed for reproducibility
        """
        self.n_samples = n_samples
        self.rng = np.random.default_rng(seed)
        
        # Load configurations
        self.features = load_feature_order()
        self.priors = load_priors()
        self.n_features = len(self.features)  # Should be 35
        
        # Latent dimensions
        self.z_dim = 4
        
        # Initialize latent dynamics (example)
        # Z_{t+1} = A @ Z_t + B @ u_t + η_t
        self.A = np.array([
            [0.95, 0.05, 0.00, 0.00],  # stress persists
            [0.10, 0.90, 0.00, 0.00],  # sleep debt accumulates
            [0.00, 0.00, 0.98, 0.02],  # hormonal cycle
            [0.05, 0.00, 0.00, 0.85],  # environmental load
        ])
        self.B = np.eye(4) * 0.1  # Control input (user actions)
        self.process_noise_std = 0.15
    
    def generate(self) -> np.ndarray:
        """
        Generate synthetic dataset.
        
        Returns:
            np.ndarray: Shape (n_samples, 36)
                Columns 0-34: 35 features
                Column 35: target (0 or 1)
        """
        data = np.zeros((self.n_samples, self.n_features + 1))
        
        # Initialize latent state
        z_t = self.rng.normal(0, 1, self.z_dim)
        
        # Start timestamp
        current_time = datetime(2023, 1, 1, 0, 0, 0)
        
        for t in range(self.n_samples):
            # Print progress
            if t % 100000 == 0:
                print(f"Generating sample {t}/{self.n_samples}...")
            
            # Temporal features (indices 20-23)
            temporal_feats = compute_temporal_features(current_time)
            
            # Sample each feature
            for idx in range(self.n_features):
                if idx in temporal_feats:
                    # Use pre-computed temporal encoding
                    data[t, idx] = temporal_feats[idx]
                else:
                    # Sample from prior (influenced by latent state)
                    feature_config = self.features[idx]
                    feature_name = feature_config['name']
                    
                    # Base sample
                    base_value = sample_from_prior(feature_name, self.priors, self.rng)
                    
                    # Modulate by latent state (example)
                    # Different features depend on different latent dims
                    if 'Sleep' in feature_name:
                        modulation = z_t[1] * 0.5  # sleepDebt
                    elif 'Stress' in feature_name or 'Anxiety' in feature_name:
                        modulation = z_t[0] * 0.8  # stress
                    elif 'Menstrual' in feature_name or 'Hormone' in feature_name:
                        modulation = z_t[2] * 0.6  # hormonal
                    elif 'Pressure' in feature_name or 'Weather' in feature_name:
                        modulation = z_t[3] * 0.4  # envLoad
                    else:
                        modulation = 0.0
                    
                    data[t, idx] = base_value + modulation
            
            # Compute migraine probability
            # P(Y_t=1 | Z_t) = sigmoid(w^T Z_t + b)
            weights = np.array([1.2, 1.5, 0.8, 0.6])  # Example
            bias = -2.0
            logit = np.dot(weights, z_t) + bias
            prob = 1 / (1 + np.exp(-logit))
            
            # Sample migraine occurrence
            data[t, -1] = 1 if self.rng.random() < prob else 0
            
            # Evolve latent state
            u_t = self.rng.normal(0, 0.1, self.z_dim)  # Control input
            noise = self.rng.normal(0, self.process_noise_std, self.z_dim)
            z_t = self.A @ z_t + self.B @ u_t + noise
            
            # Increment time (1 hour)
            current_time += timedelta(hours=1)
        
        return data
    
    def save_to_csv(self, data: np.ndarray, filename: str):
        """
        Save generated data to CSV.
        
        Args:
            data: Generated dataset (n_samples, 36)
            filename: Output filename (e.g., "synthetic_migraine_train.csv")
        """
        import pandas as pd
        
        # Build column names
        columns = []
        for idx in range(self.n_features):
            columns.append(self.features[idx]['name'])
        columns.append('target')
        
        df = pd.DataFrame(data, columns=columns)
        
        output_path = Path(__file__).parent.parent / "data" / filename
        df.to_csv(output_path, index=False)
        print(f"Saved {len(df)} samples to {output_path}")
        print(f"Columns: {len(df.columns)} (35 features + 1 target)")
        print(f"Migraine prevalence: {df['target'].mean():.3f}")


# ============================================================================
# STEP 5: Main Execution
# ============================================================================

if __name__ == "__main__":
    print("="*80)
    print("ALINE Synthetic Data Generator - 35 Feature Expansion")
    print("="*80)
    
    # Generate training set
    print("\n[1/2] Generating TRAINING set...")
    sim_train = MigraineSimulator(n_samples=2_100_000, seed=42)
    data_train = sim_train.generate()
    sim_train.save_to_csv(data_train, "synthetic_migraine_train.csv")
    
    # Generate validation set
    print("\n[2/2] Generating VALIDATION set...")
    sim_val = MigraineSimulator(n_samples=900_000, seed=123)
    data_val = sim_val.generate()
    sim_val.save_to_csv(data_val, "synthetic_migraine_val.csv")
    
    print("\n" + "="*80)
    print("COMPLETE! Ready to train with 35 features.")
    print("="*80)
    print("\nNext steps:")
    print("  1. Verify CSV columns: head -1 data/synthetic_migraine_train.csv | tr ',' '\\n' | wc -l")
    print("  2. Check config: grep in_dim configs/model.yaml")
    print("  3. Start training: python scripts/train.py")


# ============================================================================
# VERIFICATION FUNCTIONS
# ============================================================================

def verify_feature_count():
    """Quick verification that configs are aligned."""
    features = load_feature_order()
    print(f"Features in feature_order.yaml: {len(features)}")
    
    import yaml
    with open(Path(__file__).parent.parent / "configs" / "model.yaml") as f:
        model_config = yaml.safe_load(f)
    print(f"in_dim in model.yaml: {model_config['model']['in_dim']}")
    
    with open(Path(__file__).parent.parent / "configs" / "train.yaml") as f:
        train_config = yaml.safe_load(f)
    print(f"in_dim in train.yaml: {train_config['model']['in_dim']}")
    
    assert len(features) == 35, "feature_order.yaml should have 35 features"
    assert model_config['model']['in_dim'] == 35, "model.yaml in_dim should be 35"
    assert train_config['model']['in_dim'] == 35, "train.yaml in_dim should be 35"
    
    print("\n✅ All configurations aligned for 35 features!")


"""
INTEGRATION NOTES
=================

This refactored simulator:
1. ✅ Loads feature order from feature_order.yaml (canonical source of truth)
2. ✅ Generates temporal features (indices 20-23) using cyclical encoding
3. ✅ Samples all 35 features from priors.yaml distributions
4. ✅ Outputs 36-column CSV (35 features + target)
5. ✅ Uses latent state model for realistic correlations

Key differences from old simulator:
- Dynamic feature count (reads from config instead of hardcoded 20)
- Temporal encoding for day/week cycles
- Cleaner separation: feature_order.yaml = indices, priors.yaml = distributions
- Better modularity (can add features by editing YAMLs, not Python)

Testing:
>>> python scripts/simulator_refactor.py
>>> # Should output 2.1M training + 900K validation samples
>>> # Each with 36 columns (35 features + 1 target)

Estimated runtime: 8-10 minutes for 3M total samples
"""
