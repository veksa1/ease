# ALINE Makefile
# Convenient targets for development and deployment

.PHONY: help install data train eval viz serve test test-core test-features test-all clean docker-build docker-run

# Default target
help:
	@echo "ALINE - Active Learning for Inference-driven Navigation in Episodes"
	@echo ""
	@echo "Available targets:"
	@echo "  install         - Install dependencies with uv"
	@echo "  data            - Generate synthetic training data"
	@echo "  train           - Train the ALINE model"
	@echo "  eval            - Run evaluation and generate reports"
	@echo "  viz             - Generate visualizations"
	@echo "  serve           - Start the FastAPI service"
	@echo "  test            - Run core unit tests"
	@echo "  test-features   - Run feature enhancement tests (tickets #020-026)"
	@echo "  test-all        - Run all test suites"
	@echo "  docker-build    - Build production Docker image"
	@echo "  docker-run      - Run Docker container locally"
	@echo "  clean           - Clean generated files"

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
	@echo "API Documentation: http://localhost:8000/docs"
	@echo ""
	@echo "Implemented Endpoints:"
	@echo "  - GET  /health              - Health check"
	@echo "  - POST /risk/daily          - Daily risk assessment"
	@echo "  - POST /posterior/hourly    - Hourly posterior probability"
	@echo "  - POST /policy/topk         - Top-K query recommendations"
	@echo "  - POST /user/calendar       - Calendar integration"
	@echo "  - GET  /user/calendar/{id}  - Calendar status"
	@echo "  - POST /aline/generate-context - Context generation"
	@echo "  - GET  /weather/current     - Current weather (OpenWeather API)"
	@echo "  - GET  /weather/pressure_change - Pressure change tracking"
	@echo "  - GET  /weather/forecast    - Weather forecast"
	@echo "  - POST /feedback            - User feedback submission"
	@echo "  - GET  /user/{id}/accuracy  - Model accuracy metrics"
	@echo "  - GET  /user/{id}/feedback_history - Feedback history"
	@echo ""
	@echo "Press Ctrl+C to stop"
	uv run uvicorn service.main:app --host 0.0.0.0 --port 8000

# Run unit tests
test:
	@echo "Running core unit tests..."
	uv run python tests/test_aline_forward.py
	uv run python tests/test_policy.py
	@echo "✓ Core tests passed"

# Run feature enhancement tests (Tickets #020-026)
test-features:
	@echo "Running feature enhancement test suite..."
	@echo ""
	@echo "Test Coverage:"
	@echo "  ✓ #020: Temporal Cycle Features (IMPLEMENTED)"
	@echo "  ✓ #023: OpenWeather Integration (IMPLEMENTED)"
	@echo "  ⚡ #025: Feature Expansion (PARTIAL)"
	@echo "  📋 #024: Sensor Documentation (DOCS ONLY)"
	@echo "  ⏳ #021: Per-User Weights (NOT IMPLEMENTED)"
	@echo "  ⏳ #022: Information Gain (NOT IMPLEMENTED)"
	@echo "  ⏳ #026: Feedback Loop (NOT IMPLEMENTED)"
	@echo ""
	uv run python tests/run_feature_tests.py

# Run all test suites
test-all: test test-features
	@echo ""
	@echo "✓ All test suites completed!"

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	rm -rf runs/ artifacts/ reports/
	rm -f data/synthetic_*.csv data/*.pkl data/*.json
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Cleaned"

# Build production Docker image
docker-build:
	@echo "Building production Docker image..."
	docker build -f Dockerfile.service -t aline-service:latest .
	@echo "✓ Docker image built: aline-service:latest"

# Run Docker container locally
docker-run:
	@echo "Running ALINE service in Docker container..."
	@echo "Service available at http://localhost:8080"
	docker run -p 8080:8080 \
		-e PORT=8080 \
		-e OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY} \
		aline-service:latest

# Full pipeline: data -> train -> eval -> viz
all: data train eval viz
	@echo "✓ Full pipeline complete!"
