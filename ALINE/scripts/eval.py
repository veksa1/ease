"""
Evaluation Script - Ticket 009

Computes key metrics and compares against baselines:
- ROC-AUC for next-day migraine prediction
- Brier score (calibration)
- PR-AUC
- Uncertainty reduction vs random querying
- Comparison with baseline policies

Author: ALINE Team
Date: 2025-11-15
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import yaml
import json
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_auc_score, brier_score_loss, precision_recall_curve, auc as sklearn_auc
from typing import Dict, List, Tuple

from models.aline import SimpleALINE
from models.policy_utils import (
    compute_priority_scores,
    select_topk_hours,
    simulate_random_policy,
    simulate_fixed_policy
)


def load_model_and_data(
    checkpoint_path: str,
    data_path: str,
    config_path: str
) -> Tuple[SimpleALINE, pd.DataFrame, dict]:
    """Load trained model and evaluation data."""
    
    # Load config
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    # Load model
    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    model = SimpleALINE(
        in_dim=config['in_dim'],
        z_dim=config['z_dim'],
        d_model=config['d_model'],
        nhead=config['nhead'],
        nlayers=config['nlayers']
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Load data
    df = pd.read_csv(data_path)
    
    return model, df, config


def compute_prediction_metrics(
    model: SimpleALINE,
    df: pd.DataFrame,
    feature_cols: List[str],
    migraine_weights: torch.Tensor,
    migraine_bias: float = -1.8,
    sequence_length: int = 24
) -> Dict:
    """
    Compute prediction metrics: AUC, Brier, PR-AUC.
    """
    all_preds = []
    all_targets = []
    all_probs = []
    
    model.eval()
    
    # Process each user
    for user_id in df['user_id'].unique():
        user_df = df[df['user_id'] == user_id].sort_values('day')
        
        # Create sequences
        for i in range(len(user_df) - sequence_length):
            window = user_df.iloc[i:i+sequence_length]
            next_day = user_df.iloc[i+sequence_length]
            
            # Get features
            features = torch.FloatTensor(window[feature_cols].values).unsqueeze(0)
            
            # Predict
            with torch.no_grad():
                posterior, _ = model(features)
                mu_last = posterior.mean[0, -1, :]
                p_migraine = torch.sigmoid((mu_last @ migraine_weights) + migraine_bias)
            
            all_preds.append(p_migraine.item())
            all_targets.append(next_day['migraine'])
            all_probs.append(next_day['migraine_prob'])
    
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    
    # Compute metrics
    if len(np.unique(all_targets)) > 1:
        roc_auc = roc_auc_score(all_targets, all_preds)
        precision, recall, _ = precision_recall_curve(all_targets, all_preds)
        pr_auc = sklearn_auc(recall, precision)
    else:
        roc_auc = 0.5
        pr_auc = 0.5
    
    brier = brier_score_loss(all_targets, all_preds)
    
    # Calibration: mean predicted vs mean actual
    mean_pred = all_preds.mean()
    mean_actual = all_targets.mean()
    calibration_error = abs(mean_pred - mean_actual)
    
    return {
        'roc_auc': float(roc_auc),
        'pr_auc': float(pr_auc),
        'brier_score': float(brier),
        'mean_predicted': float(mean_pred),
        'mean_actual': float(mean_actual),
        'calibration_error': float(calibration_error),
        'n_samples': len(all_preds)
    }


def evaluate_policy_baselines(
    model: SimpleALINE,
    df: pd.DataFrame,
    feature_cols: List[str],
    migraine_weights: torch.Tensor,
    k: int = 3,
    sequence_length: int = 24
) -> Dict:
    """
    Compare ALINE policy against baselines for uncertainty reduction.
    """
    
    model.eval()
    
    policy_uncertainties = []
    random_uncertainties = []
    fixed_uncertainties = []
    
    # Fixed schedule baseline (8am, 12pm, 8pm)
    fixed_hours = [8, 12, 20]
    
    # Process sequences
    for user_id in df['user_id'].unique():
        user_df = df[df['user_id'] == user_id].sort_values('day')
        
        for i in range(len(user_df) - sequence_length):
            window = user_df.iloc[i:i+sequence_length]
            features = torch.FloatTensor(window[feature_cols].values).unsqueeze(0)
            
            with torch.no_grad():
                posterior, policy_scores = model(features)
                
                # Compute priority scores
                priority_scores = compute_priority_scores(
                    posterior.mean[0], 
                    posterior.stddev[0],
                    migraine_weights
                )
                
                # ALINE policy: select top-k
                policy_indices, _ = select_topk_hours(priority_scores, k)
                
                # Random policy
                random_indices = simulate_random_policy(sequence_length, k, batch_size=1)[0]
                
                # Fixed policy
                fixed_indices = torch.tensor(fixed_hours[:k])
                
                # Compute mean uncertainty at selected hours
                uncertainty = posterior.stddev[0].mean(dim=-1)  # [T]
                
                policy_unc = uncertainty[policy_indices].mean().item()
                random_unc = uncertainty[random_indices].mean().item()
                fixed_unc = uncertainty[fixed_indices].mean().item()
                
                policy_uncertainties.append(policy_unc)
                random_uncertainties.append(random_unc)
                fixed_uncertainties.append(fixed_unc)
    
    policy_uncertainties = np.array(policy_uncertainties)
    random_uncertainties = np.array(random_uncertainties)
    fixed_uncertainties = np.array(fixed_uncertainties)
    
    return {
        'aline_policy': {
            'mean_uncertainty': float(policy_uncertainties.mean()),
            'std_uncertainty': float(policy_uncertainties.std())
        },
        'random_policy': {
            'mean_uncertainty': float(random_uncertainties.mean()),
            'std_uncertainty': float(random_uncertainties.std())
        },
        'fixed_policy': {
            'mean_uncertainty': float(fixed_uncertainties.mean()),
            'std_uncertainty': float(fixed_uncertainties.std()),
            'hours': fixed_hours[:k]
        },
        'relative_improvement': {
            'vs_random': float((random_uncertainties.mean() - policy_uncertainties.mean()) / random_uncertainties.mean() * 100),
            'vs_fixed': float((fixed_uncertainties.mean() - policy_uncertainties.mean()) / fixed_uncertainties.mean() * 100)
        }
    }


def plot_roc_curve(
    model: SimpleALINE,
    df: pd.DataFrame,
    feature_cols: List[str],
    migraine_weights: torch.Tensor,
    migraine_bias: float = -1.8,
    save_path: str = None
):
    """Plot ROC curve."""
    from sklearn.metrics import roc_curve
    
    all_preds = []
    all_targets = []
    
    model.eval()
    sequence_length = 24
    
    for user_id in df['user_id'].unique():
        user_df = df[df['user_id'] == user_id].sort_values('day')
        
        for i in range(len(user_df) - sequence_length):
            window = user_df.iloc[i:i+sequence_length]
            next_day = user_df.iloc[i+sequence_length]
            
            features = torch.FloatTensor(window[feature_cols].values).unsqueeze(0)
            
            with torch.no_grad():
                posterior, _ = model(features)
                mu_last = posterior.mean[0, -1, :]
                p_migraine = torch.sigmoid((mu_last @ migraine_weights) + migraine_bias)
            
            all_preds.append(p_migraine.item())
            all_targets.append(next_day['migraine'])
    
    fpr, tpr, _ = roc_curve(all_targets, all_preds)
    roc_auc = roc_auc_score(all_targets, all_preds)
    
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, 'b-', linewidth=2, label=f'ALINE (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], 'r--', linewidth=1, label='Random')
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title('ROC Curve - Next-Day Migraine Prediction', fontsize=14)
    plt.legend(loc='lower right')
    plt.grid(alpha=0.3)
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"✓ Saved ROC curve to {save_path}")
    
    plt.close()


def plot_policy_comparison(
    policy_results: Dict,
    save_path: str = None
):
    """Plot policy uncertainty comparison."""
    
    policies = ['ALINE\nPolicy', 'Random\nPolicy', 'Fixed\nSchedule']
    means = [
        policy_results['aline_policy']['mean_uncertainty'],
        policy_results['random_policy']['mean_uncertainty'],
        policy_results['fixed_policy']['mean_uncertainty']
    ]
    stds = [
        policy_results['aline_policy']['std_uncertainty'],
        policy_results['random_policy']['std_uncertainty'],
        policy_results['fixed_policy']['std_uncertainty']
    ]
    
    plt.figure(figsize=(10, 6))
    x = np.arange(len(policies))
    bars = plt.bar(x, means, yerr=stds, capsize=5, alpha=0.7,
                   color=['#2ecc71', '#e74c3c', '#3498db'])
    
    plt.xlabel('Policy', fontsize=12)
    plt.ylabel('Mean Uncertainty at Selected Hours', fontsize=12)
    plt.title('Policy Comparison: Uncertainty Reduction', fontsize=14)
    plt.xticks(x, policies)
    plt.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for bar, mean in zip(bars, means):
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{mean:.4f}',
                ha='center', va='bottom', fontsize=10)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"✓ Saved policy comparison to {save_path}")
    
    plt.close()


def main():
    """Main evaluation script."""
    
    print("=" * 60)
    print("ALINE Model Evaluation - Ticket 009")
    print("=" * 60)
    
    # Paths
    checkpoint_path = 'runs/checkpoints/best.pt'
    data_path = 'data/synthetic_migraine_val.csv'
    config_path = 'configs/model.yaml'
    
    # Load model and data
    print("\n📥 Loading model and data...")
    model, df, config = load_model_and_data(checkpoint_path, data_path, config_path)
    print(f"✓ Loaded model with {sum(p.numel() for p in model.parameters()):,} parameters")
    print(f"✓ Loaded {len(df)} records from {len(df['user_id'].unique())} users")
    
    # Feature columns
    feature_cols = [col for col in df.columns if col not in [
        'user_id', 'day', 'Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad',
        'migraine_prob', 'migraine'
    ]]
    
    # Migraine weights
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35])
    migraine_bias = -1.8
    
    # Create output directories
    Path('reports').mkdir(exist_ok=True)
    Path('reports/plots').mkdir(exist_ok=True)
    
    # 1. Prediction metrics
    print("\n📊 Computing prediction metrics...")
    pred_metrics = compute_prediction_metrics(
        model, df, feature_cols, migraine_weights, migraine_bias
    )
    
    print(f"\n  Prediction Metrics:")
    print(f"    ROC-AUC:           {pred_metrics['roc_auc']:.4f}")
    print(f"    PR-AUC:            {pred_metrics['pr_auc']:.4f}")
    print(f"    Brier Score:       {pred_metrics['brier_score']:.4f}")
    print(f"    Calibration Error: {pred_metrics['calibration_error']:.4f}")
    print(f"    Mean Predicted:    {pred_metrics['mean_predicted']:.4f}")
    print(f"    Mean Actual:       {pred_metrics['mean_actual']:.4f}")
    
    # 2. Policy baselines
    print("\n🎯 Evaluating policy baselines...")
    policy_results = evaluate_policy_baselines(
        model, df, feature_cols, migraine_weights, k=3
    )
    
    print(f"\n  Policy Uncertainty Comparison:")
    print(f"    ALINE Policy:  {policy_results['aline_policy']['mean_uncertainty']:.4f} ± {policy_results['aline_policy']['std_uncertainty']:.4f}")
    print(f"    Random Policy: {policy_results['random_policy']['mean_uncertainty']:.4f} ± {policy_results['random_policy']['std_uncertainty']:.4f}")
    print(f"    Fixed Schedule: {policy_results['fixed_policy']['mean_uncertainty']:.4f} ± {policy_results['fixed_policy']['std_uncertainty']:.4f}")
    print(f"\n  Relative Improvement:")
    print(f"    vs Random:  {policy_results['relative_improvement']['vs_random']:.2f}%")
    print(f"    vs Fixed:   {policy_results['relative_improvement']['vs_fixed']:.2f}%")
    
    # 3. Save results
    results_summary = {
        'prediction_metrics': pred_metrics,
        'policy_evaluation': policy_results,
        'model_config': config
    }
    
    with open('reports/eval_summary.json', 'w') as f:
        json.dump(results_summary, f, indent=2)
    print(f"\n✓ Saved evaluation summary to reports/eval_summary.json")
    
    # 4. Generate plots
    print("\n📈 Generating plots...")
    plot_roc_curve(
        model, df, feature_cols, migraine_weights, migraine_bias,
        save_path='reports/plots/roc_curve.png'
    )
    
    plot_policy_comparison(
        policy_results,
        save_path='reports/plots/policy_comparison.png'
    )
    
    print("\n" + "=" * 60)
    print("✅ Evaluation complete!")
    print("=" * 60)
    print("\n📦 Output files:")
    print("  - reports/eval_summary.json")
    print("  - reports/plots/roc_curve.png")
    print("  - reports/plots/policy_comparison.png")
    print()


if __name__ == '__main__':
    main()
