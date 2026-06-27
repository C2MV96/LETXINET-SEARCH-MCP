# Test Chile â€” 16 repos
param([int]$TimeoutSec = 5)
. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n=== CHILE REPOSITORIES ==="
$summary = New-Summary
$results = @()
$repos = @(
    @('UChile', 'https://repositorio.uchile.cl'),
    @('PUC-Chile', 'https://repositorio.uc.cl'),
    @('SciELO-Chile', 'https://www.scielo.cl'),
    @('USACH', 'https://repositorio.usach.cl'),
    @('UdeC', 'https://repositorio.udec.cl'),
    @('UTFSM', 'https://repositorio.utfsm.cl'),
    @('UAI', 'https://repositorio.uai.cl'),
    @('UDP', 'https://repositorio.udp.cl'),
    @('UCN', 'https://repositorio.ucn.cl'),
    @('UACh', 'https://cybertesis.uach.cl'),
    @('UFRO', 'https://repositorio.ufrontera.cl'),
    @('UBB', 'https://repositorio.ubiobio.cl'),
    @('UMAG', 'https://repositorio.umag.cl'),
    @('UTEM', 'https://repositorio.utem.cl'),
    @('UCT', 'https://repositorio.uct.cl'),
    @('ANID', 'https://repositorio.anid.cl')
)
foreach ($r in $repos) { $results += Test-Source $r[0] $r[1] "chile" "html" $TimeoutSec ([ref]$summary) }
Save-Results "$PSScriptRoot\last_results.json" $results $summary "Chile"
Write-Host "  Chile: $($summary.working)/$($summary.total_tested) working"

