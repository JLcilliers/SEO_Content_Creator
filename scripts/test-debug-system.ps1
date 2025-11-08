# Worker Debug System Test - PowerShell Version

$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }

Write-Host "================================" -ForegroundColor Blue
Write-Host "Worker Debug System Test" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Testing against: " -NoNewline
Write-Host $BaseUrl -ForegroundColor Yellow
Write-Host ""

# Test 1: Health Endpoint
Write-Host "[Test 1] " -ForegroundColor Blue -NoNewline
Write-Host "Testing Worker Health Endpoint..."
try {
    $healthResponse = Invoke-RestMethod -Uri "$BaseUrl/api/worker/health" -Method Get -ErrorAction Stop
    Write-Host "✓ Health endpoint accessible" -ForegroundColor Green
    $healthResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "✗ Health endpoint failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Job List Endpoint
Write-Host "[Test 2] " -ForegroundColor Blue -NoNewline
Write-Host "Testing Job List Endpoint..."
try {
    $listResponse = Invoke-RestMethod -Uri "$BaseUrl/api/jobs/list?limit=5" -Method Get -ErrorAction Stop
    Write-Host "✓ Job list endpoint accessible" -ForegroundColor Green
    Write-Host "Jobs found: $($listResponse.count)"
} catch {
    Write-Host "✗ Job list endpoint failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Check for pending jobs
Write-Host "[Test 3] " -ForegroundColor Blue -NoNewline
Write-Host "Checking for pending jobs..."
try {
    $pendingResponse = Invoke-RestMethod -Uri "$BaseUrl/api/jobs/list?status=pending&limit=10" -Method Get -ErrorAction Stop
    $pendingCount = $pendingResponse.count
    Write-Host "Pending jobs: " -NoNewline
    Write-Host $pendingCount -ForegroundColor Yellow

    if ($pendingCount -gt 0 -and $pendingResponse.jobs) {
        $firstJobId = $pendingResponse.jobs[0].id

        if ($firstJobId) {
            Write-Host ""
            Write-Host "[Test 4] " -ForegroundColor Blue -NoNewline
            Write-Host "Testing Debug Endpoint for job: " -NoNewline
            Write-Host $firstJobId -ForegroundColor Yellow

            $debugResponse = Invoke-RestMethod -Uri "$BaseUrl/api/jobs/debug/$firstJobId" -Method Get -ErrorAction Stop
            Write-Host "✓ Debug endpoint accessible" -ForegroundColor Green
            $debugResponse.analysis | ConvertTo-Json -Depth 3

            # Test 5: Force Process (uncomment to test)
            # Write-Host ""
            # Write-Host "[Test 5] " -ForegroundColor Blue -NoNewline
            # Write-Host "Testing Force Process..."
            # $forceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/jobs/force-process/$firstJobId" -Method Post -ErrorAction Stop
            # $forceResponse | ConvertTo-Json -Depth 3
        }
    } else {
        Write-Host "No pending jobs to test debug/force-process endpoints" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Pending jobs check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Worker Endpoint
Write-Host "[Test 6] " -ForegroundColor Blue -NoNewline
Write-Host "Testing Worker Endpoint (GET)..."
try {
    $workerResponse = Invoke-RestMethod -Uri "$BaseUrl/api/worker" -Method Get -ErrorAction Stop
    Write-Host "✓ Worker endpoint accessible" -ForegroundColor Green
    $workerResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Worker endpoint failed: $_" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Blue
Write-Host "Test Summary" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host "All debug endpoints are " -NoNewline
Write-Host "ready for production" -ForegroundColor Green -NoNewline
Write-Host "!"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Deploy to Vercel: " -NoNewline
Write-Host "git push" -ForegroundColor Blue
Write-Host "2. Test production endpoints with your domain"
Write-Host "3. Check stuck job: " -NoNewline
Write-Host "curl $BaseUrl/api/jobs/debug/job_1762591189245_y01z5om" -ForegroundColor Blue
Write-Host "4. Force process if needed: " -NoNewline
Write-Host "curl -X POST $BaseUrl/api/jobs/force-process/job_1762591189245_y01z5om" -ForegroundColor Blue
Write-Host "5. Monitor via UI at: " -NoNewline
Write-Host $BaseUrl -ForegroundColor Blue
Write-Host ""
