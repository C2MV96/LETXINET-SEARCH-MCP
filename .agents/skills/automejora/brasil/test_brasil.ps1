# ============================================================
# Test Brasil — Repositorios académicos brasileños
# Ejecutar: pwsh -File test_brasil.ps1
# ============================================================

. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n====== TEST BRASIL — Repositorios Académicos ======`n"

$repos = @(
    # --- Bases de datos nacionales ---
    @('BDTD - Biblioteca Digital de Teses e Dissertações', 'https://bdtd.ibict.br'),
    @('SciELO Brasil', 'https://www.scielo.br'),

    # --- Universidades Federales ---
    @('USP - Repositório', 'https://repositorio.usp.br'),
    @('USP - Teses', 'https://teses.usp.br'),
    @('UNICAMP - Repositório', 'https://repositorio.unicamp.br'),
    @('UFRJ - Pantheon', 'https://pantheon.ufrj.br'),
    @('UFMG - Repositório', 'https://repositorio.ufmg.br'),
    @('UFRGS - LUME', 'https://lume.ufrgs.br'),
    @('UFSC - Repositório', 'https://repositorio.ufsc.br'),
    @('UNESP - Repositório', 'https://repositorio.unesp.br'),
    @('UnB - Repositório', 'https://repositorio.unb.br'),
    @('UFPR - Acervo Digital', 'https://acervodigital.ufpr.br'),
    @('UFBA - Repositório', 'https://repositorio.ufba.br'),
    @('UFRN - Repositório', 'https://repositorio.ufrn.br'),
    @('UFPE - Repositório', 'https://repositorio.ufpe.br'),
    @('UFC - Repositório', 'https://repositorio.ufc.br'),
    @('UFPA - Repositório', 'https://repositorio.ufpa.br'),
    @('UFPB - Repositório', 'https://repositorio.ufpb.br'),
    @('UFG - Repositório', 'https://repositorio.bc.ufg.br'),
    @('UFES - Repositório', 'https://repositorio.ufes.br'),
    @('UFSCar - Repositório', 'https://repositorio.ufscar.br'),
    @('UFMS - Repositório', 'https://repositorio.ufms.br'),
    @('UFAL - Repositório', 'https://repositorio.ufal.br'),
    @('UFF - RIUFF', 'https://app.uff.br/riuff'),
    @('UFAM - TEDE', 'https://tede.ufam.edu.br'),
    @('UFJF - Repositório', 'https://repositorio.ufjf.br'),
    @('UFMA - Repositório', 'https://tedebc.ufma.br'),
    @('UFV - Repositório', 'https://locus.ufv.br'),
    @('UFPI - Repositório', 'https://repositorio.ufpi.br'),
    @('UFMT - Repositório', 'https://ri.ufmt.br'),
    @('UFOP - Repositório', 'https://repositorio.ufop.br'),
    @('UFSM - Repositório', 'https://repositorio.ufsm.br'),
    @('FURG - Repositório', 'https://repositorio.furg.br'),
    @('UTFPR - Repositório', 'https://repositorio.utfpr.edu.br'),
    @('UNIFESP - Repositório', 'https://repositorio.unifesp.br'),

    # --- Universidades Estaduales ---
    @('UERJ - Repositório', 'https://www.bdtd.uerj.br'),
    @('UEL - Repositório', 'https://repositorio.uel.br'),

    # --- Pontifícias Universidades Católicas (PUCs) ---
    @('PUC-Rio - Maxwell', 'https://maxwell.vrac.puc-rio.br'),
    @('PUC-SP - Repositório', 'https://repositorio.pucsp.br'),
    @('PUC-RS - Repositório', 'https://repositorio.pucrs.br'),
    @('PUC-MG - Repositório', 'https://repositorio.pucminas.br'),

    # --- Instituciones de investigación ---
    @('FIOCRUZ - ARCA', 'https://arca.fiocruz.br'),
    @('EMBRAPA - Repositório', 'https://repositorio.embrapa.br'),
    @('INPE - Repositório', 'https://urlib.net/sid.inpe.br'),
    @('FGV - Repositório', 'https://repositorio.fgv.br'),

    # --- Universidades privadas ---
    @('Mackenzie - TEDE', 'https://tede.mackenzie.br')
)

$results = @()
$summary = New-Summary

foreach ($r in $repos) {
    $results += Test-Source -Name $r[0] -Url $r[1] -Category 'brasil' -Timeout 5 -Summary ([ref]$summary)
}

Write-Host "`n--- Resumen Brasil ---"
Write-Host "  Total: $($summary.total_tested) | OK: $($summary.working) | Blocked: $($summary.blocked) | Timeout: $($summary.timeout) | DNS Fail: $($summary.dns_fail) | Error: $($summary.error)"

Save-Results -OutputFile "$PSScriptRoot\last_results.json" -Results $results -Summary $summary -Country 'Brasil'
