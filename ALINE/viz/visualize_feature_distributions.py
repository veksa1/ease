"""
Feature Distribution Visualization
Plots each feature with its distribution family and parameters as subplots
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import yaml
from pathlib import Path
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Set style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

def load_priors():
    """Load prior distributions from config"""
    config_path = Path('configs/simulator.yaml')
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    priors_path = Path(config['paths']['priors'])
    with open(priors_path) as f:
        priors = yaml.safe_load(f)
    
    return priors

def generate_samples(feature_name, params, n_samples=10000):
    """Generate samples from distribution"""
    dist_type = params['dist']
    
    if dist_type == 'normal':
        mu = params['mu']
        sigma = params['sigma']
        samples = np.random.normal(mu, sigma, n_samples)
        dist_str = f"Normal(μ={mu:.2f}, σ={sigma:.2f})"
        
    elif dist_type == 'lognormal':
        mu_ln = params['mu_ln']
        sigma_ln = params['sigma_ln']
        samples = np.random.lognormal(mu_ln, sigma_ln, n_samples)
        dist_str = f"LogNormal(μ_ln={mu_ln:.2f}, σ_ln={sigma_ln:.2f})"
        
    elif dist_type == 'uniform':
        min_val = params['min']
        max_val = params['max']
        samples = np.random.uniform(min_val, max_val, n_samples)
        dist_str = f"Uniform(min={min_val:.1f}, max={max_val:.1f})"
        
    elif dist_type == 'cyclical':
        mu = params['mu']
        sigma = params['sigma']
        samples = np.random.normal(mu, sigma, n_samples)
        samples = np.clip(samples, params.get('min', -1), params.get('max', 1))
        dist_str = f"Cyclical(μ={mu:.2f}, σ={sigma:.2f})"
        
    else:
        samples = np.random.normal(0, 1, n_samples)
        dist_str = "Unknown"
    
    # Apply min/max constraints if specified
    if 'min' in params and 'max' in params:
        samples = np.clip(samples, params['min'], params['max'])
    
    return samples, dist_str

def plot_feature_distributions(priors, output_dir):
    """Create subplot grid of all feature distributions"""
    
    # Filter out duplicate entries and get unique features
    unique_features = {}
    for feature_name, params in priors.items():
        if isinstance(params, dict) and 'dist' in params:
            # Skip duplicates (some features appear twice in priors.yaml)
            if feature_name not in unique_features:
                unique_features[feature_name] = params
    
    n_features = len(unique_features)
    n_cols = 5
    n_rows = int(np.ceil(n_features / n_cols))
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(20, 4*n_rows))
    fig.suptitle('Feature Distributions with Parameters', 
                 fontsize=20, fontweight='bold', y=0.995)
    
    axes = axes.flatten()
    
    for idx, (feature_name, params) in enumerate(sorted(unique_features.items())):
        ax = axes[idx]
        
        # Generate samples
        samples, dist_str = generate_samples(feature_name, params)
        
        # Plot histogram
        ax.hist(samples, bins=50, alpha=0.7, color='steelblue', edgecolor='black', density=True)
        
        # Plot theoretical distribution curve
        if params['dist'] == 'normal':
            x = np.linspace(samples.min(), samples.max(), 200)
            y = stats.norm.pdf(x, params['mu'], params['sigma'])
            ax.plot(x, y, 'r-', linewidth=2, label='Theoretical')
        elif params['dist'] == 'lognormal':
            x = np.linspace(max(samples.min(), 0.01), samples.max(), 200)
            y = stats.lognorm.pdf(x, params['sigma_ln'], scale=np.exp(params['mu_ln']))
            ax.plot(x, y, 'r-', linewidth=2, label='Theoretical')
        elif params['dist'] == 'uniform':
            x = np.linspace(params['min'], params['max'], 200)
            y = np.ones_like(x) / (params['max'] - params['min'])
            ax.plot(x, y, 'r-', linewidth=2, label='Theoretical')
        
        # Add statistics
        mean_val = samples.mean()
        std_val = samples.std()
        
        # Title with feature name
        ax.set_title(f"{feature_name}\n{dist_str}", fontsize=10, fontweight='bold')
        
        # Add text box with statistics
        stats_text = f"μ={mean_val:.2f}\nσ={std_val:.2f}\nmin={samples.min():.2f}\nmax={samples.max():.2f}"
        ax.text(0.95, 0.95, stats_text, transform=ax.transAxes,
                fontsize=8, verticalalignment='top', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
        
        ax.set_xlabel('Value', fontsize=9)
        ax.set_ylabel('Density', fontsize=9)
        ax.tick_params(labelsize=8)
        ax.grid(True, alpha=0.3)
        ax.legend(fontsize=8, loc='upper left')
    
    # Hide extra subplots
    for idx in range(n_features, len(axes)):
        axes[idx].axis('off')
    
    plt.tight_layout()
    
    # Save
    output_path = output_dir / 'feature_distributions_grid.png'
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"✓ Saved: {output_path}")
    plt.close()

def plot_features_by_category(priors, output_dir):
    """Create separate plots for each category"""
    
    # Define categories
    categories = {
        'Sleep': ['Sleep Duration (hours)', 'Sleep Quality (1-10)', 'Sleep Consistency Score'],
        'Stress': ['Stress Level (1-10)', 'Work Hours', 'Anxiety Score (1-10)'],
        'Diet': ['Caffeine Intake (mg)', 'Water Intake (L)', 'Meal Regularity (1-10)'],
        'Physical': ['Exercise Duration (min)', 'Physical Activity Level (1-10)', 'Neck Tension (1-10)'],
        'Environmental': ['Screen Time (hours)', 'Weather Pressure (hPa)', 'Noise Level (dB)', 
                         'Barometric Pressure Change', 'Air Quality Index', 'Altitude'],
        'Hormonal': ['Hormone Fluctuation Index', 'Menstrual Cycle Day'],
        'Lifestyle': ['Alcohol Consumption (units)', 'Smoking (cigarettes/day)', 'Meditation Time (min)'],
        'Temporal': ['day_of_week_sin', 'day_of_week_cos', 'week_of_year_sin', 'week_of_year_cos'],
        'Biometric': ['HRV', 'Resting Heart Rate', 'Body Temperature Change'],
        'Prodrome': ['Prodrome Symptoms'],
        'Demographic': ['Age', 'Body Weight', 'BMI', 'Migraine History Years']
    }
    
    for cat_name, features in categories.items():
        # Filter features that exist in priors
        valid_features = [f for f in features if f in priors and isinstance(priors[f], dict) and 'dist' in priors[f]]
        
        if not valid_features:
            continue
        
        n_features = len(valid_features)
        n_cols = min(3, n_features)
        n_rows = int(np.ceil(n_features / n_cols))
        
        fig, axes = plt.subplots(n_rows, n_cols, figsize=(6*n_cols, 4*n_rows))
        fig.suptitle(f'{cat_name} Features - Distribution Analysis', 
                     fontsize=16, fontweight='bold')
        
        if n_features == 1:
            axes = [axes]
        else:
            axes = axes.flatten()
        
        for idx, feature_name in enumerate(valid_features):
            ax = axes[idx]
            params = priors[feature_name]
            
            # Generate samples
            samples, dist_str = generate_samples(feature_name, params)
            
            # Plot histogram
            ax.hist(samples, bins=50, alpha=0.7, color='steelblue', 
                   edgecolor='black', density=True)
            
            # Plot KDE
            try:
                from scipy.stats import gaussian_kde
                kde = gaussian_kde(samples)
                x_kde = np.linspace(samples.min(), samples.max(), 200)
                ax.plot(x_kde, kde(x_kde), 'g-', linewidth=2, label='KDE', alpha=0.7)
            except:
                pass
            
            # Add vertical line at mean
            mean_val = samples.mean()
            ax.axvline(mean_val, color='red', linestyle='--', linewidth=2, label=f'Mean={mean_val:.2f}')
            
            # Title and labels
            ax.set_title(f"{feature_name}\n{dist_str}", fontsize=11, fontweight='bold')
            ax.set_xlabel('Value', fontsize=10)
            ax.set_ylabel('Density', fontsize=10)
            ax.grid(True, alpha=0.3)
            ax.legend(fontsize=9)
            
            # Add description if available
            if 'description' in params:
                ax.text(0.02, 0.98, params['description'], transform=ax.transAxes,
                       fontsize=8, verticalalignment='top', style='italic',
                       bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))
        
        # Hide extra subplots
        for idx in range(n_features, len(axes)):
            axes[idx].axis('off')
        
        plt.tight_layout()
        
        # Save
        output_path = output_dir / f'feature_dist_{cat_name.lower()}.png'
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"✓ Saved: {output_path}")
        plt.close()

def main():
    print("\n" + "="*80)
    print("FEATURE DISTRIBUTION VISUALIZATION")
    print("="*80 + "\n")
    
    # Create output directory
    output_dir = Path('artifacts/feature_distributions')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load priors
    print("1. Loading feature distributions from priors.yaml...")
    priors = load_priors()
    
    # Count features
    n_features = sum(1 for v in priors.values() if isinstance(v, dict) and 'dist' in v)
    print(f"   Found {n_features} features with distribution specifications\n")
    
    # Create main grid plot
    print("2. Creating comprehensive grid visualization...")
    plot_feature_distributions(priors, output_dir)
    
    # Create category-specific plots
    print("\n3. Creating category-specific visualizations...")
    plot_features_by_category(priors, output_dir)
    
    print("\n" + "="*80)
    print("VISUALIZATION COMPLETE")
    print("="*80)
    print(f"\nAll plots saved to: {output_dir.absolute()}")
    print("\nGenerated files:")
    print("  - feature_distributions_grid.png (all features)")
    for cat in ['sleep', 'stress', 'diet', 'physical', 'environmental', 
                'hormonal', 'lifestyle', 'temporal', 'biometric', 'prodrome', 'demographic']:
        cat_file = output_dir / f'feature_dist_{cat}.png'
        if cat_file.exists():
            print(f"  - feature_dist_{cat}.png")
    print("="*80 + "\n")

if __name__ == '__main__':
    main()
