#!/usr/bin/env pwsh
# PowerShell script to test ALINE Google Cloud Run endpoints
# Usage: .\test_cloud_endpoints.ps1 <SERVICE_URL>

param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceUrl = $env:ALINE_CLOUD_RUN_URL
)

# Colors for output
$GREEN = "`e[32m"
$BLUE = "`e[34m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$NC = "`e[0m" # No Color

function Write-TestHeader {
    param([string]$Message)
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Check if service URL is provided
if (-not $ServiceUrl) {
    Write-Error "Please provide SERVICE_URL as parameter or set ALINE_CLOUD_RUN_URL environment variable"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\test_cloud_endpoints.ps1 https://aline-service-xxxxx.run.app"
    Write-Host "  OR"
    Write-Host "  `$env:ALINE_CLOUD_RUN_URL='https://aline-service-xxxxx.run.app'; .\test_cloud_endpoints.ps1"
    exit 1
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Blue
Write-Host "  ALINE Google Cloud Run - Endpoint Tests" -ForegroundColor Blue
Write-Host ("=" * 80) -ForegroundColor Blue
Write-Host ""
Write-Host "  Service URL: $ServiceUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Blue

# Test counter
$script:passedTests = 0
$script:failedTests = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    try {
        $url = "$ServiceUrl$Path"
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = $url
            Method = $Method
            Headers = $headers
            TimeoutSec = 30
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-WebRequest @params -UseBasicParsing
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Success "$Name - Status: $($response.StatusCode)"
            $script:passedTests++
            
            # Try to parse and display response
            try {
                $data = $response.Content | ConvertFrom-Json
                return $data
            } catch {
                return $response.Content
            }
        } else {
            Write-Error "$Name - Expected $ExpectedStatus, got $($response.StatusCode)"
            $script:failedTests++
            return $null
        }
    } catch {
        if ($_.Exception.Response.StatusCode.Value__ -eq $ExpectedStatus) {
            Write-Success "$Name - Got expected error status: $ExpectedStatus"
            $script:passedTests++
        } else {
            Write-Error "$Name - Error: $($_.Exception.Message)"
            $script:failedTests++
        }
        return $null
    }
}

# Generate sample 24-hour feature data
function Get-SampleFeatures {
    $features = @()
    for ($hour = 0; $hour -lt 24; $hour++) {
        $hourFeatures = @(
            7.5 + ($hour % 2) * 0.5,  # Sleep Duration
            7.0 + ($hour % 3),         # Sleep Quality
            8.0,                       # Sleep Consistency
            5.0 + ($hour % 4),         # Stress Level
            $(if ($hour -ge 9 -and $hour -le 17) { 8.0 } else { 0 }),  # Work Hours
            4.0 + ($hour % 3),         # Anxiety Score
            $(if ($hour -in @(7, 12, 15)) { 200.0 } else { 0 }),  # Caffeine
            $(if ($hour % 3 -eq 0) { 2.0 } else { 0 }),  # Water Intake
            7.0,                       # Meal Regularity
            $(if ($hour -eq 18) { 30.0 } else { 0 }),  # Exercise Duration
            $(if ($hour -eq 18) { 5.0 } else { 2.0 }),  # Activity Level
            4.0 + ($hour % 3),         # Neck Tension
            $(if ($hour -ge 9 -and $hour -le 22) { 2.0 } else { 0 }),  # Screen Time
            1013.25,                   # Weather Pressure
            $(if ($hour -ge 9 -and $hour -le 17) { 60.0 } else { 40.0 }),  # Noise Level
            5.0,                       # Hormone Fluctuation
            15.0,                      # Menstrual Cycle Day
            $(if ($hour -lt 18) { 0.0 } else { 1.5 }),  # Alcohol
            0.0,                       # Smoking
            $(if ($hour -eq 7) { 10.0 } else { 0 })  # Meditation
        )
        $features += ,@($hourFeatures)
    }
    return $features
}

# ============================================================================
# Test 1: Health Check
# ============================================================================
Write-TestHeader "Test 1: Health Check"

$healthData = Test-Endpoint -Name "Health Check" -Method "GET" -Path "/health"
if ($healthData) {
    Write-Host "  Status: $($healthData.status)"
    Write-Host "  Model Loaded: $($healthData.model_loaded)"
    Write-Host "  Timestamp: $($healthData.timestamp)"
}

# ============================================================================
# Test 2: Daily Risk Prediction
# ============================================================================
Write-TestHeader "Test 2: Daily Risk Prediction"

$sampleFeatures = Get-SampleFeatures
$riskPayload = @{
    user_id = "test_user_001"
    features = $sampleFeatures
}

$riskData = Test-Endpoint -Name "Daily Risk" -Method "POST" -Path "/risk/daily" -Body $riskPayload
if ($riskData) {
    Write-Host "  User ID: $($riskData.user_id)"
    Write-Host "  Mean Probability: $($riskData.mean_probability)"
    Write-Host "  90% CI: [$($riskData.lower_bound), $($riskData.upper_bound)]"
}

