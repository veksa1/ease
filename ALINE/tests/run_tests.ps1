#!/usr/bin/env pwsh
# Quick start script for testing ALINE Cloud Run deployment
# This script helps you set up and run the endpoint tests

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "  ALINE Cloud Run - Quick Test Setup" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

# Prompt for Cloud Run URL if not set
$cloudRunUrl = $env:ALINE_CLOUD_RUN_URL
if (-not $cloudRunUrl) {
    Write-Host "Enter your Google Cloud Run service URL:" -ForegroundColor Yellow
    Write-Host "  Example: https://aline-service-xxxxx-uc.a.run.app" -ForegroundColor Gray
    Write-Host ""
    $cloudRunUrl = Read-Host "Service URL"
    
    if (-not $cloudRunUrl) {
        Write-Host ""
        Write-Host "Error: No URL provided" -ForegroundColor Red
        exit 1
    }
    
    # Set environment variable for this session
    $env:ALINE_CLOUD_RUN_URL = $cloudRunUrl
}

Write-Host ""
Write-Host "Using service URL: $cloudRunUrl" -ForegroundColor Green
Write-Host ""

# Show menu
Write-Host "Choose test method:" -ForegroundColor Cyan
Write-Host "  1. Quick PowerShell tests (fast, simple)"
Write-Host "  2. Full pytest suite (comprehensive, detailed)"
Write-Host "  3. Both"
Write-Host ""

$choice = Read-Host "Enter choice (1, 2, or 3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Running PowerShell tests..." -ForegroundColor Cyan
        & "$PSScriptRoot\test_cloud_endpoints.ps1" $cloudRunUrl
    }
    "2" {
        Write-Host ""
        Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
        pip install -q -r "$PSScriptRoot\requirements.txt"
        
        Write-Host ""
        Write-Host "Running pytest suite..." -ForegroundColor Cyan
        pytest "$PSScriptRoot\test_cloud_run_endpoints.py" -v --color=yes
    }
    "3" {
        Write-Host ""
        Write-Host "Running PowerShell tests..." -ForegroundColor Cyan
        & "$PSScriptRoot\test_cloud_endpoints.ps1" $cloudRunUrl
        
        Write-Host ""
        Write-Host ""
        Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
        pip install -q -r "$PSScriptRoot\requirements.txt"
        
        Write-Host ""
        Write-Host "Running pytest suite..." -ForegroundColor Cyan
        pytest "$PSScriptRoot\test_cloud_run_endpoints.py" -v --color=yes
    }
    default {
        Write-Host ""
        Write-Host "Invalid choice. Please run again and select 1, 2, or 3." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""
