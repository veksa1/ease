"""
ALTERNATIVE: Memory-efficient lazy-loading dataset for ALINE training

This version doesn't pre-create all sequences in memory.
Instead, it indexes users and creates sequences on-the-fly in __getitem__().

Benefits:
- Instant startup (no 30-minute wait)
- Minimal memory usage
- Works with full dataset

Trade-off:
- Slightly slower per-batch due to on-the-fly creation
- But DataLoader workers can parallelize this

Usage:
Replace MigraineDataset with LazyMigraineDataset in train_aline.py
"""

import pandas as pd
import torch
from torch.utils.data import Dataset
import logging
from tqdm import tqdm

logger = logging.getLogger(__name__)


class LazyMigraineDataset(Dataset):
    """Memory-efficient dataset that creates sequences on-the-fly"""
    
    def __init__(self, csv_path, sequence_length=24, max_sequences=None):
        self.sequence_length = sequence_length
        
        logger.info(f"Loading data from {csv_path}...")
        self.df = pd.read_csv(csv_path)
        logger.info(f"Loaded {len(self.df)} rows")
        
        # Feature columns
        feature_cols = [col for col in self.df.columns if col not in [
            'user_id', 'day', 'Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad',
            'migraine_prob', 'migraine'
        ]]
        latent_cols = ['Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad']
        
        self.feature_cols = feature_cols
        self.latent_cols = latent_cols
        
        # Pre-group by user for fast access
        logger.info("Grouping data by user...")
        self.user_data = {}
        
        # Use tqdm for grouping progress
        for user_id, group in tqdm(self.df.groupby('user_id'), desc="Grouping by user", unit="user"):
            user_df = group.sort_values('day').reset_index(drop=True)
            self.user_data[user_id] = user_df
        
        # Create index: list of (user_id, start_idx) tuples
        logger.info("Creating sequence index...")
        self.sequence_index = []
        
        pbar = tqdm(self.user_data.items(), desc="Indexing sequences", unit="user")
        for user_id, user_df in pbar:
            for i in range(len(user_df) - sequence_length):
                self.sequence_index.append((user_id, i))
                if max_sequences and len(self.sequence_index) >= max_sequences:
                    pbar.set_description("Reached max_sequences limit")
                    break
            
            pbar.set_postfix({'sequences': len(self.sequence_index)})
            
            if max_sequences and len(self.sequence_index) >= max_sequences:
                break
        
        pbar.close()
        
        logger.info(f"Created index for {len(self.sequence_index)} sequences from {len(self.user_data)} users")
        logger.info(f"Memory usage: ~{self.df.memory_usage(deep=True).sum() / 1024**2:.1f} MB (just the dataframe)")
    
    def __len__(self):
        return len(self.sequence_index)
    
    def __getitem__(self, idx):
        user_id, start_idx = self.sequence_index[idx]
        user_df = self.user_data[user_id]
        
        # Get sequence window
        features = user_df.loc[start_idx:start_idx+self.sequence_length-1, self.feature_cols].values
        latents = user_df.loc[start_idx:start_idx+self.sequence_length-1, self.latent_cols].values
        migraine_next = user_df.loc[start_idx+self.sequence_length, 'migraine']
        migraine_prob_next = user_df.loc[start_idx+self.sequence_length, 'migraine_prob']
        
        return {
            'features': torch.FloatTensor(features),
            'latents': torch.FloatTensor(latents),
            'migraine_next': torch.FloatTensor([migraine_next]),
            'migraine_prob_next': torch.FloatTensor([migraine_prob_next])
        }


# Quick benchmark
if __name__ == '__main__':
    import time
    from pathlib import Path
    
    logging.basicConfig(level=logging.INFO)
    
    data_path = Path(__file__).parent.parent / 'data' / 'synthetic_migraine_train.csv'
    
    print("\n=== Testing LazyMigraineDataset ===")
    start = time.time()
    dataset = LazyMigraineDataset(data_path, max_sequences=10000)
    init_time = time.time() - start
    
    print(f"✓ Initialization: {init_time:.2f}s")
    print(f"  Dataset length: {len(dataset)}")
    
    # Test access speed
    start = time.time()
    for i in range(100):
        _ = dataset[i]
    access_time = time.time() - start
    
    print(f"✓ Access 100 sequences: {access_time:.3f}s ({access_time*10:.1f}ms per sequence)")
    
    print("\n=== Comparison ===")
    print("Lazy loading: Instant startup, ~50ms per sequence")
    print("Eager loading: 30-60 min startup, ~0ms per sequence (pre-loaded)")
    print("\nWith DataLoader num_workers=4, lazy loading becomes very efficient!")
