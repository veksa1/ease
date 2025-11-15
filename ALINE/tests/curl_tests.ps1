#!/usr/bin/env pwsh
# Simple curl-based tests for ALINE Cloud Run endpoints
# Minimal dependencies - just requires curl (built into Windows)

param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceUrl = $env:ALINE_CLOUD_RUN_URL
)

if (-not $ServiceUrl) {
    Write-Host "Error: Please provide SERVICE_URL" -ForegroundColor Red
    Write-Host "Usage: .\curl_tests.ps1 https://aline-service-xxxxx.run.app"
    exit 1
}

Write-Host ""
Write-Host "=" * 80
Write-Host "ALINE Cloud Run - Simple Curl Tests"
Write-Host "=" * 80
Write-Host "Service URL: $ServiceUrl"
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing /health endpoint..." -ForegroundColor Cyan
curl -s "$ServiceUrl/health" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

# Test 2: Daily Risk (with sample data)
Write-Host "2. Testing /risk/daily endpoint..." -ForegroundColor Cyan

# Create temporary JSON file with sample data
$tempFile = New-TemporaryFile
@{
    user_id = "curl_test_user"
    features = @(
        @(7.5, 7.0, 8.0, 5.0, 8.0, 4.0, 200.0, 2.0, 7.0, 0.0, 2.0, 4.0, 2.0, 1013.25, 60.0, 5.0, 15.0, 0.0, 0.0, 10.0)
    ) * 24
} | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile.FullName -Encoding utf8

curl -s -X POST "$ServiceUrl/risk/daily" `
    -H "Content-Type: application/json" `
    -d "@$($tempFile.FullName)" | ConvertFrom-Json | ConvertTo-Json -Depth 10

Remove-Item $tempFile.FullName
Write-Host ""

# Test 3: Policy Top-K
Write-Host "3. Testing /policy/topk endpoint..." -ForegroundColor Cyan

$tempFile = New-TemporaryFile
@{
    user_id = "curl_test_user_policy"
    features = @(
        @(7.5, 7.0, 8.0, 5.0, 8.0, 4.0, 200.0, 2.0, 7.0, 0.0, 2.0, 4.0, 2.0, 1013.25, 60.0, 5.0, 15.0, 0.0, 0.0, 10.0)
    ) * 24
    k = 3
} | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile.FullName -Encoding utf8

curl -s -X POST "$ServiceUrl/policy/topk" `
    -H "Content-Type: application/json" `
    -d "@$($tempFile.FullName)" | ConvertFrom-Json | ConvertTo-Json -Depth 10

Remove-Item $tempFile.FullName
Write-Host ""

# Test 4: Calendar Connection
Write-Host "4. Testing /user/calendar endpoint..." -ForegroundColor Cyan

$tempFile = New-TemporaryFile
@{
    userId = "curl_test_calendar_user"
    calendarUrl = "https://calendar.google.com/calendar/ical/example/basic.ics"
} | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile.FullName -Encoding utf8

curl -s -X POST "$ServiceUrl/user/calendar" `
    -H "Content-Type: application/json" `
    -d "@$($tempFile.FullName)" | ConvertFrom-Json | ConvertTo-Json -Depth 10

Remove-Item $tempFile.FullName
Write-Host ""

Write-Host "=" * 80
Write-Host "All curl tests completed!"
Write-Host "=" * 80
Write-Host ""
