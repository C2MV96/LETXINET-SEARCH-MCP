# ============================================================
# Test Brasil - Repositorios academicos brasileiros
# Ejecutar: pwsh -File test_brasil.ps1
# ============================================================

. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n====== TEST BRASIL - Repositorios Academicos ======`n"

$repos = @(
    @('BDTD', 'https://bdtd.ibict.br'),
    @('SciELO-Brasil', 'https://www.scielo.br'),
    @('USP-Repositorio', 'https://repositorio.usp.br'),
    @('USP-Teses', 'https://teses.usp.br'),
    @('UNICAMP', 'https://repositorio.unicamp.br'),
    @('UFRJ-Pantheon', 'https://pantheon.ufrj.br'),
    @('UFMG', 'https://repositorio.ufmg.br'),
    @('UFRGS-LUME', 'https://lume.ufrgs.br'),
    @('UFSC', 'https://repositorio.ufsc.br'),
    @('UNESP', 'https://repositorio.unesp.br'),
    @('UnB', 'https://repositorio.unb.br'),
    @('UFPR', 'https://acervodigital.ufpr.br'),
    @('UFBA', 'https://repositorio.ufba.br'),
    @('UFRN', 'https://repositorio.ufrn.br'),
    @('UFPE', 'https://repositorio.ufpe.br'),
    @('UFC', 'https://repositorio.ufc.br'),
    @('UFPA', 'https://repositorio.ufpa.br'),
    @('UFPB', 'https://repositorio.ufpb.br'),
    @('UFG', 'https://repositorio.bc.ufg.br'),
    @('UFES', 'https://repositorio.ufes.br'),
    @('UFSCar', 'https://repositorio.ufscar.br'),
    @('UFMS', 'https://repositorio.ufms.br'),
    @('UFAL', 'https://repositorio.ufal.br'),
    @('UFF-RIUFF', 'https://app.uff.br/riuff'),
    @('UFAM-TEDE', 'https://tede.ufam.edu.br'),
    @('UFJF', 'https://repositorio.ufjf.br'),
    @('UFMA', 'https://tedebc.ufma.br'),
    @('UFV', 'https://locus.ufv.br'),
    @('UFPI', 'https://repositorio.ufpi.br'),
    @('UFMT', 'https://ri.ufmt.br'),
    @('UFOP', 'https://repositorio.ufop.br'),
    @('UFSM', 'https://repositorio.ufsm.br'),
    @('FURG', 'https://repositorio.furg.br'),
    @('UTFPR', 'https://repositorio.utfpr.edu.br'),
    @('UNIFESP', 'https://repositorio.unifesp.br'),
    @('UERJ', 'https://www.bdtd.uerj.br'),
    @('UEL', 'https://repositorio.uel.br'),
    @('PUC-Rio', 'https://maxwell.vrac.puc-rio.br'),
    @('PUC-SP', 'https://repositorio.pucsp.br'),
    @('PUC-RS', 'https://repositorio.pucrs.br'),
    @('PUC-MG', 'https://repositorio.pucminas.br'),
    @('FIOCRUZ-ARCA', 'https://arca.fiocruz.br'),
    @('EMBRAPA', 'https://repositorio.embrapa.br'),
    @('INPE', 'https://urlib.net/sid.inpe.br'),
    @('FGV', 'https://repositorio.fgv.br'),
    @('Mackenzie', 'https://tede.mackenzie.br')
)

$results = @()
$summary = New-Summary

foreach ($r in $repos) {
    $results += Test-Source -Name $r[0] -Url $r[1] -Category 'brasil' -Timeout 5 -Summary ([ref]$summary)
}

Write-Host "`n--- Resumen Brasil ---"
Write-Host "  Total: $($summary.total_tested) | OK: $($summary.working) | Blocked: $($summary.blocked) | Timeout: $($summary.timeout) | DNS Fail: $($summary.dns_fail) | Error: $($summary.error)"

Save-Results -OutputFile "$PSScriptRoot\last_results.json" -Results $results -Summary $summary -Country 'Brasil'
