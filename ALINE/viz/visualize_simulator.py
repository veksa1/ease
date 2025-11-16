"""
Simulator Visualization Script
Generate comprehensive visualizations for the migraine simulator data
"""

import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

sys.path.insert(0, 'scripts')
from simulator import load_config, MigraineSimulator

# Set style
sns.set_style('whitegrid')
plt.rcParams['figure.figsize'] = (14, 8)
plt.rcParams['font.size'] = 10

print("="*80)
print("MIGRAINE SIMULATOR VISUALIZATION")
print("="*80)

# Load configuration and run simulation
print("\n1. Loading configuration and simulating data...")
config = load_config('configs/simulator.yaml')
config.n_users = 100  # Sample for visualization
config.horizon = 365
config.random_seed = 42

simulator = MigraineSimulator(config)
df = simulator.simulate_population()

print(f"   Generated {len(df):,} records for {config.n_users} users over {config.horizon} days")
print(f"   Migraine rate: {df['migraine'].mean():.1%}")

# Separate migraine and no-migraine data
mig = df[df['migraine'] == 1]
no_mig = df[df['migraine'] == 0]

print(f"   Migraine episodes: {len(mig):,}")
print(f"   No-migraine days: {len(no_mig):,}")

# Create output directory
output_dir = Path('artifacts/simulator_viz')
output_dir.mkdir(parents=True, exist_ok=True)

# =============================================================================
# FIGURE 1: Latent Variable Distributions
# =============================================================================
print("\n2. Creating latent variable distribution plots...")

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
latent_cols = ['Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad']
colors = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#FFD93D']

for idx, (col, color) in enumerate(zip(latent_cols, colors)):
    ax = axes[idx // 2, idx % 2]
    
    # Plot distributions
    ax.hist(no_mig[col], bins=50, alpha=0.6, label='No Migraine', 
            color='steelblue', density=True, edgecolor='black', linewidth=0.5)
    ax.hist(mig[col], bins=50, alpha=0.6, label='Migraine', 
            color='coral', density=True, edgecolor='black', linewidth=0.5)
    
    # Add vertical lines for means
    ax.axvline(no_mig[col].mean(), color='steelblue', linestyle='--', linewidth=2, 
               label=f'μ_no_mig = {no_mig[col].mean():.3f}')
    ax.axvline(mig[col].mean(), color='coral', linestyle='--', linewidth=2,
               label=f'μ_mig = {mig[col].mean():.3f}')
    
    ax.set_xlabel('Latent State Value', fontsize=11)
    ax.set_ylabel('Density', fontsize=11)
    ax.set_title(f'{col} Distribution', fontsize=12, fontweight='bold')
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)

plt.suptitle('Latent Variable Distributions: Migraine vs No Migraine', 
             fontsize=14, fontweight='bold', y=1.00)
plt.tight_layout()
plt.savefig(output_dir / 'latent_distributions.png', dpi=300, bbox_inches='tight')
print(f"   ✓ Saved: {output_dir / 'latent_distributions.png'}")
plt.close()

# =============================================================================
# FIGURE 2: Separation Metrics
# =============================================================================
print("\n3. Creating separation metrics visualization...")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Calculate metrics
separations = []
cohens_d_values = []

for col in latent_cols:
    mu_m = mig[col].mean()
    mu_n = no_mig[col].mean()
    std_m = mig[col].std()
    std_n = no_mig[col].std()
    pooled = np.sqrt((std_m**2 + std_n**2) / 2)
    
    sep = abs(mu_m - mu_n) / pooled * 100
    cohens_d = (mu_m - mu_n) / pooled
    
    separations.append(sep)
    cohens_d_values.append(cohens_d)

# Plot 1: Separation percentages
bars1 = ax1.bar(range(len(latent_cols)), separations, color=colors, 
                edgecolor='black', linewidth=1.5, alpha=0.8)
ax1.axhline(20, color='green', linestyle='--', linewidth=2, label='Target Min (20%)', alpha=0.7)
ax1.axhline(30, color='red', linestyle='--', linewidth=2, label='Target Max (30%)', alpha=0.7)
ax1.axhline(np.mean(separations), color='purple', linestyle='-', linewidth=2, 
            label=f'Average ({np.mean(separations):.1f}%)', alpha=0.7)

# Add value labels on bars
for bar, sep in zip(bars1, separations):
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height,
             f'{sep:.1f}%', ha='center', va='bottom', fontweight='bold', fontsize=10)

ax1.set_xticks(range(len(latent_cols)))
ax1.set_xticklabels([col.replace('Z_', '') for col in latent_cols], rotation=0)
ax1.set_ylabel('Separation (%)', fontsize=12)
ax1.set_title('Latent Variable Separation', fontsize=13, fontweight='bold')
ax1.legend(fontsize=10)
ax1.grid(True, alpha=0.3, axis='y')

