# ============================================================
# LetXipu Auto-Improver - Reads test results and updates configs
# Run AFTER test_all_sources.ps1
# ============================================================

param(
    [string]$ResultsFile = "$PSScriptRoot\..\references\last_test_results.json",
    [string]$ProjectRoot = "d:\OTROS\LETXIPU-SEARCH-MCP-V7"
)

if (-not (Test-Path $ResultsFile)) {
    Write-Host "ERROR: No results file found at $ResultsFile"
    Write-Host "Run test_all_sources.ps1 first."
    exit 1
}

$data = Get-Content $ResultsFile -Raw | ConvertFrom-Json
Write-Host "=== AUTO-IMPROVER - Reading results from $($data.timestamp) ==="

# 1. Sci-Hub Mirror Analysis
Write-Host "`n--- Sci-Hub Mirror Analysis ---"
$workingPdf = $data.scihub_mirrors | Where-Object { $_.status -match "working_pdf" } | Sort-Object latency
$workingOther = $data.scihub_mirrors | Where-Object { $_.status -eq "working" } | Sort-Object latency
$dead = $data.scihub_mirrors | Where-Object { $_.status -match "blocked|dns_fail|not_found|error|timeout" }

Write-Host "  Working (PDF confirmed): $($workingPdf.Count)"
foreach ($m in $workingPdf) { Write-Host "    [PDF] $($m.name) - $($m.latency)ms" }
Write-Host "  Working (no PDF): $($workingOther.Count)"
foreach ($m in $workingOther) { Write-Host "    [OK]  $($m.name) - $($m.latency)ms" }
Write-Host "  Dead/Blocked: $($dead.Count)"
foreach ($m in $dead) { Write-Host "    [X]   $($m.name) - $($m.status)" }

$orderedMirrors = @()
foreach ($m in $workingPdf) { $orderedMirrors += "https://$($m.name)" }
foreach ($m in $workingOther) { $orderedMirrors += "https://$($m.name)" }
foreach ($m in $dead) { if ($m.status -ne "dns_fail" -and $m.status -ne "not_found_404") { $orderedMirrors += "https://$($m.name)" } }

Write-Host "`n  Recommended mirror order:"
$orderedMirrors | ForEach-Object { Write-Host "    $_" }

# 2. Peru DSpace Analysis
Write-Host "`n--- Peru University DSpace Analysis ---"
$workingRepos = $data.peru_universities | Where-Object { $_.status -match "working" }
$failedRepos = $data.peru_universities | Where-Object { $_.status -notmatch "working" }

Write-Host "  Working: $($workingRepos.Count)/$($data.peru_universities.Count)"
foreach ($r in $workingRepos) { Write-Host "    [OK] $($r.name) - $($r.latency)ms" }
Write-Host "  Failed: $($failedRepos.Count)"
foreach ($r in $failedRepos) { Write-Host "    [X]  $($r.name) - $($r.status)" }

$knownDomains = @('pucp','unmsm','unsa','unsaac','usmp','continental','unac','uncp','unprg','usil','upc','ulima','renati')
$newRepos = @()
foreach ($r in $workingRepos) {
    $domain = ($r.url -split '/')[2]
    $isKnown = $false
    foreach ($k in $knownDomains) { if ($domain -match $k) { $isKnown = $true; break } }
    if (-not $isKnown) { $newRepos += $r }
}

if ($newRepos.Count -gt 0) {
    Write-Host "`n  NEW repos to add to dspace-resolver.ts:"
    foreach ($r in $newRepos) {
        $domain = ($r.url -split '/')[2]
        Write-Host "    + $($r.name) -> $domain"
    }
}

# 3. LATAM analysis
Write-Host "`n--- LATAM Repository Analysis ---"
$workingLatam = $data.latam_repos | Where-Object { $_.status -match "working" }
$failedLatam = $data.latam_repos | Where-Object { $_.status -notmatch "working" }
Write-Host "  Working: $($workingLatam.Count)/$($data.latam_repos.Count)"
foreach ($r in $workingLatam) { Write-Host "    [OK] $($r.name) - $($r.latency)ms" }
foreach ($r in $failedLatam) { Write-Host "    [X]  $($r.name) - $($r.status)" }

# 4. International
Write-Host "`n--- International Sources ---"
$workingIntl = $data.international | Where-Object { $_.status -match "working" }
$failedIntl = $data.international | Where-Object { $_.status -notmatch "working" }
Write-Host "  Working: $($workingIntl.Count)/$($data.international.Count)"
foreach ($r in $failedIntl) { Write-Host "    [X]  $($r.name) - $($r.status)" }

# 5. Save improvement report
$report = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    based_on_test = $data.timestamp
    recommended_mirror_order = $orderedMirrors
    working_peru_count = $workingRepos.Count
    total_peru = $data.peru_universities.Count
    new_repos_to_add = @()
    failed_sources = @()
    actions = @()
}

foreach ($r in $newRepos) {
    $domain = ($r.url -split '/')[2]
    $report.new_repos_to_add += @{name=$r.name; domain=$domain; latency=$r.latency}
}
foreach ($r in ($failedRepos + $failedLatam)) {
    $report.failed_sources += @{name=$r.name; status=$r.status}
}
$report.actions += "Update SCIHUB_MIRRORS order in pdf-resolver.ts"
$report.actions += "Add $($newRepos.Count) new repos to dspace-resolver.ts"
$report.actions += "Review $($failedRepos.Count) failed Peru repos"
$report.actions += "Review $($failedLatam.Count) failed LATAM repos"

$reportFile = "$PSScriptRoot\..\references\improvement_report.json"
$report | ConvertTo-Json -Depth 4 | Set-Content -Path $reportFile -Encoding UTF8

Write-Host "`n============================================================"
Write-Host "  IMPROVEMENT REPORT SAVED: $reportFile"
Write-Host "============================================================"
Write-Host "  Actions:"
foreach ($a in $report.actions) { Write-Host "    -> $a" }
