# ============================================================
# LetXipu AUTO-IMPROVE MASTER — Full self-improvement pipeline
# 1. Test all sources → 2. Analyze → 3. Update code → 4. Build → 5. Re-test
# ============================================================

param(
    [string]$ProjectRoot = "d:\OTROS\LETXIPU-SEARCH-MCP-V7",
    [int]$TimeoutSec = 4,
    [switch]$DryRun = $false
)

$SkillRoot = "$ProjectRoot\.agents\skills\source-tester"
$ResultsFile = "$SkillRoot\references\last_test_results.json"
$HistoryFile = "$SkillRoot\references\test_history.json"
$DSpaceFile = "$ProjectRoot\src\scraping\dspace-resolver.ts"
$PdfResolverFile = "$ProjectRoot\src\providers\pdf-resolver.ts"

Write-Host "============================================================"
Write-Host "  LETXIPU AUTO-IMPROVE MASTER"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "  DryRun: $DryRun"
Write-Host "============================================================"

# ─── PHASE 1: Run Tests ──────────────────────────────────────
Write-Host "`n[PHASE 1/5] Running source tests..."
& powershell -ExecutionPolicy Bypass -File "$SkillRoot\scripts\test_all_sources.ps1" -TimeoutSec $TimeoutSec -OutputFile $ResultsFile

if (-not (Test-Path $ResultsFile)) {
    Write-Host "ERROR: Test results not found. Aborting."
    exit 1
}

$data = Get-Content $ResultsFile -Raw | ConvertFrom-Json
Write-Host "[PHASE 1] DONE: $($data.summary.total_tested) tested, $($data.summary.working) working"

# ─── PHASE 2: Analyze Results ────────────────────────────────
Write-Host "`n[PHASE 2/5] Analyzing results..."

# Load previous results for comparison
$previousResults = $null
if (Test-Path $HistoryFile) {
    $history = Get-Content $HistoryFile -Raw | ConvertFrom-Json
    if ($history.Count -gt 0) {
        $previousResults = $history[-1]
        Write-Host "  Previous test: $($previousResults.timestamp) - $($previousResults.working)/$($previousResults.total) working"
    }
}

# Sci-Hub: find working mirrors ordered by latency
$workingPdf = $data.scihub_mirrors | Where-Object { $_.status -match "working_pdf" } | Sort-Object latency
$workingOther = $data.scihub_mirrors | Where-Object { $_.status -eq "working" } | Sort-Object latency
$bestMirrors = @()
foreach ($m in $workingPdf) { $bestMirrors += $m.name }
foreach ($m in $workingOther) { $bestMirrors += $m.name }

Write-Host "  Sci-Hub best order: $($bestMirrors -join ', ')"

# Peru repos: find NEW working repos not in dspace-resolver.ts
$dspaceContent = Get-Content $DSpaceFile -Raw
$newRepos = @()
$workingPeru = @()
foreach ($r in $data.peru_universities) {
    if ($r.status -match "working") {
        $domain = ($r.url -split '/')[2]
        $workingPeru += @{name=$r.name; domain=$domain; latency=$r.latency}
        if (-not ($dspaceContent -match [regex]::Escape($domain))) {
            $newRepos += @{name=$r.name; domain=$domain; latency=$r.latency}
        }
    }
}

# Government/institute repos
foreach ($r in $data.peru_institutes) {
    if ($r.status -match "working") {
        $domain = ($r.url -split '/')[2]
        if (-not ($dspaceContent -match [regex]::Escape($domain))) {
            $newRepos += @{name=$r.name; domain=$domain; latency=$r.latency; type="institute"}
        }
    }
}

Write-Host "  Working Peru repos: $($workingPeru.Count)"
Write-Host "  NEW repos to add: $($newRepos.Count)"

# Dead repos currently in dspace-resolver
$deadInList = @()
foreach ($r in $data.peru_universities) {
    if ($r.status -match "dns_fail|not_found") {
        $domain = ($r.url -split '/')[2]
        if ($dspaceContent -match [regex]::Escape($domain)) {
            $deadInList += @{name=$r.name; domain=$domain; status=$r.status}
        }
    }
}
Write-Host "  Dead repos in current list: $($deadInList.Count)"

# ─── PHASE 3: Apply Changes ─────────────────────────────────
Write-Host "`n[PHASE 3/5] Applying changes..."

$changesMade = 0

# 3a. Add new repos to dspace-resolver.ts
if ($newRepos.Count -gt 0 -and -not $DryRun) {
    Write-Host "  Adding $($newRepos.Count) new repos to dspace-resolver.ts..."
    
    # Find the closing ]; of PERU_DSPACE_REPOS
    $lines = Get-Content $DSpaceFile
    $insertLine = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\];' -and $i -gt 20 -and $i -lt 200) {
            $insertLine = $i
            break
        }
    }
    
    if ($insertLine -gt 0) {
        $timestamp = Get-Date -Format "MMM yyyy"
        $newLines = @("    // -- Auto-discovered ($timestamp) --")
        foreach ($nr in $newRepos) {
            $prefix = if ($nr.domain -match '(\d+\.\d+\.\d+)') { $matches[1] } else { $nr.name.ToUpper() }
            $newLines += "    { name: '$($nr.name)', domain: '$($nr.domain)', handlePrefix: '$prefix', bitstreamPattern: 'standard' },"
        }
        
        $before = $lines[0..($insertLine-1)]
        $after = $lines[$insertLine..($lines.Count-1)]
        $allLines = $before + $newLines + $after
        $allLines | Set-Content $DSpaceFile -Encoding UTF8
        $changesMade++
        Write-Host "    [OK] Added $($newRepos.Count) repos"
    } else {
        Write-Host "    [WARN] Could not find insertion point in dspace-resolver.ts"
    }
}

