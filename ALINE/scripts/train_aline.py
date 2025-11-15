"""
ALINE Training Script - Ticket 006

Training loop with:
1. Posterior fit loss (MSE on latent state)
2. Policy proxy loss (uncertainty-based)
3. Migraine prediction loss (BCE)

Author: ALINE Team
Date: 2025-11-15
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
import yaml
import json
import logging
from datetime import datetime
from tqdm import tqdm
from multiprocessing import Pool, cpu_count
from functools import partial
from models.aline import SimpleALINE
from sklearn.metrics import roc_auc_score, brier_score_loss

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def _process_user_sequences(args):
    """
    Helper function to process sequences for a single user (for parallel processing).
    
    Args:
        args: tuple of (user_id, user_df, feature_cols, latent_cols, sequence_length)
    
    Returns:
        list of sequence dictionaries
    """
    user_id, user_data, feature_cols, latent_cols, sequence_length = args
    
    # Parse user data from dict (passed from main process)
    user_df = pd.DataFrame(user_data)
    user_df = user_df.sort_values('day').reset_index(drop=True)
    
    sequences = []
    for i in range(len(user_df) - sequence_length):
        features = user_df.loc[i:i+sequence_length-1, feature_cols].values
        latents = user_df.loc[i:i+sequence_length-1, latent_cols].values
        migraine_next = user_df.loc[i+sequence_length, 'migraine']
        migraine_prob_next = user_df.loc[i+sequence_length, 'migraine_prob']
        
        sequences.append({
            'features': features,
            'latents': latents,
            'migraine_next': migraine_next,
            'migraine_prob_next': migraine_prob_next
        })
    
    return sequences


class MigraineDataset(Dataset):
    """Dataset for hourly migraine prediction with 24-hour windows"""
    
    def __init__(self, csv_path, sequence_length=24, max_sequences=None, num_workers=None):
        self.sequence_length = sequence_length
        
        logger.info(f"Loading data from {csv_path}...")
        self.df = pd.read_csv(csv_path)
        logger.info(f"Loaded {len(self.df)} rows")
        
        # Feature columns (exclude meta and target columns)
        feature_cols = [col for col in self.df.columns if col not in [
            'user_id', 'day', 'Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad',
            'migraine_prob', 'migraine'
        ]]
        
        # Latent state columns
        latent_cols = ['Z_stress', 'Z_sleepDebt', 'Z_hormonal', 'Z_envLoad']
        
        self.feature_cols = feature_cols
        self.latent_cols = latent_cols
        
        # Group by user first
        user_ids = self.df['user_id'].unique()
        
        # Determine number of worker processes
        if num_workers is None:
            num_workers = max(1, cpu_count() - 1)  # Leave one CPU free
        
        # Disable multiprocessing if only 1 worker or small dataset
        use_parallel = num_workers > 1 and len(user_ids) > 100
        
        if use_parallel:
            logger.info(f"Using {num_workers} workers for parallel sequence creation...")
        else:
            logger.info(f"Using single-threaded sequence creation...")
        
        logger.info(f"Processing {len(user_ids)} users...")
        
        # Process users in parallel or sequentially
        self.sequences = []
        
        if use_parallel:
            # Prepare arguments for parallel processing
            user_args = []
            for user_id in user_ids:
                user_df = self.df[self.df['user_id'] == user_id]
                # Convert to dict for pickling (multiprocessing requirement)
                user_data = user_df.to_dict('list')
                user_args.append((user_id, user_data, feature_cols, latent_cols, sequence_length))
            
            try:
                # Process users in parallel with context manager
                with Pool(processes=num_workers) as pool:
                    # Use imap_unordered for better performance with progress bar
                    results = list(tqdm(
                        pool.imap_unordered(_process_user_sequences, user_args, chunksize=10),
                        total=len(user_args),
                        desc="Creating sequences",
                        unit="user"
                    ))
                    
                    # Flatten results
                    for user_sequences in results:
                        self.sequences.extend(user_sequences)
                        if max_sequences and len(self.sequences) >= max_sequences:
                            self.sequences = self.sequences[:max_sequences]
                            break
            except Exception as e:
                logger.warning(f"Parallel processing failed ({e}), falling back to sequential...")
                use_parallel = False
                self.sequences = []
        
        if not use_parallel:
            # Sequential fallback
            for user_id in tqdm(user_ids, desc="Creating sequences", unit="user"):
                user_df = self.df[self.df['user_id'] == user_id].sort_values('day').reset_index(drop=True)
                
                for i in range(len(user_df) - sequence_length):
                    features = user_df.loc[i:i+sequence_length-1, feature_cols].values
                    latents = user_df.loc[i:i+sequence_length-1, latent_cols].values
                    migraine_next = user_df.loc[i+sequence_length, 'migraine']
                    migraine_prob_next = user_df.loc[i+sequence_length, 'migraine_prob']
                    
                    self.sequences.append({
                        'features': features,
                        'latents': latents,
                        'migraine_next': migraine_next,
                        'migraine_prob_next': migraine_prob_next
                    })
                    
                    if max_sequences and len(self.sequences) >= max_sequences:
                        break
                
                if max_sequences and len(self.sequences) >= max_sequences:
                    break
        
        logger.info(f"Created {len(self.sequences)} sequences from {len(user_ids)} users")
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        seq = self.sequences[idx]
        return {
            'features': torch.FloatTensor(seq['features']),
            'latents': torch.FloatTensor(seq['latents']),
            'migraine_next': torch.FloatTensor([seq['migraine_next']]),
            'migraine_prob_next': torch.FloatTensor([seq['migraine_prob_next']])
        }


def compute_posterior_loss(posterior, target_latents, lambda_sigma=0.5):
    """
    Posterior fit loss: MSE on mean and regularization on sigma
    
    Args:
        posterior: Normal distribution from model
        target_latents: Ground truth latent states [B, T, z_dim]
        lambda_sigma: Weight for sigma regularization
    """
    mu = posterior.mean
    sigma = posterior.stddev
    
    # MSE on mean
    loss_mu = nn.functional.mse_loss(mu, target_latents)
    
    # Regularize sigma to be small but not too small (target ~0.5)
    target_sigma = torch.ones_like(sigma) * 0.5
    loss_sigma = nn.functional.mse_loss(sigma, target_sigma)
    
    return loss_mu + lambda_sigma * loss_sigma


def compute_policy_loss(posterior, policy_scores, migraine_weights, k=3):
    """
    Policy proxy loss: reward uncertainty reduction
    
    Args:
        posterior: Normal distribution from model
        policy_scores: Policy scores [B, T]
        migraine_weights: Weights for migraine prediction [z_dim]
        k: Number of top hours to select
    """
    mu = posterior.mean  # [B, T, z_dim]
    sigma = posterior.stddev
    
    # Compute migraine probability from latent state
    # p = sigmoid(w @ mu + b)
    p = torch.sigmoid((mu @ migraine_weights.unsqueeze(-1)).squeeze(-1))  # [B, T]
    
    # Entropy of migraine prediction
    entropy = -(p * torch.log(p + 1e-6) + (1 - p) * torch.log(1 - p + 1e-6))
    
    # Uncertainty: entropy + variance in latent state
    uncertainty = entropy + 0.1 * sigma.mean(dim=-1)  # [B, T]
    
    # Select top-k policy scores
    topk_indices = policy_scores.topk(k=min(k, policy_scores.size(1)), dim=1).indices
    
    # Maximize uncertainty at selected hours (minimize negative)
    selected_uncertainty = torch.gather(uncertainty, 1, topk_indices)
    policy_loss = -selected_uncertainty.mean()
    
    return policy_loss


def train_epoch(model, dataloader, optimizer, device, config):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    total_post_loss = 0
    total_policy_loss = 0
    total_migraine_loss = 0
    
    # Migraine prediction weights (from simulator config)
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35], device=device)
    migraine_bias = torch.tensor([-1.8], device=device)
    
    # Progress bar for batches
    pbar = tqdm(enumerate(dataloader), total=len(dataloader), desc="Training", unit="batch")
    
    for batch_idx, batch in pbar:
        features = batch['features'].to(device)
        latents = batch['latents'].to(device)
        migraine_next = batch['migraine_next'].to(device)
        
        # Forward pass
        posterior, policy_scores = model(features)
        
        # Log GPU memory on first batch
        if batch_idx == 0 and device.type == 'cuda':
            logger.info(f"After first batch - GPU memory allocated: {torch.cuda.memory_allocated(0) / 1024**2:.2f} MB")
        
        # Posterior loss
        loss_post = compute_posterior_loss(
            posterior, latents, 
            lambda_sigma=config['training']['lambda_sigma']
        )
        
        # Policy loss
        loss_policy = compute_policy_loss(
            posterior, policy_scores, migraine_weights
        )
        
        # Migraine prediction loss (from last time step)
        mu_last = posterior.mean[:, -1, :]  # [B, z_dim]
        p_migraine = torch.sigmoid((mu_last @ migraine_weights) + migraine_bias)
        loss_migraine = nn.functional.binary_cross_entropy(p_migraine, migraine_next.squeeze())
        
        # Combined loss
        loss = (loss_post + 
                config['training']['alpha_policy'] * loss_policy + 
                config['training']['beta_migraine'] * loss_migraine)
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        total_post_loss += loss_post.item()
        total_policy_loss += loss_policy.item()
        total_migraine_loss += loss_migraine.item()
        
        # Update progress bar
        pbar.set_postfix({
            'loss': f'{loss.item():.4f}',
            'post': f'{loss_post.item():.4f}',
            'policy': f'{loss_policy.item():.4f}',
            'migr': f'{loss_migraine.item():.4f}'
        })
    
    pbar.close()
    
    n_batches = len(dataloader)
    return {
        'loss': total_loss / n_batches,
        'post_loss': total_post_loss / n_batches,
        'policy_loss': total_policy_loss / n_batches,
        'migraine_loss': total_migraine_loss / n_batches
    }


def validate(model, dataloader, device, config):
    """Validate the model"""
    model.eval()
    total_loss = 0
    all_preds = []
    all_targets = []
    
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35], device=device)
    migraine_bias = torch.tensor([-1.8], device=device)
    
    # Progress bar for validation
    pbar = tqdm(dataloader, desc="Validating", unit="batch", leave=False)
    
    with torch.no_grad():
        for batch in pbar:
            features = batch['features'].to(device)
            latents = batch['latents'].to(device)
            migraine_next = batch['migraine_next'].to(device)
            
            posterior, policy_scores = model(features)
            
            # Posterior loss
            loss_post = compute_posterior_loss(
                posterior, latents,
                lambda_sigma=config['training']['lambda_sigma']
            )
            
            # Migraine prediction
            mu_last = posterior.mean[:, -1, :]
            p_migraine = torch.sigmoid((mu_last @ migraine_weights) + migraine_bias)
            loss_migraine = nn.functional.binary_cross_entropy(p_migraine, migraine_next.squeeze())
            
            loss = loss_post + config['training']['beta_migraine'] * loss_migraine
            total_loss += loss.item()
            
            all_preds.extend(p_migraine.cpu().numpy())
            all_targets.extend(migraine_next.cpu().numpy())
            
            # Update progress bar
            pbar.set_postfix({'loss': f'{loss.item():.4f}'})
    
    pbar.close()
    
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets).flatten()
    
    # Compute metrics
    auc = roc_auc_score(all_targets, all_preds) if len(np.unique(all_targets)) > 1 else 0.5
    brier = brier_score_loss(all_targets, all_preds)
    
    return {
        'loss': total_loss / len(dataloader),
        'auc': auc,
        'brier': brier
    }


def main():
    # Set multiprocessing start method for compatibility
    import multiprocessing as mp
    try:
        mp.set_start_method('spawn', force=True)
    except RuntimeError:
        pass  # Already set
    
    # Load config
    config_path = Path(__file__).parent.parent / 'configs' / 'train.yaml'
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    # Set random seed
    torch.manual_seed(config['seed'])
    np.random.seed(config['seed'])
    
    # Device - log this FIRST to confirm CUDA detection
    if config['device'] == 'auto':
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    else:
        device = torch.device(config['device'])
    
    logger.info("="*60)
    logger.info(f"Using device: {device}")
    if device.type == 'cuda':
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"CUDA Version: {torch.version.cuda}")
    logger.info("="*60)
    
    # Create directories
    checkpoint_dir = Path(config['checkpoint']['save_dir'])
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    log_dir = Path(config['logging']['log_dir'])
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Load datasets with optional limit for testing
    max_sequences = config.get('max_sequences_per_dataset', None)
    if max_sequences:
        logger.info(f"WARNING: Limiting to {max_sequences} sequences per dataset for testing")
    
    train_dataset = MigraineDataset(
        config['data']['train'],
        sequence_length=config['training']['sequence_length'],
        max_sequences=max_sequences
    )
    val_dataset = MigraineDataset(
        config['data']['val'],
        sequence_length=config['training']['sequence_length'],
        max_sequences=max_sequences
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['training']['batch_size'],
        shuffle=True,
        num_workers=0
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['training']['batch_size'],
        shuffle=False,
        num_workers=0
    )
    
    # Create model
    logger.info("Creating model...")
    model = SimpleALINE(
        in_dim=config['model']['in_dim'],
        z_dim=config['model']['z_dim'],
        d_model=config['model']['d_model'],
        nhead=config['model']['nhead'],
        nlayers=config['model']['nlayers']
    ).to(device)
    
    logger.info(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Log GPU allocation after moving model to device
    if device.type == 'cuda':
        logger.info(f"GPU memory allocated: {torch.cuda.memory_allocated(0) / 1024**2:.2f} MB")
        logger.info(f"GPU memory reserved: {torch.cuda.memory_reserved(0) / 1024**2:.2f} MB")
    
    # Optimizer
    optimizer = optim.Adam(
        model.parameters(),
        lr=config['training']['learning_rate'],
        weight_decay=config['training']['weight_decay']
    )
    
    # Scheduler
    if config['training']['scheduler'] == 'cosine':
        scheduler = optim.lr_scheduler.CosineAnnealingLR(
            optimizer,
            T_max=config['training']['num_epochs']
        )
    else:
        scheduler = None
    
    # Training loop
    best_val_loss = float('inf')
    patience_counter = 0
    training_log = []
    
    logger.info("Starting training...")
    logger.info("="*60)
    
    # Outer progress bar for epochs
    epoch_pbar = tqdm(range(config['training']['num_epochs']), desc="Epochs", unit="epoch")
    
    for epoch in epoch_pbar:
        epoch_pbar.set_description(f"Epoch {epoch+1}/{config['training']['num_epochs']}")
        
        # Train
        train_metrics = train_epoch(model, train_loader, optimizer, device, config)
        
        # Validate
        val_metrics = validate(model, val_loader, device, config)
        
        if scheduler:
            scheduler.step()
        
        # Log
        log_entry = {
            'epoch': epoch + 1,
            'train_loss': train_metrics['loss'],
            'train_post_loss': train_metrics['post_loss'],
            'train_policy_loss': train_metrics['policy_loss'],
            'train_migraine_loss': train_metrics['migraine_loss'],
            'val_loss': val_metrics['loss'],
            'val_auc': val_metrics['auc'],
            'val_brier': val_metrics['brier'],
            'lr': optimizer.param_groups[0]['lr']
        }
        training_log.append(log_entry)
        
        # Update epoch progress bar with metrics
        epoch_pbar.set_postfix({
            'train_loss': f'{train_metrics["loss"]:.4f}',
            'val_loss': f'{val_metrics["loss"]:.4f}',
            'val_auc': f'{val_metrics["auc"]:.4f}',
            'best_val': f'{best_val_loss:.4f}'
        })
        
        logger.info(f"Train - Loss: {train_metrics['loss']:.4f}, "
                   f"Post: {train_metrics['post_loss']:.4f}, "
                   f"Policy: {train_metrics['policy_loss']:.4f}, "
                   f"Migraine: {train_metrics['migraine_loss']:.4f}")
        logger.info(f"Val - Loss: {val_metrics['loss']:.4f}, "
                   f"AUC: {val_metrics['auc']:.4f}, "
                   f"Brier: {val_metrics['brier']:.4f}")
        
        # Save best model
        if val_metrics['loss'] < best_val_loss - config['training']['min_delta']:
            best_val_loss = val_metrics['loss']
            patience_counter = 0
            
            if config['checkpoint']['save_best']:
                best_path = checkpoint_dir / 'best.pt'
                torch.save({
                    'epoch': epoch + 1,
                    'model_state_dict': model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'val_loss': val_metrics['loss'],
                    'val_auc': val_metrics['auc'],
                    'config': config
                }, best_path)
                logger.info(f"✓ Saved best model to {best_path}")
        else:
            patience_counter += 1
        
        # Save periodic checkpoint
        if (epoch + 1) % config['checkpoint']['save_every'] == 0:
            ckpt_path = checkpoint_dir / f'epoch_{epoch+1}.pt'
            torch.save({
                'epoch': epoch + 1,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_metrics['loss'],
                'config': config
            }, ckpt_path)
        
        # Early stopping
        if patience_counter >= config['training']['patience']:
            logger.info(f"\nEarly stopping at epoch {epoch+1}")
            epoch_pbar.close()
            break
    
    epoch_pbar.close()
    
    # Save training log
    log_df = pd.DataFrame(training_log)
    log_df.to_csv(config['logging']['csv_log'], index=False)
    logger.info(f"\n✅ Training complete! Log saved to {config['logging']['csv_log']}")
    logger.info(f"Best validation loss: {best_val_loss:.4f}")


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Ensure any unhandled exceptions are both logged and printed to stderr
        logger.exception("Unhandled exception in training")
        import traceback, sys
        traceback.print_exc()
        sys.exit(1)
