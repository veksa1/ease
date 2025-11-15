"""
Generate Initial Mock Distribution for ALINE
Ticket 001 Implementation

Creates a synthetic dataset mimicking joint feature distribution of migraine risk factors
for ALINE's warm-up phase (qϕ pretraining).
"""

import numpy as np
import pandas as pd
import pickle
from pathlib import Path
from scipy.special import expit


def load_feature_data(filepath):
    """Load and prepare feature data from Excel file."""
    df = pd.read_excel(filepath)
    
    # Fill missing statistics
    df['mean'] = df['mean'].fillna(df['min'] + (df['max'] - df['min']) / 2)
    df['std'] = df['std'].fillna((df['max'] - df['min']) / 4)
    
    return df


def build_multivariate_gaussian(df):
    """
    Build multivariate Gaussian distribution using relevance scores
    to scale covariances.
    """
    mu = df['mean'].values
    std = df['std'].values
    relevance = df['relevance'].values / df['relevance'].max()
    
    # Create correlation matrix based on relevance
    corr = np.outer(relevance, relevance)
    np.fill_diagonal(corr, 1)
    
    # Build covariance matrix
    Sigma = np.diag(std) @ corr @ np.diag(std)
    
    return mu, Sigma, relevance


def generate_samples(mu, Sigma, n_samples=5000):
    """Generate samples from multivariate Gaussian."""
    samples = np.random.multivariate_normal(mu, Sigma, size=n_samples)
    return samples


def generate_migraine_probability(samples, relevance):
    """
    Generate migraine probability using logistic model
    with β ∝ relevance.
    """
    beta = relevance / relevance.sum()
    # Normalize samples to standard scale for stable logits
    samples_norm = (samples - samples.mean(axis=0)) / samples.std(axis=0)
    # Adjust scaling to get realistic migraine rates (around 20-40%)
    logits = samples_norm @ beta * 2.0 - 1.5
    p_migraine = expit(logits)
    y = np.random.binomial(1, p_migraine)
    
    return p_migraine, y


def estimate_posterior(samples, y):
    """
    Estimate posterior distribution (mock) by computing
    mean/covariance of features given migraine occurrence.
    """
    X_pos = samples[y == 1]
    
    if len(X_pos) > 1:
        mu_post = X_pos.mean(axis=0)
        Sigma_post = np.cov(X_pos, rowvar=False)
    else:
        # Fallback if no positive samples
        mu_post = samples.mean(axis=0)
        Sigma_post = np.cov(samples, rowvar=False)
    
    return mu_post, Sigma_post


