# Test Colombia â€” 15 repos
param([int]$TimeoutSec = 5)
. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n=== COLOMBIA REPOSITORIES ==="
$summary = New-Summary
$results = @()
$repos = @(
    @('UNAL', 'https://repositorio.unal.edu.co'),
    @('UniAndes', 'https://repositorio.uniandes.edu.co'),
    @('SciELO-Colombia', 'http://www.scielo.org.co'),
    @('UdeA', 'https://bibliotecadigital.udea.edu.co'),
    @('Javeriana', 'https://repository.javeriana.edu.co'),
    @('UIS', 'https://noesis.uis.edu.co'),
    @('UniValle', 'https://bibliotecadigital.univalle.edu.co'),
    @('URosario', 'https://repository.urosario.edu.co'),
    @('UPB', 'https://repository.upb.edu.co'),
    @('EAFIT', 'https://repository.eafit.edu.co'),
    @('UniNorte', 'https://manglar.uninorte.edu.co'),
    @('UTP', 'https://repositorio.utp.edu.co'),
    @('UniCartagena', 'https://repositorio.unicartagena.edu.co'),
    @('USabana', 'https://intellectum.unisabana.edu.co'),
    @('MinCiencias', 'https://repositorio.minciencias.gov.co')
)
foreach ($r in $repos) { $results += Test-Source $r[0] $r[1] "colombia" "html" $TimeoutSec ([ref]$summary) }
Save-Results "$PSScriptRoot\last_results.json" $results $summary "Colombia"
Write-Host "  Colombia: $($summary.working)/$($summary.total_tested) working"

