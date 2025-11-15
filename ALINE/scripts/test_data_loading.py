"""
Quick test to diagnose data loading performance
"""
import pandas as pd
import time
from pathlib import Path

data_path = Path(__file__).parent.parent / 'data' / 'synthetic_migraine_train.csv'

print(f"Loading {data_path}...")
start = time.time()
df = pd.read_csv(data_path)
load_time = time.time() - start

print(f"✓ Loaded in {load_time:.2f}s")
print(f"  Rows: {len(df):,}")
print(f"  Columns: {len(df.columns)}")
print(f"  Users: {df['user_id'].nunique():,}")
print(f"  Days per user (avg): {len(df) / df['user_id'].nunique():.1f}")

# Estimate sequence count
users = df['user_id'].nunique()
avg_days = len(df) / users
sequence_length = 24
estimated_sequences = int(users * (avg_days - sequence_length))

print(f"\nEstimated sequences (24-hour windows): {estimated_sequences:,}")
print(f"  This would create ~{estimated_sequences * 24 * 20 * 8 / 1024**3:.2f} GB in memory (rough estimate)")

# Time a small sample
print("\nTiming sequence creation for first 10 users...")
start = time.time()
sequences = []
for user_id in df['user_id'].unique()[:10]:
    user_df = df[df['user_id'] == user_id].sort_values('day')
    for i in range(len(user_df) - sequence_length):
        window = user_df.iloc[i:i+sequence_length]
        sequences.append({'len': len(window)})

sample_time = time.time() - start
print(f"✓ Created {len(sequences)} sequences in {sample_time:.2f}s")
print(f"  Estimated total time for all users: {sample_time * users / 10 / 60:.1f} minutes")
