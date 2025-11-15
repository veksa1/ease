"""
Unit tests for ALINE model forward pass - Ticket 005

Tests the SimpleALINE model to ensure:
1. Forward pass works correctly
2. Output shapes are correct
3. Distribution properties are valid

Author: ALINE Team
Date: 2025-11-15
"""

import sys
from pathlib import Path

# Add parent directory to path to import models
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import pytest
from models.aline import SimpleALINE


def test_simple_aline_forward_pass():
    """Test basic forward pass with dummy tensors."""
    # Set random seed for reproducibility
    torch.manual_seed(42)
    
    # Model parameters
    batch_size = 4
    seq_len = 24  # 24 hours
    in_dim = 20  # 20 features
    z_dim = 4
    
    # Create model
    model = SimpleALINE(in_dim=in_dim, z_dim=z_dim, d_model=64, nhead=4, nlayers=3)
    
    # Create dummy input
    x = torch.randn(batch_size, seq_len, in_dim)
    
    # Forward pass
    posterior, policy_scores = model(x)
    
    # Check posterior distribution
    assert posterior.mean.shape == (batch_size, seq_len, z_dim), \
        f"Expected posterior mean shape {(batch_size, seq_len, z_dim)}, got {posterior.mean.shape}"
    assert posterior.stddev.shape == (batch_size, seq_len, z_dim), \
        f"Expected posterior stddev shape {(batch_size, seq_len, z_dim)}, got {posterior.stddev.shape}"
    
    # Check policy scores
    assert policy_scores.shape == (batch_size, seq_len), \
        f"Expected policy scores shape {(batch_size, seq_len)}, got {policy_scores.shape}"
    
    # Check that standard deviation is positive
    assert torch.all(posterior.stddev > 0), "Standard deviation must be positive"
    
    # Check that we can sample from the distribution
    samples = posterior.sample()
    assert samples.shape == (batch_size, seq_len, z_dim), \
        f"Expected samples shape {(batch_size, seq_len, z_dim)}, got {samples.shape}"
    
    print("✓ Forward pass test passed")
    print(f"✓ Posterior mean shape: {posterior.mean.shape}")
    print(f"✓ Posterior stddev shape: {posterior.stddev.shape}")
    print(f"✓ Policy scores shape: {policy_scores.shape}")


def test_simple_aline_batch_sizes():
    """Test model with different batch sizes."""
    model = SimpleALINE(in_dim=20, z_dim=4)
    
    for batch_size in [1, 2, 8, 16]:
        x = torch.randn(batch_size, 24, 20)
        posterior, policy_scores = model(x)
        
        assert posterior.mean.shape == (batch_size, 24, 4)
        assert policy_scores.shape == (batch_size, 24)
    
    print("✓ Batch size test passed")


def test_simple_aline_gradient_flow():
    """Test that gradients flow through the model."""
    model = SimpleALINE(in_dim=20, z_dim=4)
    x = torch.randn(2, 24, 20, requires_grad=True)
    
    posterior, policy_scores = model(x)
    
    # Compute a simple loss
    loss = posterior.mean.sum() + policy_scores.sum()
    loss.backward()
    
    # Check that gradients exist
    assert x.grad is not None, "Gradients should flow to input"
    assert model.proj_in.weight.grad is not None, "Gradients should flow to projection layer"
    assert model.post_head.weight.grad is not None, "Gradients should flow to posterior head"
    assert model.policy_head.weight.grad is not None, "Gradients should flow to policy head"
    
    print("✓ Gradient flow test passed")


def test_simple_aline_custom_dimensions():
    """Test model with custom dimensions."""
    # Test with different z_dim
    model = SimpleALINE(in_dim=20, z_dim=8, d_model=128, nhead=8, nlayers=2)
    x = torch.randn(2, 24, 20)
    
    posterior, policy_scores = model(x)
    
    assert posterior.mean.shape == (2, 24, 8), "Custom z_dim should work"
    assert model.d_model == 128, "Custom d_model should be set"
    
    print("✓ Custom dimensions test passed")


if __name__ == "__main__":
    print("Running ALINE model forward pass tests...\n")
    test_simple_aline_forward_pass()
    print()
    test_simple_aline_batch_sizes()
    print()
    test_simple_aline_gradient_flow()
    print()
    test_simple_aline_custom_dimensions()
    print("\n✅ All tests passed!")
