"""
Feature Normalization + Priors Integration
Ticket 003 Implementation

Converts cleaned migraine feature tables into normalized numerical encodings
and attaches literature-based prior distributions for simulator use.
"""

import pandas as pd
import numpy as np
import yaml
import json
import pickle
import bisect
from pathlib import Path


def load_augmented_features(filepath):
    """Load the augmented feature table with bins and impact patterns."""
    df = pd.read_csv(filepath)
    print(f"✓ Loaded {len(df)} features from {filepath}")
    
    # Validate expected columns
    expected_cols = ['category', 'variable', 'bin_edges', 'bin_centers', 
                     'Migraine Impact Pattern', 'Weight']
    missing = [col for col in expected_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")
    
    print(f"✓ Validated columns: {len(df.columns)} total")
    print(f"✓ Categories: {df['category'].unique().tolist()}")
    
    return df


def load_priors(filepath):
    """Load prior distributions from YAML file."""
    with open(filepath, 'r') as f:
        priors = yaml.safe_load(f)
    
    print(f"✓ Loaded priors for {len(priors)} features from {filepath}")
    return priors


class FeatureScorer:
    """Scorer that maps feature values to migraine risk scores [1-10]."""
    
    def __init__(self, edges, pattern):
        self.edges = edges
        self.pattern = pattern
    
    def __call__(self, x):
        """Map value x to risk score using binning and pattern."""
        # Handle edge cases
        if np.isnan(x):
            return 5  # neutral score for missing values
        
        # Find bin index
        idx = bisect.bisect_right(self.edges, x) - 1
        # Clamp to valid range [0, len(pattern)-1]
        idx = max(0, min(len(self.pattern) - 1, idx))
        
        return self.pattern[idx]


class FeatureNormalizer:
    """Normalizer that converts feature values to z-scores based on priors."""
    
    def __init__(self, prior_info):
        self.prior_info = prior_info
        self.dist = prior_info.get('dist', 'normal')
    
    def __call__(self, x):
        """Normalize a value to z-score based on its prior distribution."""
        if self.dist == 'normal':
            mu = self.prior_info['mu']
            sigma = self.prior_info['sigma']
            return (x - mu) / sigma
        
        elif self.dist == 'lognormal':
            mu_ln = self.prior_info['mu_ln']
            sigma_ln = self.prior_info['sigma_ln']
            # For lognormal, normalize in log space
            if x <= 0:
                return -3.0  # Clamp very low values
            return (np.log(x) - mu_ln) / sigma_ln
        
        elif self.dist == 'uniform':
            min_val = self.prior_info['min']
            max_val = self.prior_info['max']
            # Map to [-1, 1] range
            return 2 * (x - min_val) / (max_val - min_val) - 1
        
        else:
            # Default: return as-is
            return x


def make_scorer(row):
    """Create a scoring function for a feature based on its bins and impact pattern."""
    edges = json.loads(row['bin_edges'])
    pattern_str = str(row['Migraine Impact Pattern'])
    pattern = [int(x) for x in pattern_str.split(',')]
    return FeatureScorer(edges, pattern)


def build_feature_normalizer(df, priors):
    """
    Build complete feature normalization system.
    
    Returns:
        Dictionary containing:
        - scorers: dict mapping variable name to scoring function
        - normalizers: dict mapping variable name to normalization function
        - priors: prior distribution parameters
        - features: list of feature names in order
        - categories: category for each feature
        - weights: weight for each feature
    """
    scorers = {}
    normalizers = {}
    features = []
    categories = []
    weights = []
    
    print("\n🔧 Building feature normalizer...")
    
    for idx, row in df.iterrows():
        var_name = row['variable']
        features.append(var_name)
        categories.append(row['category'])
        weights.append(row['Weight'])
        
        # Create scorer
        scorers[var_name] = make_scorer(row)
        
        # Create normalizer
        if var_name in priors:
            prior_info = priors[var_name]
            normalizers[var_name] = FeatureNormalizer(prior_info)
        else:
            # Default: identity normalization
            normalizers[var_name] = FeatureNormalizer({'dist': 'identity'})
            print(f"  ⚠️  No prior found for '{var_name}', using identity normalization")
    
    print(f"✓ Created {len(scorers)} scorers and {len(normalizers)} normalizers")
    
    return {
        'scorers': scorers,
        'normalizers': normalizers,
        'priors': priors,
        'features': features,
        'categories': categories,
        'weights': weights,
    }


def compute_risk_weights(df):
    """
    Compute feature-to-latent weight matrix W_feat_to_Z.
    
    Maps features to latent dimensions:
    - Z[0]: Stress axis (stress, anxiety, work hours)
    - Z[1]: Sleep axis (duration, quality, consistency)
    - Z[2]: Environmental axis (pressure, noise, screen time)
    - Z[3]: Hormonal axis (hormone fluctuation, menstrual cycle)
    - Z[4]: Lifestyle axis (diet, physical activity, substances)
    
    Returns:
        Matrix of shape (n_latent, n_features)
    """
    n_features = len(df)
    n_latent = 5
    
    W = np.zeros((n_latent, n_features))
    
    for idx, row in df.iterrows():
        category = row['category']
        weight = row['Weight']
        
        # Map categories to latent dimensions
        if category == 'Stress':
            W[0, idx] = weight
        elif category == 'Sleep':
            W[1, idx] = weight
        elif category == 'Environmental':
            W[2, idx] = weight
        elif category == 'Hormonal':
            W[3, idx] = weight
        else:  # Diet, Physical, Lifestyle
            W[4, idx] = weight
    
    # Normalize each latent dimension
    for i in range(n_latent):
        if W[i].sum() > 0:
            W[i] = W[i] / W[i].sum()
    
    print(f"✓ Created risk weight matrix of shape {W.shape}")
    print(f"  Latent dimensions: {n_latent}")
    print(f"  Non-zero weights per dimension: {(W > 0).sum(axis=1).tolist()}")
    
    return W


def save_normalizer(normalizer_data, W_feat_to_Z, output_path):
    """Save feature normalizer to pickle file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Add weight matrix to data
    normalizer_data['W_feat_to_Z'] = W_feat_to_Z
    
    with open(output_path, 'wb') as f:
        pickle.dump(normalizer_data, f)
    
    print(f"✓ Saved feature normalizer to {output_path}")
    return output_path


def validate_normalizer(normalizer_data, df):
    """Validate the normalizer with sample data."""
    print("\n📊 Validation Report:")
    print("=" * 60)
    
    scorers = normalizer_data['scorers']
    normalizers = normalizer_data['normalizers']
    features = normalizer_data['features']
    
    # Test on mean values from original data
    print("\nSample scoring on typical (mean) values:")
    
    for i, var_name in enumerate(features[:5]):  # Show first 5
        row = df[df['variable'] == var_name].iloc[0]
        mean_val = row['mean']
        
        score = scorers[var_name](mean_val)
        norm = normalizers[var_name](mean_val)
        
        print(f"\n  {var_name}:")
        print(f"    Mean value: {mean_val:.2f}")
        print(f"    Risk score: {score}/10")
        print(f"    Normalized: {norm:.3f}")
    
    # Test weight matrix
    W = normalizer_data['W_feat_to_Z']
    print(f"\n\nRisk Weight Matrix (W_feat_to_Z):")
    print(f"  Shape: {W.shape}")
    print(f"  Sum per latent dim: {W.sum(axis=1)}")
    
    latent_names = ['Stress', 'Sleep', 'Environment', 'Hormonal', 'Lifestyle']
    print(f"\n  Latent dimensions:")
    for i, name in enumerate(latent_names):
        n_features = (W[i] > 0).sum()
        print(f"    [{i}] {name:15s}: {n_features} features contributing")
    
    print("\n" + "=" * 60)


def main():
    """Main execution function."""
    print("🧠 Feature Normalization + Priors Integration - Ticket 003\n")
    
    # Set paths
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data"
    
    input_features = data_dir / "migraine_features_augmented.csv"
    input_priors = data_dir / "priors.yaml"
    output_normalizer = data_dir / "feature_normalizer.pkl"
    
    # Check inputs exist
    if not input_features.exists():
        print(f"⚠️  Features file not found: {input_features}")
        print("Please run scripts/augment_features.py first")
        return
    
    if not input_priors.exists():
        print(f"⚠️  Priors file not found: {input_priors}")
        print("Please create data/priors.yaml first")
        return
    
    # Step 1: Load augmented features
    print("📂 Step 1: Loading augmented features...")
    df = load_augmented_features(input_features)
    
    # Step 2: Load priors
    print("\n📂 Step 2: Loading prior distributions...")
    priors = load_priors(input_priors)
    
    # Step 3: Build normalizer
    print("\n🔧 Step 3: Building feature normalizer...")
    normalizer_data = build_feature_normalizer(df, priors)
    
    # Step 4: Compute risk weights
    print("\n🔧 Step 4: Computing risk weight matrix...")
    W_feat_to_Z = compute_risk_weights(df)
    
    # Step 5: Save normalizer
    print("\n💾 Step 5: Saving normalizer...")
    output_path = save_normalizer(normalizer_data, W_feat_to_Z, output_normalizer)
    
    # Step 6: Validate
    validate_normalizer(normalizer_data, df)
    
    print("\n✅ Feature normalization complete!")
    print(f"\n📦 Output: {output_path}")
    print("\n💡 Next steps:")
    print("  1. Run notebooks/feature_validation.ipynb for QA visualizations")
    print("  2. Use feature_normalizer.pkl in Ticket 004 (Simulator)")
    print("  3. Integrate with ALINE pretraining pipeline")


if __name__ == "__main__":
    main()