# Plot 2: Cohen's d effect sizes
bars2 = ax2.bar(range(len(latent_cols)), cohens_d_values, color=colors,
                edgecolor='black', linewidth=1.5, alpha=0.8)

# Effect size thresholds
ax2.axhline(0.2, color='gray', linestyle=':', linewidth=1.5, alpha=0.5, label='Small (0.2)')
ax2.axhline(0.5, color='orange', linestyle=':', linewidth=1.5, alpha=0.5, label='Medium (0.5)')
ax2.axhline(0.8, color='red', linestyle=':', linewidth=1.5, alpha=0.5, label='Large (0.8)')

# Add value labels
for bar, d in zip(bars2, cohens_d_values):
    height = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2., height,
             f'{d:.3f}', ha='center', va='bottom', fontweight='bold', fontsize=10)

ax2.set_xticks(range(len(latent_cols)))
ax2.set_xticklabels([col.replace('Z_', '') for col in latent_cols], rotation=0)
ax2.set_ylabel("Cohen's d", fontsize=12)
ax2.set_title('Effect Sizes (Cohen\'s d)', fontsize=13, fontweight='bold')
ax2.legend(fontsize=9, loc='upper right')
ax2.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig(output_dir / 'separation_metrics.png', dpi=300, bbox_inches='tight')
print(f"   ✓ Saved: {output_dir / 'separation_metrics.png'}")
plt.close()

# =============================================================================
# FIGURE 3: Temporal Evolution
# =============================================================================
print("\n4. Creating temporal evolution plots...")

# Select a few users for visualization
sample_users = df['user_id'].unique()[:5]
fig, axes = plt.subplots(4, 1, figsize=(14, 12))

for idx, col in enumerate(latent_cols):
    ax = axes[idx]
    
    for user_id in sample_users:
        user_data = df[df['user_id'] == user_id].sort_values('day')
        
        # Plot latent state
        ax.plot(user_data['day'], user_data[col], alpha=0.6, linewidth=1.5, label=f'User {user_id}')
        
        # Mark migraine days
        migraine_days = user_data[user_data['migraine'] == 1]
        ax.scatter(migraine_days['day'], migraine_days[col], 
                  color='red', s=30, alpha=0.8, zorder=5, marker='x')
    
    ax.set_xlabel('Day' if idx == 3 else '', fontsize=11)
    ax.set_ylabel(col.replace('Z_', ''), fontsize=11)
    ax.set_title(f'{col} Over Time (Red X = Migraine)', fontsize=12, fontweight='bold')
    if idx == 0:
        ax.legend(fontsize=9, ncol=6, loc='upper right')
    ax.grid(True, alpha=0.3)

plt.suptitle('Latent Variable Temporal Evolution (5 Sample Users)', 
             fontsize=14, fontweight='bold', y=0.995)
plt.tight_layout()
plt.savefig(output_dir / 'temporal_evolution.png', dpi=300, bbox_inches='tight')
print(f"   ✓ Saved: {output_dir / 'temporal_evolution.png'}")
plt.close()

# =============================================================================
# FIGURE 4: Correlation Heatmap
# =============================================================================
print("\n5. Creating correlation heatmap...")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Migraine correlation
corr_mig = mig[latent_cols].corr()
sns.heatmap(corr_mig, annot=True, fmt='.3f', cmap='RdYlBu_r', center=0,
            square=True, linewidths=1, cbar_kws={"shrink": 0.8}, ax=ax1,
            vmin=-1, vmax=1)
ax1.set_title('Latent Variable Correlations (Migraine Days)', fontsize=12, fontweight='bold')
ax1.set_xticklabels([col.replace('Z_', '') for col in latent_cols], rotation=45)
ax1.set_yticklabels([col.replace('Z_', '') for col in latent_cols], rotation=0)

# No-migraine correlation
corr_no_mig = no_mig[latent_cols].corr()
sns.heatmap(corr_no_mig, annot=True, fmt='.3f', cmap='RdYlBu_r', center=0,
            square=True, linewidths=1, cbar_kws={"shrink": 0.8}, ax=ax2,
            vmin=-1, vmax=1)
ax2.set_title('Latent Variable Correlations (No-Migraine Days)', fontsize=12, fontweight='bold')
ax2.set_xticklabels([col.replace('Z_', '') for col in latent_cols], rotation=45)
ax2.set_yticklabels([col.replace('Z_', '') for col in latent_cols], rotation=0)

plt.tight_layout()
plt.savefig(output_dir / 'correlation_heatmap.png', dpi=300, bbox_inches='tight')
print(f"   ✓ Saved: {output_dir / 'correlation_heatmap.png'}")
plt.close()

# =============================================================================
# FIGURE 5: Migraine Risk vs Latent States
# =============================================================================
print("\n6. Creating migraine risk scatter plots...")

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

