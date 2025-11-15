"""
Active Query Policy Utilities - Ticket 007

Implements priority scoring for selecting k hourly slots for targeted sensing.
Uses uncertainty and impact metrics to determine which hours to query.

Author: ALINE Team
Date: 2025-11-15
"""

import torch
import numpy as np
from typing import Tuple, Optional


def compute_priority_scores(
    posterior_mean: torch.Tensor,
    posterior_std: torch.Tensor,
    migraine_weights: torch.Tensor,
    migraine_bias: float = -1.8,
    lambda1: float = 1.0,
    lambda2: float = 0.5,
    lambda3: float = 0.3
) -> torch.Tensor:
    """
    Compute priority scores for each time step based on uncertainty and impact.
    
    Priority score = λ1 * entropy(p_t) + λ2 * mean(sigma_z_t) + λ3 * |∂p/∂Z_t|
    
    Args:
        posterior_mean: Posterior mean [B, T, z_dim] or [T, z_dim]
        posterior_std: Posterior stddev [B, T, z_dim] or [T, z_dim]
        migraine_weights: Weights for migraine prediction [z_dim]
        migraine_bias: Bias for migraine prediction
        lambda1: Weight for entropy term
        lambda2: Weight for uncertainty term
        lambda3: Weight for gradient term
        
    Returns:
        Priority scores [B, T] or [T]
    """
    # Handle both batched and unbatched inputs
    if posterior_mean.dim() == 2:
        posterior_mean = posterior_mean.unsqueeze(0)
        posterior_std = posterior_std.unsqueeze(0)
        unbatched = True
    else:
        unbatched = False
    
    B, T, z_dim = posterior_mean.shape
    
    # Compute migraine probability: p = sigmoid(w @ mu + b)
    p_migraine = torch.sigmoid(
        (posterior_mean @ migraine_weights.unsqueeze(-1)).squeeze(-1) + migraine_bias
    )  # [B, T]
    
    # 1. Entropy: H(p) = -p*log(p) - (1-p)*log(1-p)
    eps = 1e-6
    entropy = -(p_migraine * torch.log(p_migraine + eps) + 
                (1 - p_migraine) * torch.log(1 - p_migraine + eps))
    
    # 2. Uncertainty: mean of posterior std across latent dimensions
    uncertainty = posterior_std.mean(dim=-1)  # [B, T]
    
    # 3. Impact/Gradient: |∂p/∂Z| approximated by ||w|| * p * (1-p)
    # This represents how sensitive the migraine probability is to changes in latent state
    w_norm = torch.norm(migraine_weights)
    gradient_magnitude = w_norm * p_migraine * (1 - p_migraine)
    
    # Combine scores
    priority_scores = (
        lambda1 * entropy + 
        lambda2 * uncertainty + 
        lambda3 * gradient_magnitude
    )
    
    if unbatched:
        priority_scores = priority_scores.squeeze(0)
    
    return priority_scores


def select_topk_hours(
    priority_scores: torch.Tensor,
    k: int,
    return_scores: bool = False
) -> Tuple[torch.Tensor, Optional[torch.Tensor]]:
    """
    Select top-k hours based on priority scores.
    
    Args:
        priority_scores: Priority scores [B, T] or [T]
        k: Number of hours to select
        return_scores: Whether to return the selected scores
        
    Returns:
        indices: Indices of selected hours [B, k] or [k]
        scores: Selected scores [B, k] or [k] (if return_scores=True)
    """
    # Handle both batched and unbatched inputs
    if priority_scores.dim() == 1:
        priority_scores = priority_scores.unsqueeze(0)
        unbatched = True
    else:
        unbatched = False
    
    k = min(k, priority_scores.size(1))
    
    # Get top-k indices and values
    topk_result = priority_scores.topk(k=k, dim=1)
    indices = topk_result.indices
    scores = topk_result.values
    
    if unbatched:
        indices = indices.squeeze(0)
        scores = scores.squeeze(0)
    
    if return_scores:
        return indices, scores
    return indices, None


def evaluate_policy(
    selected_indices: torch.Tensor,
    true_important_hours: torch.Tensor,
    k: Optional[int] = None
) -> float:
    """
    Evaluate policy by computing precision@k (how many selected hours are truly important).
    
    Args:
        selected_indices: Selected hour indices [B, k] or [k]
        true_important_hours: Ground truth important hours [B, T] or [T] (binary mask)
        k: Number of selected hours (inferred from selected_indices if not provided)
        
    Returns:
        Precision@k score
    """
    if selected_indices.dim() == 1:
        selected_indices = selected_indices.unsqueeze(0)
        true_important_hours = true_important_hours.unsqueeze(0)
    
    B, T = true_important_hours.shape
    if k is None:
        k = selected_indices.size(1)
    
    # Create a binary mask of selected indices
    selected_mask = torch.zeros(B, T, dtype=torch.float32, device=selected_indices.device)
    for i in range(B):
        selected_mask[i, selected_indices[i]] = 1.0
    
    # Compute precision: how many selected hours are in the true important set
    correct = (selected_mask * true_important_hours).sum(dim=1)
    precision = (correct / k).mean().item()
    
    return precision


def simulate_random_policy(T: int, k: int, batch_size: int = 1) -> torch.Tensor:
    """
    Simulate a random policy for baseline comparison.
    
    Args:
        T: Total number of time steps
        k: Number of hours to select
        batch_size: Batch size
        
    Returns:
        Random indices [batch_size, k]
    """
    indices = []
    for _ in range(batch_size):
        perm = torch.randperm(T)
        indices.append(perm[:k])
    return torch.stack(indices)


def simulate_fixed_policy(hours: list, T: int = 24, batch_size: int = 1) -> torch.Tensor:
    """
    Simulate a fixed schedule policy (e.g., always query at 8am, 12pm, 8pm).
    
    Args:
        hours: List of fixed hours to query (e.g., [8, 12, 20])
        T: Total number of hours in a day
        batch_size: Batch size
        
    Returns:
        Fixed indices [batch_size, k]
    """
    indices = torch.tensor(hours, dtype=torch.long)
    return indices.unsqueeze(0).repeat(batch_size, 1)
