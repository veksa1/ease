"""
ALINE Migraine Simulator - Ticket 004
Bayesian / Markov Simulator for Synthetic Migraine Episodes

Generates realistic temporal dynamics of migraine risk using:
- Latent state evolution (stress, sleepDebt, hormonal, environmental)
- Observable features sampled from priors
- Logistic migraine occurrence model

Author: ALINE Team
Date: 2025-11-15
"""

import numpy as np
import pandas as pd
import yaml
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class SimulatorConfig:
    """Configuration for migraine simulator"""
    n_users: int
    horizon: int
    train_split: float
    random_seed: int
    latent_dim: int
    state_transition_matrix: np.ndarray
    input_matrix: np.ndarray
    process_noise: np.ndarray
    migraine_weights: np.ndarray
    migraine_bias: float
    baseline_migraine_rate: float
    feature_order: List[str]
    priors: Dict[str, Any]
    feature_metadata: pd.DataFrame


class MigraineSimulator:
    """
    Generates synthetic migraine episodes using a latent state model.
    
    Model:
        Z_t = [stress, sleepDebt, hormonal, envLoad]
        Z_{t+1} = A @ Z_t + B @ u_t + η_t
        η_t ~ N(0, Σ)
        
    Observations:
        x_i ~ p_i(x|μ_i, σ_i) from priors
        
    Migraine:
        p(y_t=1|Z_t) = 1/(1+exp(-(w@Z_t+b)))
    """
    
    def __init__(self, config: SimulatorConfig):
        self.config = config
        self.rng = np.random.RandomState(config.random_seed)
        self.n_features = len(config.feature_order)
        
    def _sample_feature(self, feature_name: str, prior: Dict[str, Any]) -> float:
        """Sample a single feature value from its prior distribution"""
        dist_type = prior.get('dist', 'normal')
        
        if dist_type == 'normal':
            mu = prior['mu']
            sigma = prior['sigma']
            value = self.rng.normal(mu, sigma)
        elif dist_type == 'lognormal':
            mu_ln = prior['mu_ln']
            sigma_ln = prior['sigma_ln']
            value = self.rng.lognormal(mu_ln, sigma_ln)
        elif dist_type == 'uniform':
            min_val = prior['min']
            max_val = prior['max']
            value = self.rng.uniform(min_val, max_val)
        elif dist_type == 'exponential':
            # Use mu_ln as scale parameter (mean)
            scale = prior.get('mu_ln', 1.0)
            value = self.rng.exponential(scale)
        elif dist_type == 'cyclical':
            # For cyclical features, they should be computed from timestamps
            # Return a placeholder that will be overridden
            value = 0.0
        else:
            raise ValueError(f"Unknown distribution type: {dist_type}")
        
        # Clip to valid range if specified
        if 'min' in prior and 'max' in prior:
            value = np.clip(value, prior['min'], prior['max'])
        
        return value
    
    def _sample_observations(self) -> np.ndarray:
        """Sample all observable features for one time step"""
        observations = np.zeros(self.n_features)
        
        for i, feature_name in enumerate(self.config.feature_order):
            if feature_name in self.config.priors:
                prior = self.config.priors[feature_name]
                observations[i] = self._sample_feature(feature_name, prior)
            else:
                # Default: sample from standard normal if prior missing
                observations[i] = self.rng.randn()
                
        return observations
    
    def _compute_input_effect(self, observations: np.ndarray) -> np.ndarray:
        """Compute how observations affect latent state (B @ u_t)"""
        # Normalize observations to prevent accumulation
        # Subtract means and scale to unit variance
        normalized_obs = np.zeros_like(observations)
        
        for i, feature_name in enumerate(self.config.feature_order):
            if feature_name in self.config.priors:
                prior = self.config.priors[feature_name]
                if 'mu' in prior:
                    mean = prior['mu']
                    std = prior.get('sigma', 1.0)
                elif 'mu_ln' in prior:
                    # For lognormal, approximate mean/std
                    mean = np.exp(prior['mu_ln'] + prior['sigma_ln']**2 / 2)
                    std = np.sqrt((np.exp(prior['sigma_ln']**2) - 1) * np.exp(2*prior['mu_ln'] + prior['sigma_ln']**2))
                elif 'min' in prior:
                    mean = (prior['min'] + prior['max']) / 2
                    std = (prior['max'] - prior['min']) / 4
                else:
                    mean = 0
                    std = 1
                normalized_obs[i] = (observations[i] - mean) / max(std, 0.1)
            else:
                normalized_obs[i] = observations[i]
        
        return self.config.input_matrix @ normalized_obs
    
    def _evolve_latent_state(self, Z: np.ndarray, observations: np.ndarray) -> np.ndarray:
        """
        Evolve latent state: Z_{t+1} = A @ Z_t + B @ u_t + η_t
        """
        # State transition
        Z_next = self.config.state_transition_matrix @ Z
        
        # Input effect
        Z_next += self._compute_input_effect(observations)
        
        # Process noise
        noise = self.rng.randn(self.config.latent_dim) * self.config.process_noise
        Z_next += noise
        
        return Z_next
    
    def _migraine_probability(self, Z: np.ndarray) -> float:
        """
        Compute migraine probability: p = 1/(1+exp(-(w@Z+b)))
        """
        logit = np.dot(self.config.migraine_weights, Z) + self.config.migraine_bias
        prob = 1.0 / (1.0 + np.exp(-logit))
        return np.clip(prob, 0.0, 1.0)
    
    def _compute_temporal_features(self, day: int, start_day_of_week: int = 0) -> Dict[str, float]:
        """
        Compute temporal cycle features for a given day (Ticket 020).
        
        Args:
            day: Day number in simulation (0-indexed)
            start_day_of_week: Starting day of week (0=Monday, 6=Sunday)
        
        Returns:
            Dictionary with temporal feature values
        """
        # Calculate day of week (0=Monday, 6=Sunday)
        day_of_week = (start_day_of_week + day) % 7
        
        # Calculate week of year (approximate: day / 7 % 52)
        week_of_year = (day // 7) % 52
        
        # Cyclical encoding using sine/cosine
        temporal_features = {
            'day_of_week_sin': np.sin(2 * np.pi * day_of_week / 7),
            'day_of_week_cos': np.cos(2 * np.pi * day_of_week / 7),
            'week_of_year_sin': np.sin(2 * np.pi * week_of_year / 52),
            'week_of_year_cos': np.cos(2 * np.pi * week_of_year / 52)
        }
        
        return temporal_features
    
    def simulate_user(self, user_id: int) -> pd.DataFrame:
        """
        Simulate one user's migraine episodes over the horizon.
        
        Returns:
            DataFrame with columns: user_id, day, Z_0, Z_1, Z_2, Z_3, features..., migraine
        """
        # Initialize latent state near zero (equilibrium)
        Z = self.rng.randn(self.config.latent_dim) * 0.1
        
        records = []
        
        for day in range(self.config.horizon):
            # Sample observable features
            observations = self._sample_observations()
            
            # Evolve latent state
            Z = self._evolve_latent_state(Z, observations)
            
            # Compute migraine probability and sample outcome
            migraine_prob = self._migraine_probability(Z)
            migraine = self.rng.binomial(1, migraine_prob)
            
            # Compute temporal features (Ticket 020)
            temporal_features = self._compute_temporal_features(day)
            
            # Record the day
            record = {
                'user_id': user_id,
                'day': day,
                'Z_stress': Z[0],
                'Z_sleepDebt': Z[1],
                'Z_hormonal': Z[2],
                'Z_envLoad': Z[3],
                'migraine_prob': migraine_prob,
                'migraine': migraine
            }
            
            # Add feature observations
            for i, feature_name in enumerate(self.config.feature_order):
                record[feature_name] = observations[i]
            
            # Add temporal features (Ticket 020)
            record.update(temporal_features)
            
            records.append(record)
        
        return pd.DataFrame(records)
    
    def simulate_population(self) -> pd.DataFrame:
        """
        Simulate entire population of users.
        """
        logger.info(f"Simulating {self.config.n_users} users over {self.config.horizon} days...")
        
        all_data = []
        
        for user_id in range(self.config.n_users):
            if (user_id + 1) % 1000 == 0:
                logger.info(f"Simulated {user_id + 1}/{self.config.n_users} users")
            
            user_data = self.simulate_user(user_id)
            all_data.append(user_data)
        
        df = pd.concat(all_data, ignore_index=True)
        
        logger.info(f"Simulation complete: {len(df)} total records")
        logger.info(f"Migraine rate: {df['migraine'].mean():.3f}")
        
        return df
    
    def split_train_val(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Split data into train and validation sets by user"""
        n_train_users = int(self.config.n_users * self.config.train_split)
        
        train_df = df[df['user_id'] < n_train_users].copy()
        val_df = df[df['user_id'] >= n_train_users].copy()
        
        logger.info(f"Train: {len(train_df)} records ({train_df['user_id'].nunique()} users)")
        logger.info(f"Val: {len(val_df)} records ({val_df['user_id'].nunique()} users)")
        
        return train_df, val_df


def load_config(config_path: str) -> SimulatorConfig:
    """Load and parse simulator configuration"""
    with open(config_path, 'r') as f:
        config_dict = yaml.safe_load(f)
    
    # Load priors
    with open(config_dict['paths']['priors'], 'r') as f:
        priors = yaml.safe_load(f)
    
    # Load feature metadata
    feature_metadata = pd.read_csv(config_dict['paths']['feature_metadata'])
    
    # Build state transition matrix A
    A = np.array(config_dict['state_transition_matrix'])
    
    # Build input matrix B (4 x n_features)
    n_features = len(config_dict['feature_order'])
    B = np.zeros((4, n_features))
    
    # Map feature categories to latent dimensions
    feature_category_map = {}
    for _, row in feature_metadata.iterrows():
        feature_category_map[row['variable']] = row['category']
    
    # Fill B matrix based on feature weights and categories
    for i, feature_name in enumerate(config_dict['feature_order']):
        category = feature_category_map.get(feature_name, 'Unknown')
        
        # Map categories to latent dimensions
        if category == 'Stress':
            B[0, i] = config_dict['input_weights']['stress']
        elif category == 'Sleep':
            B[1, i] = config_dict['input_weights']['sleep']
        elif category == 'Hormonal':
            B[2, i] = config_dict['input_weights']['hormonal']
        elif category == 'Environmental':
            B[3, i] = config_dict['input_weights']['environmental']
        else:
            # Other categories have small mixed effects
            B[:, i] = config_dict['input_weights']['environmental'] * 0.5
    
    # Process noise covariance (diagonal)
    process_noise = np.array([
        config_dict['process_noise']['stress'],
        config_dict['process_noise']['sleepDebt'],
        config_dict['process_noise']['hormonal'],
        config_dict['process_noise']['envLoad']
    ])
    
    # Migraine model parameters
    migraine_weights = np.array(config_dict['migraine_model']['weights'])
    migraine_bias = config_dict['migraine_model']['bias']
    
    return SimulatorConfig(
        n_users=config_dict['n_users'],
        horizon=config_dict['horizon'],
        train_split=config_dict['train_split'],
        random_seed=config_dict['random_seed'],
        latent_dim=config_dict['latent_dim'],
        state_transition_matrix=A,
        input_matrix=B,
        process_noise=process_noise,
        migraine_weights=migraine_weights,
        migraine_bias=migraine_bias,
        baseline_migraine_rate=config_dict['baseline_migraine_rate'],
        feature_order=config_dict['feature_order'],
        priors=priors,
        feature_metadata=feature_metadata
    )


def save_metadata(config: SimulatorConfig, train_df: pd.DataFrame, val_df: pd.DataFrame, output_path: str):
    """Save metadata about the generated dataset"""
    metadata = {
        'generation_date': pd.Timestamp.now().isoformat(),
        'config': {
            'n_users': config.n_users,
            'horizon': config.horizon,
            'train_split': config.train_split,
            'random_seed': config.random_seed,
            'latent_dim': config.latent_dim,
            'baseline_migraine_rate': config.baseline_migraine_rate
        },
        'dataset_stats': {
            'train': {
                'n_records': len(train_df),
                'n_users': train_df['user_id'].nunique(),
                'migraine_rate': float(train_df['migraine'].mean()),
                'avg_migraines_per_user': float(train_df.groupby('user_id')['migraine'].sum().mean())
            },
            'val': {
                'n_records': len(val_df),
                'n_users': val_df['user_id'].nunique(),
                'migraine_rate': float(val_df['migraine'].mean()),
                'avg_migraines_per_user': float(val_df.groupby('user_id')['migraine'].sum().mean())
            }
        },
        'features': config.feature_order,
        'latent_state_columns': ['Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad']
    }
    
    with open(output_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Metadata saved to {output_path}")


def main():
    """Main entry point for simulator"""
    # Load configuration
    config_path = Path(__file__).parent.parent / 'configs' / 'simulator.yaml'
    logger.info(f"Loading configuration from {config_path}")
    config = load_config(str(config_path))
    
    # Create simulator
    simulator = MigraineSimulator(config)
    
    # Generate population data
    df = simulator.simulate_population()
    
    # Split into train/val
    train_df, val_df = simulator.split_train_val(df)
    
    # Save datasets
    output_dir = Path(__file__).parent.parent / 'data'
    train_path = output_dir / 'synthetic_migraine_train.csv'
    val_path = output_dir / 'synthetic_migraine_val.csv'
    meta_path = output_dir / 'synthetic_migraine_meta.json'
    
    logger.info(f"Saving train data to {train_path}")
    train_df.to_csv(train_path, index=False)
    
    logger.info(f"Saving validation data to {val_path}")
    val_df.to_csv(val_path, index=False)
    
    # Save metadata
    save_metadata(config, train_df, val_df, str(meta_path))
    
    logger.info("✅ Simulation complete!")
    logger.info(f"Total records: {len(df):,}")
    logger.info(f"Train records: {len(train_df):,}")
    logger.info(f"Val records: {len(val_df):,}")
    logger.info(f"Overall migraine rate: {df['migraine'].mean():.3f}")


if __name__ == '__main__':
    main()
