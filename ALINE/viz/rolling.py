"""
Rolling Risk Visualization Helper - Ticket 008

Utilities for creating daily rolling migraine risk curves from hourly data.
Uses 24-hour windows to compute daily risk predictions with uncertainty bands.

Author: ALINE Team
Date: 2025-11-15
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Tuple, Optional, Dict
from models.aline import SimpleALINE
from models.policy_utils import compute_priority_scores, select_topk_hours


def create_daily_windows(df: pd.DataFrame, window_size: int = 24) -> Dict:
    """
    Create 24-hour windows from hourly data for each day.
    
    Args:
        df: DataFrame with columns ['user_id', 'day', features...]
        window_size: Size of rolling window (default: 24 hours)
        
    Returns:
        Dictionary with days as keys and window data as values
    """
    windows = {}
    
    for user_id in df['user_id'].unique():
        user_df = df[df['user_id'] == user_id].sort_values('day')
        
        for day_idx in range(len(user_df) - window_size + 1):
            window = user_df.iloc[day_idx:day_idx+window_size]
            
            day_key = f"user_{user_id}_day_{day_idx}"
            windows[day_key] = window
    
    return windows


def predict_daily_risk(
    model: SimpleALINE,
    features: torch.Tensor,
    migraine_weights: torch.Tensor,
    migraine_bias: float = -1.8,
    device: str = 'cpu'
) -> Tuple[float, float, float]:
    """
    Predict migraine risk for the next day given 24 hours of data.
    
    Args:
        model: Trained ALINE model
        features: Input features [T, in_dim] or [1, T, in_dim]
        migraine_weights: Weights for migraine prediction
        migraine_bias: Bias for migraine prediction
        device: Device to run on
        
    Returns:
        mean_prob: Mean predicted probability
        lower_bound: Lower 5th percentile
        upper_bound: Upper 95th percentile
    """
    model.eval()
    
    if features.dim() == 2:
        features = features.unsqueeze(0)
    
    features = features.to(device)
    migraine_weights = migraine_weights.to(device)
    
    with torch.no_grad():
        posterior, _ = model(features)
        
        # Sample from posterior to get uncertainty estimates
        n_samples = 1000
        mu = posterior.mean[0, -1, :]  # Last time step, [z_dim]
        sigma = posterior.stddev[0, -1, :]
        
        # Sample latent states
        samples = torch.randn(n_samples, len(mu), device=device) * sigma + mu
        
        # Compute migraine probabilities for each sample
        probs = torch.sigmoid((samples @ migraine_weights) + migraine_bias)
        
        mean_prob = probs.mean().item()
        lower_bound = torch.quantile(probs, 0.05).item()
        upper_bound = torch.quantile(probs, 0.95).item()
    
    return mean_prob, lower_bound, upper_bound


def plot_rolling_risk_curve(
    days: np.ndarray,
    mean_probs: np.ndarray,
    lower_bounds: np.ndarray,
    upper_bounds: np.ndarray,
    selected_days: Optional[np.ndarray] = None,
    true_migraines: Optional[np.ndarray] = None,
    title: str = "Daily Migraine Risk (24-hour Rolling Windows)",
    save_path: Optional[str] = None
):
    """
    Plot daily rolling risk curve with uncertainty bands.
    
    Args:
        days: Array of day indices
        mean_probs: Mean predicted probabilities
        lower_bounds: Lower 5th percentile bounds
        upper_bounds: Upper 95th percentile bounds
        selected_days: Days selected by policy (optional)
        true_migraines: Ground truth migraine occurrences (optional)
        title: Plot title
        save_path: Path to save figure (optional)
    """
    plt.figure(figsize=(14, 6))
    
    # Plot mean risk
    plt.plot(days, mean_probs, 'b-', linewidth=2, label='Mean Risk')
    
    # Plot uncertainty band
    plt.fill_between(days, lower_bounds, upper_bounds, alpha=0.3, label='90% Confidence Interval')
    
    # Plot selected days from policy
    if selected_days is not None:
        for day in selected_days:
            if day in days:
                idx = np.where(days == day)[0][0]
                plt.axvline(day, color='orange', linestyle='--', alpha=0.5)
        plt.plot([], [], 'orange', linestyle='--', label='Policy-Selected Days')
    
    # Plot true migraines
    if true_migraines is not None:
        migraine_days = days[true_migraines > 0.5]
        if len(migraine_days) > 0:
            plt.scatter(migraine_days, [1.05] * len(migraine_days), 
                       marker='v', s=100, color='red', label='True Migraine', zorder=5)
    
    plt.xlabel('Day', fontsize=12)
    plt.ylabel('Migraine Probability', fontsize=12)
    plt.title(title, fontsize=14)
    plt.ylim(-0.05, 1.1)
    plt.grid(alpha=0.3)
    plt.legend(loc='best')
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"✓ Saved plot to {save_path}")
    
    return plt.gcf()


def plot_policy_scores_heatmap(
    days: np.ndarray,
    hourly_scores: np.ndarray,
    selected_indices: Optional[np.ndarray] = None,
    title: str = "Policy Priority Scores by Hour",
    save_path: Optional[str] = None
):
    """
    Plot heatmap of policy priority scores across days and hours.
    
    Args:
        days: Array of day indices
        hourly_scores: Priority scores [n_days, 24]
        selected_indices: Selected hour indices per day [n_days, k] (optional)
        title: Plot title
        save_path: Path to save figure (optional)
    """
    plt.figure(figsize=(16, 8))
    
    # Create heatmap
    sns.heatmap(hourly_scores.T, cmap='YlOrRd', cbar_kws={'label': 'Priority Score'},
                xticklabels=days, yticklabels=range(24))
    
    # Mark selected hours
    if selected_indices is not None:
        for day_idx, day in enumerate(days):
            for hour_idx in selected_indices[day_idx]:
                plt.scatter(day_idx + 0.5, hour_idx + 0.5, 
                          marker='*', s=200, color='blue', edgecolor='white', linewidth=1)
    
    plt.xlabel('Day', fontsize=12)
    plt.ylabel('Hour of Day', fontsize=12)
    plt.title(title, fontsize=14)
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"✓ Saved heatmap to {save_path}")
    
    return plt.gcf()


def generate_rolling_curves(
    model: SimpleALINE,
    data_path: str,
    feature_cols: list,
    migraine_weights: torch.Tensor,
    migraine_bias: float = -1.8,
    device: str = 'cpu',
    output_dir: Optional[str] = None,
    n_users: int = 5,
    policy_config: Optional[dict] = None
) -> Dict:
    """
    Generate rolling risk curves for multiple users.
    
    Args:
        model: Trained ALINE model
        data_path: Path to evaluation CSV
        feature_cols: List of feature column names
        migraine_weights: Weights for migraine prediction
        migraine_bias: Bias for migraine prediction
        device: Device to run on
        output_dir: Directory to save plots (optional)
        n_users: Number of users to visualize
        policy_config: Policy configuration for selecting hours (optional)
        
    Returns:
        Dictionary with results and plots
    """
    df = pd.read_csv(data_path)
    results = {}
    
    if output_dir:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    model.to(device)
    model.eval()
    
    # Process each user
    for user_id in df['user_id'].unique()[:n_users]:
        user_df = df[df['user_id'] == user_id].sort_values('day')
        
        days_list = []
        mean_probs_list = []
        lower_bounds_list = []
        upper_bounds_list = []
        true_migraines_list = []
        
        # Compute risk for each 24-hour window
        window_size = 24
        for day_idx in range(len(user_df) - window_size):
            window = user_df.iloc[day_idx:day_idx+window_size]
            next_day = user_df.iloc[day_idx+window_size]
            
            # Get features
            features = torch.FloatTensor(window[feature_cols].values)
            
            # Predict
            mean_prob, lower, upper = predict_daily_risk(
                model, features, migraine_weights, migraine_bias, device
            )
            
            days_list.append(day_idx)
            mean_probs_list.append(mean_prob)
            lower_bounds_list.append(lower)
            upper_bounds_list.append(upper)
            true_migraines_list.append(next_day['migraine'])
        
        days = np.array(days_list)
        mean_probs = np.array(mean_probs_list)
        lower_bounds = np.array(lower_bounds_list)
        upper_bounds = np.array(upper_bounds_list)
        true_migraines = np.array(true_migraines_list)
        
        # Plot
        save_path = f"{output_dir}/user_{user_id}_risk_curve.png" if output_dir else None
        fig = plot_rolling_risk_curve(
            days, mean_probs, lower_bounds, upper_bounds,
            true_migraines=true_migraines,
            title=f"User {user_id}: Daily Migraine Risk",
            save_path=save_path
        )
        
        results[f"user_{user_id}"] = {
            'days': days,
            'mean_probs': mean_probs,
            'lower_bounds': lower_bounds,
            'upper_bounds': upper_bounds,
            'true_migraines': true_migraines,
            'figure': fig
        }
        
        plt.close(fig)
    
    return results
