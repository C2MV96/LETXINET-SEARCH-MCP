# ============================================================
# RUN ALL - Master orchestrator for all country tests
# Usage: .\run_all.ps1 [-Country peru|brasil|mexico|...] [-TestOnly] [-DryRun]
# ============================================================

param(
    [string]$Country = "all",
    [switch]$TestOnly = $false,
    [switch]$DryRun = $false,
    [int]$TimeoutSec = 4,
    [string]$ProjectRoot = "d:\OTROS\LETXIPU-SEARCH-MCP-V7"
)

$SkillRoot = "$ProjectRoot\.agents\skills\automejora"
$DSpaceFile = "$ProjectRoot\src\scraping\dspace-resolver.ts"

Write-Host "============================================================"
Write-Host "  LETXIPU AUTO-MEJORA - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "  Country: $Country | TestOnly: $TestOnly | DryRun: $DryRun"
Write-Host "============================================================"

$countries = @{
    global    = "$SkillRoot\global\test_global.ps1"
    peru      = "$ProjectRoot\.agents\skills\source-tester\scripts\test_all_sources.ps1"
    brasil    = "$SkillRoot\brasil\test_brasil.ps1"
    mexico    = "$SkillRoot\mexico\test_mexico.ps1"
    argentina = "$SkillRoot\argentina\test_argentina.ps1"
    chile     = "$SkillRoot\chile\test_chile.ps1"
    colombia  = "$SkillRoot\colombia\test_colombia.ps1"
    ecuador   = "$SkillRoot\ecuador\test_ecuador.ps1"
}

$toRun = @()
if ($Country -eq "all") {
    $toRun = @($countries.Keys | Sort-Object)
}
elseif ($countries.ContainsKey($Country)) {
    $toRun = @($Country)
}
else {
    Write-Host "ERROR: Unknown country '$Country'. Options: $($countries.Keys -join ', ')"
    exit 1
}

# PHASE 1: Run Tests
$globalSummary = @{ total=0; working=0; countries_tested=0; countries_ok=0 }

foreach ($c in $toRun) {
    $script = $countries[$c]
    if (-not (Test-Path $script)) {
        Write-Host "`n[SKIP] $c - script not found"
        continue
    }

    Write-Host "`n========================================"
    Write-Host "  TESTING: $($c.ToUpper())"
    Write-Host "========================================"

    & powershell -ExecutionPolicy Bypass -File $script -TimeoutSec $TimeoutSec
    $globalSummary.countries_tested++

    $resultsFile = ""
    if ($c -eq "peru") {
        $resultsFile = "$ProjectRoot\.agents\skills\source-tester\references\last_test_results.json"
    }
    else {
        $resultsFile = "$SkillRoot\$c\last_results.json"
    }

    if (Test-Path $resultsFile) {
        $data = Get-Content $resultsFile -Raw | ConvertFrom-Json
        if ($data.summary) {
            $globalSummary.total += $data.summary.total_tested
            $globalSummary.working += $data.summary.working
            if ($data.summary.working -gt 0) { $globalSummary.countries_ok++ }
        }
    }
}

# PHASE 2: Auto-improve (if not TestOnly)
if (-not $TestOnly) {
    Write-Host "`n========================================"
    Write-Host "  AUTO-IMPROVE PHASE"
    Write-Host "========================================"

    $newRepos = @()
    $dspaceContent = ""
    if (Test-Path $DSpaceFile) { $dspaceContent = Get-Content $DSpaceFile -Raw }

    foreach ($c in $toRun) {
        if ($c -eq "global") { continue }

        $resultsFile = ""
        if ($c -eq "peru") {
            $resultsFile = "$ProjectRoot\.agents\skills\source-tester\references\last_test_results.json"
        }
        else {
            $resultsFile = "$SkillRoot\$c\last_results.json"
        }

        if (-not (Test-Path $resultsFile)) { continue }
        $data = Get-Content $resultsFile -Raw | ConvertFrom-Json

        $repos = @()
        if ($data.repos) { $repos = $data.repos }
        elseif ($data.peru_universities) { $repos = $data.peru_universities }

        foreach ($r in $repos) {
            if ($r.status -match "working" -and $r.url) {
                $domain = ($r.url -split '/')[2]
                if ($domain -and -not ($dspaceContent -match [regex]::Escape($domain))) {
                    $newRepos += @{ name=$r.name; domain=$domain; country=$c; latency=$r.latency }
                }
            }
        }
    }

    if ($newRepos.Count -gt 0) {
        Write-Host "  Found $($newRepos.Count) NEW repos to add:"
        $byCountry = $newRepos | Group-Object { $_.country }
        foreach ($g in $byCountry) {
            Write-Host "    $($g.Name): $($g.Count) repos"
        }

        if (-not $DryRun) {
            $lines = @(Get-Content $DSpaceFile)
            $insertLine = -1
            for ($i = $lines.Count - 1; $i -ge 0; $i--) {
                if ($lines[$i].Trim() -eq '];' -and $i -gt 20) {
                    $insertLine = $i
                    break
                }
            }

            if ($insertLine -gt 0) {
                $newLines = @()
                foreach ($g in $byCountry) {
                    $countryName = $g.Name.ToUpper()
                    $ts = Get-Date -Format "MMM yyyy"
                    $newLines += "    // -- $countryName (auto-discovered $ts) --"
                    foreach ($nr in $g.Group) {
                        $pfx = $nr.name.ToUpper()
                        $newLines += "    { name: '$($nr.name)', domain: '$($nr.domain)', handlePrefix: '$pfx', bitstreamPattern: 'standard' },"
                    }
                }

                $before = $lines[0..($insertLine-1)]
                $after = $lines[$insertLine..($lines.Count-1)]
                $allLines = $before + $newLines + $after
                $allLines | Set-Content $DSpaceFile -Encoding UTF8
                Write-Host "  [OK] Added $($newRepos.Count) repos to dspace-resolver.ts"

                Write-Host "`n  Building..."
                Push-Location $ProjectRoot
                npm run build 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  [OK] Build successful"
                }
                else {
                    Write-Host "  [FAIL] Build failed - rolling back"
                    git checkout -- $DSpaceFile 2>&1 | Out-Null
                    npm run build 2>&1 | Out-Null
                }
                Pop-Location
            }
        }
        else {
            Write-Host "  [DRY RUN] Would add $($newRepos.Count) repos"
        }
    }
    else {
        Write-Host "  No new repos to add"
    }
}

# FINAL REPORT
Write-Host "`n============================================================"
Write-Host "  FINAL REPORT"
Write-Host "============================================================"
Write-Host "  Countries tested: $($globalSummary.countries_tested)"
Write-Host "  Countries OK:     $($globalSummary.countries_ok)"
Write-Host "  Total sources:    $($globalSummary.total)"
$pct = if ($globalSummary.total -gt 0) { [Math]::Round($globalSummary.working / $globalSummary.total * 100) } else { 0 }
Write-Host "  Total working:    $($globalSummary.working) ($pct%)"
Write-Host "============================================================"
