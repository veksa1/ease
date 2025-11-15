# ALINE Makefile - Ticket 012
# Convenient targets for development and deployment

.PHONY: help install data train eval viz serve test clean

# Default target
help:
	@echo "ALINE - Active Learning for Inference-driven Navigation in Episodes"
	@echo ""
	@echo "Available targets:"
	@echo "  install    - Install dependencies with uv"
	@echo "  data       - Generate synthetic training data"
	@echo "  train      - Train the ALINE model"
	@echo "  eval       - Run evaluation and generate reports"
	@echo "  viz        - Generate visualizations"
	@echo "  serve      - Start the FastAPI service"
	@echo "  test       - Run unit tests"
	@echo "  clean      - Clean generated files"

# Install dependencies
install:
	@echo "Installing dependencies with uv..."
	uv sync
	@echo "✓ Dependencies installed"

# Generate synthetic data
data:
	@echo "Generating synthetic migraine data..."
	uv run python scripts/generate_mock_distribution.py
	uv run python scripts/augment_features.py
	uv run python scripts/simulator.py
	@echo "✓ Data generated"

# Train the model
train:
	@echo "Training ALINE model..."
	uv run python scripts/train_aline.py
	@echo "✓ Training complete"

# Run evaluation
eval:
	@echo "Running evaluation..."
	uv run python scripts/eval.py
	@echo "✓ Evaluation complete"

# Generate visualizations
viz:
	@echo "Generating visualizations..."
	uv run python scripts/test_visualization.py
	@echo "✓ Visualizations generated"

# Start the FastAPI service
serve:
	@echo "Starting ALINE service on http://localhost:8000..."
	@echo "Press Ctrl+C to stop"
	uv run uvicorn service.main:app --host 0.0.0.0 --port 8000

# Run unit tests
test:
	@echo "Running unit tests..."
	uv run python tests/test_aline_forward.py
	uv run python tests/test_policy.py
	@echo "✓ All tests passed"

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	rm -rf runs/ artifacts/ reports/
	rm -f data/synthetic_*.csv data/*.pkl data/*.json
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Cleaned"

# Full pipeline: data -> train -> eval -> viz
all: data train eval viz
	@echo "✓ Full pipeline complete!"
