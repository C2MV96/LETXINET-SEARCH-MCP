# Test Ecuador â€” 13 repos
param([int]$TimeoutSec = 5)
. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n=== ECUADOR REPOSITORIES ==="
$summary = New-Summary
$results = @()
$repos = @(
    @('RRAAE', 'https://rraae.cedia.edu.ec'),
    @('ESPOL', 'https://www.dspace.espol.edu.ec'),
    @('PUCE', 'http://repositorio.puce.edu.ec'),
    @('UCE', 'http://www.dspace.uce.edu.ec'),
    @('UTPL', 'https://dspace.utpl.edu.ec'),
    @('UG', 'http://repositorio.ug.edu.ec'),
    @('USFQ', 'https://repositorio.usfq.edu.ec'),
    @('UTN', 'http://repositorio.utn.edu.ec'),
    @('UTA', 'https://repositorio.uta.edu.ec'),
    @('UCSG', 'http://repositorio.ucsg.edu.ec'),
    @('UNACH', 'http://dspace.unach.edu.ec'),
    @('ESPE', 'http://repositorio.espe.edu.ec'),
    @('UPS', 'https://dspace.ups.edu.ec')
)
foreach ($r in $repos) { $results += Test-Source $r[0] $r[1] "ecuador" "html" $TimeoutSec ([ref]$summary) }
Save-Results "$PSScriptRoot\last_results.json" $results $summary "Ecuador"
Write-Host "  Ecuador: $($summary.working)/$($summary.total_tested) working"

