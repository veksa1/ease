#!/bin/bash
# ALINE Cloud Deployment Script
# Run this on your cloud instance after uploading the project

set -e  # Exit on error

echo "🚀 ALINE Cloud Deployment Starting..."

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Please install Docker first."; exit 1; }
command -v nvidia-smi >/dev/null 2>&1 || { echo "⚠️  Warning: nvidia-smi not found. GPU may not be available."; }

# Verify GPU
echo "🔍 Checking GPU..."
nvidia-smi || echo "⚠️  GPU check failed, continuing anyway..."

# Build container
echo "🔨 Building Docker container..."
docker compose build

# Start services
echo "▶️  Starting JupyterLab..."
docker compose up -d

# Wait for healthcheck
echo "⏳ Waiting for JupyterLab to start..."
sleep 10

# Show logs and token
echo "📋 JupyterLab logs (last 20 lines):"
docker compose logs --tail 20 jupyter

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Access JupyterLab at: http://$(curl -s ifconfig.me):8888"
echo "   Or via SSH tunnel: ssh -L 8888:localhost:8888 root@$(curl -s ifconfig.me)"
echo ""
echo "🔑 Get the Jupyter token with:"
echo "   docker compose logs jupyter | grep token"
echo ""
echo "📊 Monitor GPU usage with:"
echo "   watch -n 1 nvidia-smi"
echo ""
echo "🛑 Stop with:"
echo "   docker compose down"
