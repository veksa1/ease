# Training with tqdm Progress Bars

## Overview
Added tqdm progress bars to visualize all training stages for better monitoring and UX.

## What's New

### 1. Data Loading Progress
```
Loading data from data/synthetic_migraine_train.csv...
Loaded 2,920,000 rows
Creating sequences (this may take a while for large datasets)...
Processing 100000 users...
Creating sequences: 45%|████████▌         | 45123/100000 [00:23<00:28, 1965.32user/s, sequences=9234]
```

### 2. Epoch Progress (Outer Loop)
```
Epochs:  20%|███▍              | 100/500 [12:34<50:12, 7.53s/epoch, train_loss=0.3245, val_loss=0.3156, val_auc=0.7823, best_val=0.3156]
```

### 3. Batch Progress (Training)
```
Training: 100%|████████████████| 313/313 [02:15<00:00, 2.31batch/s, loss=0.3241, post=0.2145, policy=0.0234, migr=0.0862]
```

### 4. Validation Progress
```
Validating: 100%|████████████| 79/79 [00:18<00:00, 4.32batch/s, loss=0.3156]
```

## Complete Training Output Example

```bash
$ make train

============================================================
Using device: cuda
GPU: Tesla V100-SXM2-16GB
CUDA Version: 13.0
============================================================
WARNING: Limiting to 10000 sequences per dataset for testing

Loading data from data/synthetic_migraine_train.csv...
Loaded 2,920,000 rows
Creating sequences (this may take a while for large datasets)...
Processing 100000 users...
Creating sequences: 100%|████████| 134/100000 [00:05<00:00, 2678.45user/s, sequences=10000]
Reached max_sequences limit
Created 10000 sequences from 100000 users

Loading data from data/synthetic_migraine_val.csv...
Loaded 730,000 rows
Creating sequences (this may take a while for large datasets)...
Processing 25000 users...
Creating sequences: 100%|████████| 34/25000 [00:01<00:00, 2543.12user/s, sequences=10000]
Reached max_sequences limit
Created 10000 sequences from 25000 users

Creating model...
Model parameters: 245,764
GPU memory allocated: 2.15 MB
GPU memory reserved: 20.00 MB

Starting training...
============================================================

Epochs:   0%|                  | 0/500 [00:00<?, ?epoch/s]
Training: 100%|████████████████| 313/313 [02:15<00:00, 2.31batch/s, loss=0.4521, post=0.3245, policy=0.0523, migr=0.0753]
Validating: 100%|████████████| 79/79 [00:18<00:00, 4.32batch/s, loss=0.4234]
Train - Loss: 0.4521, Post: 0.3245, Policy: 0.0523, Migraine: 0.0753
Val - Loss: 0.4234, AUC: 0.6234, Brier: 0.2145
✓ Saved best model to runs/checkpoints/best.pt

Epochs:   0%|▏                 | 1/500 [02:33<21:17:23, 153.68s/epoch, train_loss=0.4521, val_loss=0.4234, val_auc=0.6234, best_val=0.4234]
Training: 100%|████████████████| 313/313 [02:14<00:00, 2.33batch/s, loss=0.3892, post=0.2834, policy=0.0421, migr=0.0637]
Validating: 100%|████████████| 79/79 [00:17<00:00, 4.41batch/s, loss=0.3756]
Train - Loss: 0.3892, Post: 0.2834, Policy: 0.0421, Migraine: 0.0637
Val - Loss: 0.3756, AUC: 0.6892, Brier: 0.1923
✓ Saved best model to runs/checkpoints/best.pt

Epochs:   0%|▎                 | 2/500 [05:06<20:56:45, 151.52s/epoch, train_loss=0.3892, val_loss=0.3756, val_auc=0.6892, best_val=0.3756]
...
```

## Benefits

1. **Visual Progress**: See exactly where the script is at any time
2. **Time Estimates**: ETA for completion (e.g., `[12:34<50:12]`)
3. **Performance Metrics**: Real-time speed (batches/s, users/s)
4. **Current Metrics**: Loss values update in real-time
5. **Better UX**: No more wondering if script is frozen
6. **tmux-Friendly**: Works great in remote SSH sessions

## Progress Bar Hierarchy

```
Epochs (outermost)
├── Training batches (for each epoch)
│   └── Real-time loss metrics
└── Validation batches (for each epoch)
    └── Real-time loss metrics

Data Loading (startup only)
└── User processing with sequence count
```

## Customization

All progress bars use tqdm defaults, which automatically:
- Detect terminal width
- Show progress percentage
- Display progress bar
- Calculate and show ETA
- Show iteration speed
- Update dynamically

To disable progress bars (e.g., for logging to file):
```python
# Set TQDM_DISABLE environment variable
export TQDM_DISABLE=1
make train
```

## Performance Impact

tqdm has minimal overhead:
- ~0.1-0.5% CPU usage
- Negligible memory impact
- Updates throttled to avoid I/O spam
- Works efficiently with tmux/screen

The visual feedback is worth the tiny performance cost!