def save_distributions(df, mu, Sigma, mu_post, Sigma_post, samples, y, p_migraine, output_dir):
    """Save synthetic prior & posterior for reuse."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save as pickle
    mock_data = dict(
        features=df['variable'].tolist(),
        mu_prior=mu,
        Sigma_prior=Sigma,
        mu_post=mu_post,
        Sigma_post=Sigma_post,
        samples=samples,
        migraine=y,
        p_migraine=p_migraine,
        categories=df['category'].tolist(),
        weights=df['Weight'].tolist(),
    )
    
    pickle_path = output_dir / "mock_distribution.pkl"
    with open(pickle_path, "wb") as f:
        pickle.dump(mock_data, f)
    print(f"✓ Saved pickle to {pickle_path}")
    
    # Save as CSV for inspection
    csv_data = pd.DataFrame(samples, columns=df['variable'].tolist())
    csv_data['migraine'] = y
    csv_data['p_migraine'] = p_migraine
    
    csv_path = output_dir / "mock_distribution.csv"
    csv_data.to_csv(csv_path, index=False)
    print(f"✓ Saved CSV to {csv_path}")
    
    # Save summary statistics
    summary = {
        'n_samples': len(samples),
        'n_features': len(df),
        'n_migraine': y.sum(),
        'migraine_rate': y.mean(),
        'p_migraine_mean': p_migraine.mean(),
        'p_migraine_std': p_migraine.std(),
    }
    
    summary_df = pd.DataFrame([summary])
    summary_path = output_dir / "mock_distribution_summary.csv"
    summary_df.to_csv(summary_path, index=False)
    print(f"✓ Saved summary to {summary_path}")
    
    return pickle_path, csv_path, summary_path


def print_validation_report(df, mu, mu_post, Sigma, p_migraine, y):
    """Print validation statistics for manual inspection."""
    print("\n" + "="*60)
    print("VALIDATION REPORT")
    print("="*60)
    
    print(f"\n📊 Sample Statistics:")
    print(f"  Total samples: {len(y)}")
    print(f"  Migraine cases: {y.sum()} ({y.mean()*100:.1f}%)")
    print(f"  P(migraine) range: [{p_migraine.min():.3f}, {p_migraine.max():.3f}]")
    print(f"  P(migraine) mean: {p_migraine.mean():.3f} ± {p_migraine.std():.3f}")
    
    print(f"\n📈 Prior vs Posterior Shift (top 5 features):")
    shifts = np.abs(mu_post - mu) / np.std(mu)
    top_indices = np.argsort(shifts)[-5:][::-1]
    
    for idx in top_indices:
        feature = df.iloc[idx]['variable']
        prior_val = mu[idx]
        post_val = mu_post[idx]
        shift = post_val - prior_val
        print(f"  {feature:30s}: {prior_val:6.2f} → {post_val:6.2f} (Δ={shift:+6.2f})")
    
    print(f"\n🔗 Covariance Matrix:")
    print(f"  Shape: {Sigma.shape}")
    print(f"  Condition number: {np.linalg.cond(Sigma):.2e}")
    print(f"  Max correlation: {(Sigma / np.outer(np.sqrt(np.diag(Sigma)), np.sqrt(np.diag(Sigma))) - np.eye(len(Sigma))).max():.3f}")
    
    print("\n" + "="*60)


def main():
    """Main execution function."""
    print("🧠 Generating Mock Distribution for ALINE - Ticket 001\n")
    
    # Set paths
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data"
    input_file = data_dir / "migraine_prediction.xlsx"
    
    # Check if input file exists
    if not input_file.exists():
        print(f"⚠️  Input file not found: {input_file}")
        print("Creating sample data file first...")
        
        # Run the sample data creation script
        import sys
        sys.path.insert(0, str(data_dir))
        
        # Create sample data inline
        from create_sample_data import df
        df.to_excel(input_file, index=False)
        print(f"✓ Created {input_file}")
    
    # Step 1: Parse Feature Table
    print(f"📂 Loading feature data from {input_file}...")
    df = load_feature_data(input_file)
    print(f"✓ Loaded {len(df)} features across {df['category'].nunique()} categories")
    
    # Step 2: Build Multivariate Gaussian
    print("\n🔧 Building multivariate Gaussian distribution...")
    mu, Sigma, relevance = build_multivariate_gaussian(df)
    print(f"✓ Built distribution with μ shape {mu.shape}, Σ shape {Sigma.shape}")
    
    # Step 3: Generate Samples
    print("\n🎲 Generating samples...")
    np.random.seed(42)  # For reproducibility
    samples = generate_samples(mu, Sigma, n_samples=5000)
    print(f"✓ Generated {len(samples)} samples")
    
    # Step 4: Generate Migraine Probability
    print("\n⚡ Computing migraine probabilities...")
    p_migraine, y = generate_migraine_probability(samples, relevance)
    print(f"✓ Generated migraine labels: {y.sum()} positive cases ({y.mean()*100:.1f}%)")
    
    # Step 5: Estimate Posterior
    print("\n📊 Estimating posterior distribution...")
    mu_post, Sigma_post = estimate_posterior(samples, y)
    print(f"✓ Estimated posterior with μ shape {mu_post.shape}, Σ shape {Sigma_post.shape}")
    
    # Step 6: Save Distributions
    print("\n💾 Saving distributions...")
    pickle_path, csv_path, summary_path = save_distributions(
        df, mu, Sigma, mu_post, Sigma_post, samples, y, p_migraine, data_dir
    )
    
    # Step 7: Print Validation Report
    print_validation_report(df, mu, mu_post, Sigma, p_migraine, y)
    
    print("\n✅ Mock distribution generation complete!")
    print(f"\n📦 Output files:")
    print(f"  - {pickle_path}")
    print(f"  - {csv_path}")
    print(f"  - {summary_path}")
    
    print("\n💡 Next steps:")
    print("  1. Inspect visualizations in notebooks/mock_distribution_demo.ipynb")
    print("  2. Verify correlation heatmap matches clinical intuition")
    print("  3. Use mock_distribution.pkl for ALINE warm-up training")


if __name__ == "__main__":
    main()
