"""
Simplified ALINE Model - Ticket 005

Transformer encoder → amortized Gaussian posterior head + lightweight policy head.
This model outputs:
1. A Gaussian posterior over latent state (Z_t)
2. Policy scores for active querying

Author: ALINE Team
Date: 2025-11-15
"""

import torch
import torch.nn as nn
from torch.distributions import Normal


class SimpleALINE(nn.Module):
    """
    Simplified ALINE model for hourly migraine prediction.
    
    Architecture:
    - Input projection layer
    - Transformer encoder
    - Posterior head (outputs μ_z and log σ_z)
    - Policy head (outputs query scores per time step)
    
    Args:
        in_dim: Number of normalized features per hour
        z_dim: Latent dimension (default: 4 for stress, sleepDebt, hormonal, envLoad)
        d_model: Transformer model dimension (default: 64)
        nhead: Number of attention heads (default: 4)
        nlayers: Number of transformer layers (default: 3)
    """
    
    def __init__(self, in_dim, z_dim=4, d_model=64, nhead=4, nlayers=3):
        super().__init__()
        
        # Input projection
        self.proj_in = nn.Linear(in_dim, d_model)
        
        # Transformer encoder
        layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=256,
            batch_first=True
        )
        self.enc = nn.TransformerEncoder(layer, num_layers=nlayers)
        
        # Posterior head: outputs μ_z and log σ_z
        self.post_head = nn.Linear(d_model, 2 * z_dim)
        
        # Policy head: outputs query score per time step
        self.policy_head = nn.Linear(d_model, 1)
        
        self.in_dim = in_dim
        self.z_dim = z_dim
        self.d_model = d_model
        
    def forward(self, x):
        """
        Forward pass through the ALINE model.
        
        Args:
            x: Input tensor of shape [B, T, in_dim]
               where B is batch size, T is sequence length (24 hours)
        
        Returns:
            posterior: Normal distribution with mean [B, T, z_dim] and std [B, T, z_dim]
            policy_scores: Policy scores of shape [B, T]
        """
        # Project input to model dimension
        h = self.proj_in(x)  # [B, T, d_model]
        
        # Pass through transformer encoder
        h = self.enc(h)  # [B, T, d_model]
        
        # Posterior head: compute mean and log-std for latent state
        stats = self.post_head(h)  # [B, T, 2*z_dim]
        mu, logsig = stats.chunk(2, dim=-1)  # Each: [B, T, z_dim]
        
        # Create Normal distribution (exp to get std from log-std)
        posterior = Normal(mu, logsig.exp())
        
        # Policy head: compute query scores
        pol = self.policy_head(h).squeeze(-1)  # [B, T]
        
        return posterior, pol
