# Test Mexico â€” 25+ repos
param([int]$TimeoutSec = 5)
. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n=== MEXICO REPOSITORIES ==="
$summary = New-Summary
$results = @()
$repos = @(
    @('UNAM', 'https://repositorio.unam.mx'),
    @('IPN', 'https://repositorioinstitucional.ipn.mx'),
    @('SciELO-Mexico', 'https://www.scielo.org.mx'),
    @('Redalyc', 'https://www.redalyc.org'),
    @('ITESM-TEC', 'https://repositorio.tec.mx'),
    @('UAM', 'https://zaloamati.azc.uam.mx'),
    @('UDG', 'https://repositorio.udg.mx'),
    @('COLMEX', 'https://repositorio.colmex.mx'),
    @('BUAP', 'https://repositorioinstitucional.buap.mx'),
    @('UV', 'https://cdigital.uv.mx'),
    @('UANL', 'https://eprints.uanl.mx'),
    @('UAEM', 'https://repositorioinstitucional.uaem.mx'),
    @('UAQ', 'https://ri.uaq.mx'),
    @('UASLP', 'https://repositorioinstitucional.uaslp.mx'),
    @('UACH', 'https://repositorio.uach.mx'),
    @('UNISON', 'https://repositorioinstitucional.unison.mx'),
    @('UADY', 'https://repositorio.uady.mx'),
    @('UJAT', 'https://repositorio.ujat.mx'),
    @('ITAM', 'https://repositorio.itam.mx'),
    @('IBERO', 'https://repositorio.ibero.mx'),
    @('UIA', 'https://repositorio.uia.mx'),
    @('CIDE', 'https://repositorio.cide.edu'),
    @('CIESAS', 'https://repositorio.ciesas.edu.mx'),
    @('CONACYT', 'https://repositorio.conacyt.mx'),
    @('COLEF', 'https://www.colef.mx')
)
foreach ($r in $repos) { $results += Test-Source $r[0] $r[1] "mexico" "html" $TimeoutSec ([ref]$summary) }
Save-Results "$PSScriptRoot\last_results.json" $results $summary "Mexico"
Write-Host "  Mexico: $($summary.working)/$($summary.total_tested) working"

