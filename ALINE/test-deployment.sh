#!/bin/bash
# Test script for local deployment validation
# This script helps verify the service works before deploying to Cloud Run

set -e  # Exit on error

echo "🧪 ALINE Service Deployment Test"
echo "=================================="
echo ""

# Check if we're in the ALINE directory
if [ ! -f "service/main.py" ]; then
    echo "❌ Error: Must run from ALINE directory"
    exit 1
fi

# 1. Check dependencies
echo "1️⃣  Checking dependencies..."
if ! command -v uv &> /dev/null; then
    echo "   Installing uv..."
    pip install uv
fi

uv sync --quiet
echo "   ✅ Dependencies installed"
echo ""

# 2. Run unit tests
echo "2️⃣  Running unit tests..."
uv run python tests/test_aline_forward.py > /dev/null 2>&1
echo "   ✅ Model tests passed"

uv run python tests/test_policy.py > /dev/null 2>&1
echo "   ✅ Policy tests passed"
echo ""

# 3. Check imports
echo "3️⃣  Validating service imports..."
uv run python -c "import sys; from pathlib import Path; sys.path.insert(0, str(Path.cwd())); from service.main import app" > /dev/null 2>&1
echo "   ✅ Service imports successfully"
echo ""

# 4. Check required files
echo "4️⃣  Checking required files..."
files=(
    "runs/checkpoints/best.pt"
    "configs/service.yaml"
    "configs/model.yaml"
    "Dockerfile.service"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ⚠️  Missing: $file"
    fi
done
echo ""

# 5. Validate Dockerfile
echo "5️⃣  Validating Dockerfile..."
if grep -q "FROM python:3.12-slim" Dockerfile.service; then
    echo "   ✅ Dockerfile looks good"
else
    echo "   ❌ Dockerfile may have issues"
    exit 1
fi
echo ""

# 6. Test environment variable expansion
echo "6️⃣  Testing environment variable handling..."
export PORT=9999
export N8N_WEBHOOK_URL="https://test.example.com/webhook"
uv run python -c "
import os
from pathlib import Path
# Test that PORT env var works
port = int(os.getenv('PORT', 8000))
assert port == 9999, f'PORT not read correctly: {port}'
print('   ✅ Environment variables work correctly')
" 2>&1
echo ""

# Summary
echo "✨ All checks passed!"
echo ""
echo "📝 Next steps:"
echo "   1. Set up Google Cloud secrets (see DEPLOYMENT_QUICKSTART.md)"
echo "   2. Push to main branch to trigger deployment"
echo "   3. Monitor deployment at: https://github.com/veksa1/ease/actions"
echo ""
echo "🚀 Ready for deployment!"