for idx, col in enumerate(latent_cols):
    ax = axes[idx // 2, idx % 2]
    
    # Sample data for scatter (too many points otherwise)
    sample_size = min(5000, len(df))
    df_sample = df.sample(n=sample_size, random_state=42)
    
    # Scatter plot colored by migraine
    scatter = ax.scatter(df_sample[col], df_sample['migraine_prob'], 
                        c=df_sample['migraine'], cmap='RdYlGn_r',
                        alpha=0.5, s=20, edgecolors='none')
    
    # Add colorbar
    cbar = plt.colorbar(scatter, ax=ax)
    cbar.set_label('Migraine', fontsize=10)
    
    # Fit polynomial trend
    z = np.polyfit(df_sample[col], df_sample['migraine_prob'], 2)
    p = np.poly1d(z)
    x_line = np.linspace(df_sample[col].min(), df_sample[col].max(), 100)
    ax.plot(x_line, p(x_line), "r--", linewidth=2, label='Trend')
    
    ax.set_xlabel(col, fontsize=11)
    ax.set_ylabel('Migraine Probability', fontsize=11)
    ax.set_title(f'Migraine Risk vs {col}', fontsize=12, fontweight='bold')
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)

plt.suptitle('Migraine Probability vs Latent Variables', 
             fontsize=14, fontweight='bold', y=1.00)
plt.tight_layout()
plt.savefig(output_dir / 'risk_scatter.png', dpi=300, bbox_inches='tight')
print(f"   ✓ Saved: {output_dir / 'risk_scatter.png'}")
plt.close()

# =============================================================================
# FIGURE 6: Summary Statistics
# =============================================================================
print("\n7. Creating summary statistics table...")

fig, ax = plt.subplots(figsize=(12, 6))
ax.axis('off')

# Create summary table
summary_data = []
for col in latent_cols:
    mu_m = mig[col].mean()
    mu_n = no_mig[col].mean()
    std_m = mig[col].std()
    std_n = no_mig[col].std()
    pooled = np.sqrt((std_m**2 + std_n**2) / 2)
    sep = abs(mu_m - mu_n) / pooled * 100
    cohens_d = (mu_m - mu_n) / pooled
    
    summary_data.append([
        col.replace('Z_', ''),
        f'{mu_m:.3f}',
        f'{std_m:.3f}',
        f'{mu_n:.3f}',
        f'{std_n:.3f}',
        f'{sep:.1f}%',
        f'{cohens_d:.3f}'
    ])

# Add average row
avg_sep = np.mean([float(row[5].rstrip('%')) for row in summary_data])
avg_d = np.mean([float(row[6]) for row in summary_data])
summary_data.append([
    'AVERAGE',
    '-',
    '-',
    '-',
    '-',
    f'{avg_sep:.1f}%',
    f'{avg_d:.3f}'
])

table = ax.table(cellText=summary_data,
                colLabels=['Variable', 'μ_migraine', 'σ_migraine', 'μ_no_migraine', 'σ_no_migraine', 'Separation', "Cohen's d"],
                cellLoc='center',
                loc='center',
                bbox=[0, 0, 1, 1])

table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1, 2)

# Style header
for (i, j), cell in table.get_celld().items():
    if i == 0:
        cell.set_facecolor('#4ECDC4')
        cell.set_text_props(weight='bold', color='white')
    elif i == len(summary_data):  # Average row
        cell.set_facecolor('#FFE66D')
        cell.set_text_props(weight='bold')
    else:
        if j == 5:  # Separation column
            sep_val = float(summary_data[i-1][5].rstrip('%'))
            if 20 <= sep_val <= 30:
                cell.set_facecolor('#90EE90')  # Light green
        elif j == 6:  # Cohen's d column
            d_val = float(summary_data[i-1][6])
            if d_val >= 0.5:
                cell.set_facecolor('#FFA07A')  # Light coral

plt.title('Latent Variable Statistics Summary', fontsize=14, fontweight='bold', pad=20)
plt.savefig(output_dir / 'summary_table.png', dpi=300, bbox_inches='tight')
print(f"   ✓ Saved: {output_dir / 'summary_table.png'}")
plt.close()

# =============================================================================
# Print Summary
# =============================================================================
print("\n" + "="*80)
print("VISUALIZATION COMPLETE")
print("="*80)
print(f"\nAll plots saved to: {output_dir.absolute()}")
print("\nGenerated visualizations:")
print("  1. latent_distributions.png - Distribution histograms")
print("  2. separation_metrics.png - Separation & effect sizes")
print("  3. temporal_evolution.png - Time series of latent states")
print("  4. correlation_heatmap.png - Correlation matrices")
print("  5. risk_scatter.png - Risk vs latent variables")
print("  6. summary_table.png - Statistics summary table")
print("\n" + "="*80)
