"""
Augment feature table with bin edges and centers for Ticket 003
Creates migraine_features_augmented.csv with binning information
"""
import pandas as pd
import numpy as np
import json
from pathlib import Path


def create_bins(min_val, max_val, n_bins=10):
    """Create bin edges for a feature range."""
    edges = np.linspace(min_val, max_val, n_bins + 1)
    centers = (edges[:-1] + edges[1:]) / 2
    return edges.tolist(), centers.tolist()


def parse_impact_pattern(pattern_text, variable_name):
    """
    Convert textual impact pattern to numerical risk scores [1-10].
    Higher score = higher migraine risk.
    
    Patterns are mapped from low to high values of the feature.
    """
    pattern_text = pattern_text.lower()
    
    # Define pattern mappings based on common clinical patterns
    if 'low' in pattern_text and 'increases' in pattern_text:
        # Low values increase risk (e.g., low sleep)
        # Pattern: high risk at low values, low risk at high values
        return [9, 8, 7, 6, 5, 4, 3, 3, 2, 2]
    
    elif 'high' in pattern_text and ('increases' in pattern_text or 'triggers' in pattern_text):
        # High values increase risk (e.g., high stress)
        # Pattern: low risk at low values, high risk at high values
        return [2, 2, 3, 3, 4, 5, 6, 7, 8, 9]
    
    elif 'excess' in pattern_text or 'excessive' in pattern_text:
        # Excess triggers (e.g., caffeine) - U-shaped or high-end risk
        # Pattern: moderate low, high at extremes
        return [3, 3, 2, 2, 2, 3, 4, 6, 8, 9]
    
    elif 'poor' in pattern_text or 'irregular' in pattern_text:
        # Poor quality/irregularity increases risk
        # Pattern: high risk at low values
        return [9, 8, 7, 6, 5, 4, 3, 3, 2, 2]
    
    elif 'dehydration' in pattern_text:
        # Low water increases risk
        return [9, 8, 7, 6, 5, 4, 3, 3, 2, 2]
    
    elif 'sedentary' in pattern_text:
        # Low activity increases risk
        return [9, 8, 7, 6, 5, 4, 3, 3, 2, 2]
    
    elif 'fluctuation' in pattern_text or 'change' in pattern_text:
        # Changes/fluctuations trigger (U-shaped or mid-range spike)
        # Pattern: moderate baseline, spikes at changes
        return [6, 5, 4, 3, 3, 3, 4, 5, 6, 7]
    
    elif 'certain phases' in pattern_text:
        # Menstrual cycle - specific phases trigger
        # Pattern: varies by cycle day
        return [4, 4, 5, 6, 7, 8, 7, 6, 5, 4]
    
    else:
        # Default: moderate increase with higher values
        return [3, 3, 4, 4, 5, 5, 6, 6, 7, 7]


def augment_feature_table(input_path, output_path):
    """Load feature table and augment with bins and impact patterns."""
    print(f"📂 Loading feature data from {input_path}...")
    df = pd.read_excel(input_path)
    
    # Initialize new columns
    bin_edges_list = []
    bin_centers_list = []
    impact_patterns = []
    
    print(f"\n🔧 Generating bins and impact patterns for {len(df)} features...")
    
    for idx, row in df.iterrows():
        # Create bins
        edges, centers = create_bins(row['min'], row['max'], n_bins=10)
        bin_edges_list.append(json.dumps(edges))
        bin_centers_list.append(json.dumps(centers))
        
        # Parse impact pattern
        pattern = parse_impact_pattern(row['Migraine impact pattern'], row['variable'])
        impact_patterns.append(','.join(map(str, pattern)))
        
        # Print sample
        if idx < 3:
            print(f"\n  {row['variable']}:")
            print(f"    Range: [{row['min']}, {row['max']}]")
            print(f"    Bins: {len(edges)-1} bins")
            print(f"    Impact pattern: {pattern[:5]}...{pattern[-2:]}")
    
    # Add new columns
    df['bin_edges'] = bin_edges_list
    df['bin_centers'] = bin_centers_list
    df['Migraine Impact Pattern'] = impact_patterns
    
    # Save augmented table
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"\n✓ Saved augmented feature table to {output_path}")
    print(f"\n📊 Summary:")
    print(f"  Total features: {len(df)}")
    print(f"  Categories: {df['category'].nunique()}")
    print(f"  Columns: {list(df.columns)}")
    
    return df


def main():
    """Main execution function."""
    print("🧠 Augmenting Feature Table for ALINE - Ticket 003\n")
    
    # Set paths
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data"
    input_file = data_dir / "migraine_prediction.xlsx"
    output_file = data_dir / "migraine_features_augmented.csv"
    
    # Check if input exists
    if not input_file.exists():
        print(f"⚠️  Input file not found: {input_file}")
        print("Please run generate_mock_distribution.py first to create the data.")
        return
    
    # Augment the table
    df = augment_feature_table(input_file, output_file)
    
    print("\n✅ Feature augmentation complete!")
    print(f"\n💡 Next step: Create priors.yaml with distribution parameters")


if __name__ == "__main__":
    main()
