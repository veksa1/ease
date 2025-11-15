"""
Unit tests for Active Query Policy - Ticket 007

Tests the policy utilities to ensure:
1. Priority score computation works correctly
2. Top-k selection works as expected
3. Baseline policies work correctly

Author: ALINE Team
Date: 2025-11-15
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import pytest
from models.policy_utils import (
    compute_priority_scores,
    select_topk_hours,
    evaluate_policy,
    simulate_random_policy,
    simulate_fixed_policy
)


def test_compute_priority_scores():
    """Test priority score computation."""
    torch.manual_seed(42)
    
    # Create dummy posterior
    B, T, z_dim = 2, 24, 4
    posterior_mean = torch.randn(B, T, z_dim)
    posterior_std = torch.abs(torch.randn(B, T, z_dim)) + 0.1
    
    # Migraine weights
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35])
    
    # Compute scores
    scores = compute_priority_scores(
        posterior_mean, posterior_std, migraine_weights,
        lambda1=1.0, lambda2=0.5, lambda3=0.3
    )
    
    assert scores.shape == (B, T), f"Expected shape {(B, T)}, got {scores.shape}"
    assert torch.all(scores >= 0), "Priority scores should be non-negative"
    
    print("✓ Priority score computation test passed")
    print(f"  Score shape: {scores.shape}")
    print(f"  Score range: [{scores.min():.4f}, {scores.max():.4f}]")


def test_compute_priority_scores_unbatched():
    """Test priority score computation with unbatched input."""
    torch.manual_seed(42)
    
    T, z_dim = 24, 4
    posterior_mean = torch.randn(T, z_dim)
    posterior_std = torch.abs(torch.randn(T, z_dim)) + 0.1
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35])
    
    scores = compute_priority_scores(
        posterior_mean, posterior_std, migraine_weights
    )
    
    assert scores.shape == (T,), f"Expected shape {(T,)}, got {scores.shape}"
    print("✓ Unbatched priority score test passed")


def test_select_topk_hours():
    """Test top-k hour selection."""
    torch.manual_seed(42)
    
    # Create dummy scores
    B, T = 3, 24
    scores = torch.randn(B, T)
    k = 5
    
    # Select top-k
    indices, selected_scores = select_topk_hours(scores, k, return_scores=True)
    
    assert indices.shape == (B, k), f"Expected indices shape {(B, k)}, got {indices.shape}"
    assert selected_scores.shape == (B, k), f"Expected scores shape {(B, k)}, got {selected_scores.shape}"
    
    # Verify they are actually top-k
    for i in range(B):
        sorted_scores = torch.sort(scores[i], descending=True).values
        expected_top_scores = sorted_scores[:k]
        assert torch.allclose(selected_scores[i].sort(descending=True).values, 
                            expected_top_scores.sort(descending=True).values, atol=1e-5)
    
    print("✓ Top-k selection test passed")
    print(f"  Selected indices shape: {indices.shape}")
    print(f"  Example indices: {indices[0].tolist()}")


def test_select_topk_hours_unbatched():
    """Test top-k selection with unbatched input."""
    torch.manual_seed(42)
    
    T = 24
    scores = torch.randn(T)
    k = 3
    
    indices, _ = select_topk_hours(scores, k)
    
    assert indices.shape == (k,), f"Expected shape {(k,)}, got {indices.shape}"
    print("✓ Unbatched top-k selection test passed")


def test_evaluate_policy():
    """Test policy evaluation."""
    torch.manual_seed(42)
    
    B, T, k = 2, 24, 3
    
    # Create selected indices
    selected_indices = torch.randint(0, T, (B, k))
    
    # Create ground truth: first 5 hours are important
    true_important = torch.zeros(B, T)
    true_important[:, :5] = 1.0
    
    # Evaluate
    precision = evaluate_policy(selected_indices, true_important, k)
    
    assert 0 <= precision <= 1, f"Precision should be in [0, 1], got {precision}"
    print("✓ Policy evaluation test passed")
    print(f"  Precision@{k}: {precision:.4f}")


def test_simulate_random_policy():
    """Test random policy simulation."""
    torch.manual_seed(42)
    
    T, k, batch_size = 24, 3, 5
    indices = simulate_random_policy(T, k, batch_size)
    
    assert indices.shape == (batch_size, k)
    
    # Check that indices are within valid range
    assert torch.all(indices >= 0) and torch.all(indices < T)
    
    # Check that indices are unique within each batch
    for i in range(batch_size):
        assert len(torch.unique(indices[i])) == k, "Indices should be unique"
    
    print("✓ Random policy simulation test passed")
    print(f"  Shape: {indices.shape}")
    print(f"  Example indices: {indices[0].tolist()}")


def test_simulate_fixed_policy():
    """Test fixed schedule policy simulation."""
    hours = [8, 12, 20]
    T, batch_size = 24, 3
    
    indices = simulate_fixed_policy(hours, T, batch_size)
    
    assert indices.shape == (batch_size, len(hours))
    
    # Check that all batches have the same indices
    expected = torch.tensor(hours, dtype=torch.long)
    for i in range(batch_size):
        assert torch.all(indices[i] == expected)
    
    print("✓ Fixed policy simulation test passed")
    print(f"  Fixed hours: {hours}")
    print(f"  Shape: {indices.shape}")


def test_priority_scores_deterministic():
    """Test that priority scores are deterministic given same inputs."""
    torch.manual_seed(42)
    
    T, z_dim = 24, 4
    posterior_mean = torch.randn(T, z_dim)
    posterior_std = torch.abs(torch.randn(T, z_dim)) + 0.1
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35])
    
    scores1 = compute_priority_scores(posterior_mean, posterior_std, migraine_weights)
    scores2 = compute_priority_scores(posterior_mean, posterior_std, migraine_weights)
    
    assert torch.allclose(scores1, scores2), "Scores should be deterministic"
    print("✓ Deterministic scores test passed")


def test_integration_policy_pipeline():
    """Test the full pipeline: compute scores → select top-k → evaluate."""
    torch.manual_seed(42)
    
    B, T, z_dim = 2, 24, 4
    k = 3
    
    # Generate posterior
    posterior_mean = torch.randn(B, T, z_dim)
    posterior_std = torch.abs(torch.randn(B, T, z_dim)) + 0.1
    migraine_weights = torch.tensor([0.5, 0.4, 0.45, 0.35])
    
    # Compute priority scores
    scores = compute_priority_scores(posterior_mean, posterior_std, migraine_weights)
    
    # Select top-k
    selected_indices, _ = select_topk_hours(scores, k)
    
    # Create ground truth (high scores = important)
    true_important = (scores > scores.median(dim=1, keepdim=True).values).float()
    
    # Evaluate
    precision = evaluate_policy(selected_indices, true_important, k)
    
    # With this setup, precision should be reasonably high
    assert precision > 0.3, f"Expected precision > 0.3, got {precision}"
    
    print("✓ Integration pipeline test passed")
    print(f"  Precision: {precision:.4f}")


if __name__ == "__main__":
    print("Running Active Query Policy tests...\n")
    test_compute_priority_scores()
    print()
    test_compute_priority_scores_unbatched()
    print()
    test_select_topk_hours()
    print()
    test_select_topk_hours_unbatched()
    print()
    test_evaluate_policy()
    print()
    test_simulate_random_policy()
    print()
    test_simulate_fixed_policy()
    print()
    test_priority_scores_deterministic()
    print()
    test_integration_policy_pipeline()
    print("\n✅ All policy tests passed!")
