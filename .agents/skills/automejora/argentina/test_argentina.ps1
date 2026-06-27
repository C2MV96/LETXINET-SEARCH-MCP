# Test Argentina â€” 21 repos
param([int]$TimeoutSec = 5)
. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n=== ARGENTINA REPOSITORIES ==="
$summary = New-Summary
$results = @()
$repos = @(
    @('UBA-SISBI', 'http://repositoriouba.sisbi.uba.ar'),
    @('CLACSO', 'https://biblioteca-repositorio.clacso.edu.ar'),
    @('SciELO-Argentina', 'http://www.scielo.org.ar'),
    @('CONICET', 'https://ri.conicet.gov.ar'),
    @('UNC-Cordoba', 'https://rdu.unc.edu.ar'),
    @('UNR-Rosario', 'https://rephip.unr.edu.ar'),
    @('UNLP-LaPlata', 'https://sedici.unlp.edu.ar'),
    @('UNL-SantaFe', 'https://bibliotecavirtual.unl.edu.ar'),
    @('UNCuyo', 'https://bdigital.uncu.edu.ar'),
    @('UNTREF', 'https://repositorio.untref.edu.ar'),
    @('UTN', 'https://ria.utn.edu.ar'),
    @('UNSAM', 'https://repositorio.unsam.edu.ar'),
    @('UNS-BahiaBlanca', 'https://repositoriodigital.uns.edu.ar'),
    @('UNMdP', 'https://repositorio.mdp.edu.ar'),
    @('FLACSO', 'https://repositorio.flacso.edu.ar'),
    @('INTA', 'https://repositorio.inta.gob.ar'),
    @('MinCyT', 'https://repositorio.mincyt.gob.ar'),
    @('UNQ-Quilmes', 'https://repositorio.unq.edu.ar'),
    @('UNGS', 'https://repositorio.ungs.edu.ar'),
    @('UNLu', 'https://repositorio.unlu.edu.ar'),
    @('UNER', 'https://repositorio.uner.edu.ar')
)
foreach ($r in $repos) { $results += Test-Source $r[0] $r[1] "argentina" "html" $TimeoutSec ([ref]$summary) }
Save-Results "$PSScriptRoot\last_results.json" $results $summary "Argentina"
Write-Host "  Argentina: $($summary.working)/$($summary.total_tested) working"

