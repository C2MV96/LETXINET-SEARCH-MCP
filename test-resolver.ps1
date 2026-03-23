function Test-MCP {
    param([string]$TestName, [string]$Source)
    
    Write-Host "---------------------------------------------"
    Write-Host "TEST: $TestName"
    Write-Host "Source: $Source"
    Write-Host "Sending..."

    $body = @{
        jsonrpc = "2.0"
        id = 1
        method = "tools/call"
        params = @{
            name = "analyze_academic"
            arguments = @{ source = $Source }
        }
    } | ConvertTo-Json -Depth 5

    $start = Get-Date
    try {
        $result = Invoke-RestMethod -Uri http://localhost:4000/api/mcp -Method POST -ContentType "application/json" -Body $body -TimeoutSec 180
        $elapsed = ((Get-Date) - $start).TotalSeconds
        $json = $result.result.content[0].text | ConvertFrom-Json

        if ($json.success -eq $true) {
            Write-Host "[OK] SUCCESS" -ForegroundColor Green
            Write-Host "  Type:     $($json.data.documentType)"
            Write-Host "  Language: $($json.data.language)"
            Write-Host "  Pages:    $($json.data.pages)"
            Write-Host "  Words:    $($json.data.totalWords)"
            Write-Host "  Sections: $($json.data.summary.totalSections)"
            Write-Host "  Stats:    $($json.data.summary.totalStatisticalItems) items"
            Write-Host "  Time:     $([math]::Round($elapsed, 1))s"
        } else {
            Write-Host "[FAIL] Could not get PDF" -ForegroundColor Red
            $errLines = $json.error -split "`n"
            foreach ($line in $errLines) {
                Write-Host "  $line"
            }
            Write-Host "  Time:  $([math]::Round($elapsed, 1))s"
        }
    } catch {
        $elapsed = ((Get-Date) - $start).TotalSeconds
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Time: $([math]::Round($elapsed, 1))s"
    }
    Write-Host ""
}

Write-Host ""
Write-Host "=== PDF Resolver Test Suite v1.1 (9 sources) ==="
Write-Host ""

Test-MCP -TestName "1. Sandbox Path (Claude upload)" -Source "/mnt/user-data/uploads/moharramnejad2019.pdf"

Test-MCP -TestName "2. Direct DOI (PLOS ONE open access)" -Source "10.1371/journal.pone.0185809"

Test-MCP -TestName "3. arXiv PDF URL (direct download)" -Source "https://arxiv.org/pdf/2301.00774.pdf"

Write-Host "=== All tests complete ==="
