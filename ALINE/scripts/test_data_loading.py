"""
Quick test to diagnose data loading performance
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import time
from multiprocessing import cpu_count

# Import the new parallel dataset
import torch
from torch.utils.data import DataLoader
import sys
sys.path.append(str(Path(__file__).parent))
from train_aline import MigraineDataset

data_path = Path(__file__).parent.parent / 'data' / 'synthetic_migraine_train.csv'

print(f"Loading {data_path}...")
print(f"Available CPUs: {cpu_count()}")
print()

# Test with parallel dataset
print("=" * 60)
print("PARALLEL DATASET TEST")
print("=" * 60)

start = time.time()
dataset = MigraineDataset(
    csv_path=str(data_path),
    sequence_length=24,
    num_workers=max(1, cpu_count() - 1)  # Use all but one CPU
)
parallel_time = time.time() - start

print(f"\n✓ Parallel loading completed in {parallel_time:.2f}s")
print(f"  Sequences: {len(dataset):,}")
print(f"  Speedup vs estimated sequential: ~{84 / parallel_time:.1f}x")

# Test DataLoader
print(f"\nTesting DataLoader with batch_size=32...")
loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=0)
batch = next(iter(loader))
print(f"  Features shape: {batch['features'].shape}")
print(f"  Latents shape: {batch['latents'].shape}")
print(f"  Migraine next shape: {batch['migraine_next'].shape}")

print("\n✅ Data loading test complete!")
print(f"Total time: {parallel_time:.2f}s")
print(f"\nMemory estimate: ~{len(dataset) * 24 * 20 * 8 / 1024**3:.2f} GB")
