"""
Active Query Policy Utilities - Ticket 007 & 022

Implements priority scoring for selecting k hourly slots for targeted sensing.
Uses uncertainty and impact metrics to determine which hours to query.

Ticket 022 adds feature-level information gain for recommending WHAT to measure.

Author: ALINE Team
Date: 2025-11-15
"""

import torch
import numpy as np
from typing import Tuple, Optional, List, Dict


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


# ============================================================================
# FEATURE-LEVEL INFORMATION GAIN (Ticket 022)
# ============================================================================

def compute_feature_information_gain(
    model,
    x: torch.Tensor,
    user_ids: Optional[torch.Tensor] = None,
    feature_availability: Optional[torch.Tensor] = None
) -> torch.Tensor:
    """
    Compute information gain for each feature at each timestep.
    
    This function uses gradient-based sensitivity to determine which features
    provide the most information for migraine prediction.
    
    Args:
        model: ALINE model with forward method
        x: Input features [B, T, F] 
        user_ids: User IDs [B] (optional, for personalized models)
        feature_availability: Binary mask [B, T, F] (1=available, 0=missing)
        
    Returns:
        feature_gains: Information gain scores [B, T, F] per feature
    """
    # Enable gradient computation
    x_grad = x.clone().detach().requires_grad_(True)
    
    # Forward pass
    if user_ids is not None:
        outputs = model(x_grad, user_ids)
    else:
        outputs = model(x_grad)
    
    # Get migraine probability
    if 'migraine_logit' in outputs:
        migraine_logit = outputs['migraine_logit']
    elif 'migraine_prob' in outputs:
        migraine_logit = torch.logit(outputs['migraine_prob'], eps=1e-6)
    else:
        # Fallback: use mu_z with migraine weights if available
        mu_z = outputs.get('mu_z', outputs.get('posterior_mean'))
        if mu_z is not None and hasattr(model, 'migraine_weights'):
            migraine_logit = (mu_z @ model.migraine_weights.unsqueeze(-1)).squeeze(-1) + model.migraine_bias
        else:
            raise ValueError("Model output does not contain migraine prediction")
    
    migraine_prob = torch.sigmoid(migraine_logit)
    
    # Compute gradient of prediction w.r.t. each input feature
    grad_outputs = torch.ones_like(migraine_prob)
    gradients = torch.autograd.grad(
        outputs=migraine_prob.sum(),  # Sum to get scalar for backward
        inputs=x_grad,
        grad_outputs=None,
        create_graph=False,
        retain_graph=False
    )[0]  # [B, T, F]
    
    # Information gain = |gradient| × uncertainty × (1 - availability)
    # Uncertainty: migraine_prob * (1 - migraine_prob) [B]
    uncertainty = migraine_prob * (1 - migraine_prob)  # [B]
    
    # Expand uncertainty to match feature dimensions
    if uncertainty.dim() == 1:
        uncertainty = uncertainty.unsqueeze(1).unsqueeze(2)  # [B, 1, 1]
    
    # Default feature availability to all available if not provided
    if feature_availability is None:
        feature_availability = torch.ones_like(x)
    
    # Compute feature gains
    feature_gains = (
        torch.abs(gradients) *  # Sensitivity to each feature
        uncertainty *  # Prediction uncertainty
        (1 - feature_availability)  # Boost missing features
    )
    
    return feature_gains


def get_priority_queries(
    model,
    x: torch.Tensor,
    user_ids: Optional[torch.Tensor] = None,
    feature_availability: Optional[torch.Tensor] = None,
    feature_names: Optional[List[str]] = None,
    k_temporal: int = 3,
    k_features: int = 5
) -> List[Dict]:
    """
    Get top-k temporal and feature queries based on information gain.
    
    Args:
        model: ALINE model
        x: Input features [B, T, F]
        user_ids: User IDs [B] (optional)
        feature_availability: Binary mask [B, T, F]
        feature_names: List of feature names (length F)
        k_temporal: Number of top temporal queries
        k_features: Number of top features to recommend
        
    Returns:
        List of dictionaries (one per batch element) with:
        {
            "temporal_queries": [
                {"hour": int, "score": float, "features": List[str]},
                ...
            ],
            "feature_queries": [
                {"feature": str, "score": float, "best_hour": int},
                ...
            ]
        }
    """
    B, T, F = x.shape
    
    # Get feature-level information gain
    feature_gains = compute_feature_information_gain(
        model, x, user_ids, feature_availability
    )  # [B, T, F]
    
    # Default feature names if not provided
    if feature_names is None:
        feature_names = [f"Feature_{i}" for i in range(F)]
    
    batch_results = []
    
    for b in range(B):
        # Temporal queries: max across features per timestep
        temporal_scores = feature_gains[b].max(dim=-1).values  # [T]
        top_temporal_indices = torch.topk(temporal_scores, min(k_temporal, T)).indices
        
        temporal_queries = []
        for i in range(len(top_temporal_indices)):
            hour_idx = top_temporal_indices[i].item()
            score = temporal_scores[hour_idx].item()
            
            # Find which features are most important at this hour
            hour_feature_gains = feature_gains[b, hour_idx]
            top_features_at_hour = torch.topk(hour_feature_gains, min(3, F)).indices
            feature_list = [feature_names[idx.item()] for idx in top_features_at_hour]
            
            temporal_queries.append({
                "hour": hour_idx,
                "score": float(score),
                "features": feature_list
            })
        
        # Feature queries: max across timesteps per feature
        feature_scores = feature_gains[b].max(dim=0).values  # [F]
        top_feature_indices = torch.topk(feature_scores, min(k_features, F)).indices
        
        feature_queries = []
        for i in range(len(top_feature_indices)):
            feat_idx = top_feature_indices[i].item()
            score = feature_scores[feat_idx].item()
            
            # Find best hour to measure this feature
            best_hour = feature_gains[b, :, feat_idx].argmax().item()
            
            feature_queries.append({
                "feature": feature_names[feat_idx],
                "score": float(score),
                "best_hour": best_hour
            })
        
        batch_results.append({
            "temporal_queries": temporal_queries,
            "feature_queries": feature_queries
        })
    
    return batch_results