# ============================================================================
# Test 3: Hourly Posterior Distributions
# ============================================================================
Write-TestHeader "Test 3: Hourly Posterior Distributions"

$posteriorPayload = @{
    user_id = "test_user_002"
    features = $sampleFeatures
}

$posteriorData = Test-Endpoint -Name "Hourly Posterior" -Method "POST" -Path "/posterior/hourly" -Body $posteriorPayload
if ($posteriorData) {
    Write-Host "  User ID: $($posteriorData.user_id)"
    Write-Host "  Hours: $($posteriorData.hourly_posteriors.Count)"
    if ($posteriorData.hourly_posteriors.Count -gt 0) {
        $latentDim = $posteriorData.hourly_posteriors[0].mean.Count
        Write-Host "  Latent Dimensions: $latentDim"
    }
}

# ============================================================================
# Test 4: Policy Recommendations (Top-K)
# ============================================================================
Write-TestHeader "Test 4: Policy Recommendations (Top-K)"

$policyPayload = @{
    user_id = "test_user_003"
    features = $sampleFeatures
    k = 3
}

$policyData = Test-Endpoint -Name "Policy Top-K" -Method "POST" -Path "/policy/topk" -Body $policyPayload
if ($policyData) {
    Write-Host "  User ID: $($policyData.user_id)"
    Write-Host "  k: $($policyData.k)"
    Write-Host "  Selected Hours:"
    foreach ($hour in $policyData.selected_hours) {
        Write-Host "    Hour $($hour.hour): Priority = $($hour.priority_score)"
    }
}

# ============================================================================
# Test 5: Calendar Connection - Save
# ============================================================================
Write-TestHeader "Test 5: Calendar Connection - Save"

$calendarPayload = @{
    userId = "test_user_calendar_001"
    calendarUrl = "https://calendar.google.com/calendar/ical/example/basic.ics"
}

$calendarData = Test-Endpoint -Name "Save Calendar" -Method "POST" -Path "/user/calendar" -Body $calendarPayload
if ($calendarData) {
    Write-Host "  Status: $($calendarData.status)"
    Write-Host "  User ID: $($calendarData.userId)"
    Write-Host "  Message: $($calendarData.message)"
}

# ============================================================================
# Test 6: Calendar Connection - Get Status
# ============================================================================
Write-TestHeader "Test 6: Calendar Connection - Get Status"

$statusData = Test-Endpoint -Name "Get Calendar Status" -Method "GET" -Path "/user/calendar/test_user_calendar_001"
if ($statusData) {
    Write-Host "  Connected: $($statusData.connected)"
    Write-Host "  User ID: $($statusData.userId)"
}

# ============================================================================
# Test 7: Invalid Inputs (Error Handling)
# ============================================================================
Write-TestHeader "Test 7: Error Handling - Invalid Inputs"

# Test with wrong number of hours (should return 400)
$invalidPayload = @{
    user_id = "test_user_invalid"
    features = @(@(1.0) * 20) * 12  # Only 12 hours instead of 24
}

Test-Endpoint -Name "Invalid Features (12 hours)" -Method "POST" -Path "/risk/daily" -Body $invalidPayload -ExpectedStatus 400

# Test with invalid calendar URL
$invalidCalendarPayload = @{
    userId = "test_user_invalid_calendar"
    calendarUrl = "not-a-valid-url"
}

Test-Endpoint -Name "Invalid Calendar URL" -Method "POST" -Path "/user/calendar" -Body $invalidCalendarPayload -ExpectedStatus 400

# ============================================================================
# Test 8: Delete Calendar Connection
# ============================================================================
Write-TestHeader "Test 8: Calendar Connection - Delete"

$deleteData = Test-Endpoint -Name "Delete Calendar" -Method "DELETE" -Path "/user/calendar/test_user_calendar_001"
if ($deleteData) {
    Write-Host "  Status: $($deleteData.status)"
    Write-Host "  Message: $($deleteData.message)"
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Blue
Write-Host "  Test Summary" -ForegroundColor Blue
Write-Host ("=" * 80) -ForegroundColor Blue
Write-Host ""
Write-Host "  Total Tests: $($script:passedTests + $script:failedTests)" -ForegroundColor Cyan
Write-Success "Passed: $($script:passedTests)"

if ($script:failedTests -gt 0) {
    Write-Error "Failed: $($script:failedTests)"
} else {
    Write-Host "  Failed: $($script:failedTests)" -ForegroundColor Gray
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Blue

if ($script:failedTests -eq 0) {
    Write-Host ""
    Write-Success "All tests passed! 🎉"
    Write-Host ""
    exit 0
} else {
    Write-Host ""
    Write-Error "Some tests failed."
    Write-Host ""
    exit 1
}
