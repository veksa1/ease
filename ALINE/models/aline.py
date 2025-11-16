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
        
        # Initialize weights for stability
        self._init_weights()
        
    def _init_weights(self):
        """Initialize weights with small values to prevent gradient explosion"""
        # Initialize linear layers with Xavier uniform
        for name, param in self.named_parameters():
            if 'weight' in name and param.dim() >= 2:
                nn.init.xavier_uniform_(param, gain=0.5)  # Small gain for stability
            elif 'bias' in name:
                nn.init.constant_(param, 0.0)
        
        # Initialize posterior head with even smaller weights
        nn.init.xavier_uniform_(self.post_head.weight, gain=0.1)
        nn.init.constant_(self.post_head.bias, 0.0)
        
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
        
        # Clamp mu to reasonable range (latent values should be roughly [-10, 10])
        mu = torch.clamp(mu, min=-10.0, max=10.0)
        
        # Clamp log-std to prevent explosion: exp(-5) = 0.007, exp(2) = 7.4
        # This keeps std in a reasonable range [0.007, 7.4]
        logsig = torch.clamp(logsig, min=-5.0, max=2.0)
        
        # Create Normal distribution (exp to get std from log-std)
        posterior = Normal(mu, logsig.exp())
        
        # Policy head: compute query scores (clamp to prevent extreme values)
        pol = self.policy_head(h).squeeze(-1)  # [B, T]
        pol = torch.clamp(pol, min=-10.0, max=10.0)
        
        return posterior, pol