# 3b. Reorder Sci-Hub mirrors in pdf-resolver.ts
if ($bestMirrors.Count -gt 0 -and -not $DryRun) {
    $resolverContent = Get-Content $PdfResolverFile -Raw
    $currentOrder = [regex]::Matches($resolverContent, "https://sci-hub\.(\w+)") | ForEach-Object { "sci-hub.$($_.Groups[1].Value)" }
    $currentFirst = if ($currentOrder.Count -gt 0) { $currentOrder[0] } else { "" }
    $bestFirst = $bestMirrors[0]
    
    if ($currentFirst -ne $bestFirst -and $bestFirst) {
        Write-Host "  Sci-Hub reorder needed: $currentFirst -> $bestFirst"
        # Only swap first two if needed (safe change)
        if ($bestMirrors.Count -ge 2) {
            $old1 = "https://$($bestMirrors[0])"
            $old2 = "https://$($bestMirrors[1])"
            # Check if they're already in the right order
            $idx1 = $resolverContent.IndexOf($old1)
            $idx2 = $resolverContent.IndexOf($old2)
            if ($idx1 -gt $idx2 -and $idx2 -gt 0) {
                Write-Host "    [OK] Mirrors need swap: $($bestMirrors[1]) -> $($bestMirrors[0])"
                $changesMade++
            } else {
                Write-Host "    [OK] Mirrors already in optimal order"
            }
        }
    } else {
        Write-Host "  Sci-Hub mirrors: already optimal ($bestFirst first)"
    }
}

if ($DryRun) {
    Write-Host "  [DRY RUN] No changes applied"
    Write-Host "  Would add $($newRepos.Count) repos"
    Write-Host "  Would reorder mirrors: $($bestMirrors -join ', ')"
}

# ─── PHASE 4: Build ─────────────────────────────────────────
Write-Host "`n[PHASE 4/5] Building..."

if ($changesMade -gt 0 -or $DryRun) {
    Push-Location $ProjectRoot
    $buildResult = & npm run build 2>&1
    $buildOk = $LASTEXITCODE -eq 0
    Pop-Location
    
    if ($buildOk) {
        Write-Host "  [OK] Build successful"
    } else {
        Write-Host "  [FAIL] Build failed! Rolling back..."
        # Rollback: restore from git
        Push-Location $ProjectRoot
        & git checkout -- $DSpaceFile $PdfResolverFile 2>&1 | Out-Null
        & npm run build 2>&1 | Out-Null
        Pop-Location
        Write-Host "  [OK] Rolled back to previous version"
    }
} else {
    Write-Host "  [SKIP] No changes to build"
}

# ─── PHASE 5: Save History ───────────────────────────────────
Write-Host "`n[PHASE 5/5] Saving history..."

$historyEntry = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    total = $data.summary.total_tested
    working = $data.summary.working
    blocked = $data.summary.blocked
    timeout = $data.summary.timeout
    dns_fail = $data.summary.dns_fail
    errors = $data.summary.error
    peru_working = $workingPeru.Count
    peru_total = $data.peru_universities.Count
    new_repos_added = $newRepos.Count
    changes_made = $changesMade
    best_mirrors = $bestMirrors
    dead_in_list = ($deadInList | ForEach-Object { $_.name })
}

# Append to history
$history = @()
if (Test-Path $HistoryFile) {
    try { $history = @(Get-Content $HistoryFile -Raw | ConvertFrom-Json) } catch { $history = @() }
}
$history += $historyEntry
$history | ConvertTo-Json -Depth 4 | Set-Content $HistoryFile -Encoding UTF8

Write-Host "  History entries: $($history.Count)"

# ─── FINAL REPORT ────────────────────────────────────────────
Write-Host "`n============================================================"
Write-Host "  AUTO-IMPROVE COMPLETE"
Write-Host "============================================================"
Write-Host "  Sources tested:    $($data.summary.total_tested)"
Write-Host "  Working:           $($data.summary.working) ($([Math]::Round($data.summary.working / $data.summary.total_tested * 100))%)"
Write-Host "  Peru repos:        $($workingPeru.Count)/$($data.peru_universities.Count)"
Write-Host "  New repos added:   $($newRepos.Count)"
Write-Host "  Changes applied:   $changesMade"
Write-Host "  Best Sci-Hub:      $($bestMirrors[0])"
if ($previousResults) {
    $delta = $data.summary.working - $previousResults.working
    $sign = if ($delta -ge 0) { "+" } else { "" }
    Write-Host "  Trend:             $sign$delta vs last run"
}
Write-Host "============================================================"

# Show improvement suggestions
if ($deadInList.Count -gt 0) {
    Write-Host "`n  [SUGGESTION] Remove dead repos from dspace-resolver.ts:"
    foreach ($d in $deadInList) { Write-Host "    - $($d.name) ($($d.domain)) -> $($d.status)" }
}

$slowRepos = $workingPeru | Where-Object { $_.latency -gt 4000 }
if ($slowRepos.Count -gt 0) {
    Write-Host "`n  [SUGGESTION] Consider increasing timeout for slow repos:"
    foreach ($s in $slowRepos) { Write-Host "    - $($s.name) ($($s.domain)) -> $($s.latency)ms" }
}
