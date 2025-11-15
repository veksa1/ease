"""
Test script for rolling risk visualization - Ticket 008

Quick test to ensure visualization works without running full notebook.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import yaml
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

from models.aline import SimpleALINE
from viz.rolling import generate_rolling_curves

# Load configuration
with open('configs/model.yaml') as f:
    model_config = yaml.safe_load(f)

# Load trained model
checkpoint_path = 'runs/checkpoints/best.pt'
checkpoint = torch.load(checkpoint_path, map_location='cpu')

model = SimpleALINE(
    in_dim=model_config['in_dim'],
    z_dim=model_config['z_dim'],
    d_model=model_config['d_model'],
    nhead=model_config['nhead'],
    nlayers=model_config['nlayers']
)

model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

print("✓ Model loaded successfully")

# Load validation data
df = pd.read_csv('data/synthetic_migraine_val.csv')

# Feature columns
feature_cols = [col for col in df.columns if col not in [
    'user_id', 'day', 'Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad',
    'migraine_prob', 'migraine'
]]

print(f"✓ Loaded {len(df)} records from {len(df['user_id'].unique())} users")

# Migraine prediction weights
migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35])
migraine_bias = -1.8

# Generate rolling curves for 2 users
results = generate_rolling_curves(
    model=model,
    data_path='data/synthetic_migraine_val.csv',
    feature_cols=feature_cols,
    migraine_weights=migraine_weights,
    migraine_bias=migraine_bias,
    device='cpu',
    output_dir='artifacts/rolling_curves',
    n_users=2
)

print(f"\n✓ Generated curves for {len(results)} users")
print(f"✓ Plots saved to artifacts/rolling_curves/")

# Compute metrics
for user_key, user_data in results.items():
    mean_probs = user_data['mean_probs']
    true_migraines = user_data['true_migraines']
    
    brier = ((mean_probs - true_migraines) ** 2).mean()
    mean_pred = mean_probs.mean()
    mean_actual = true_migraines.mean()
    
    print(f"\n{user_key}:")
    print(f"  Brier Score: {brier:.4f}")
    print(f"  Mean Predicted: {mean_pred:.4f}")
    print(f"  Mean Actual: {mean_actual:.4f}")

print("\n✅ Rolling risk visualization test complete!")
