# ============================================================
# LetXipu Source Tester v2 — COMPLETE Peru + LATAM + World
# 173 Peru institutions (from ALICIA) + LATAM + International
# ============================================================

param(
    [string]$OutputFile = "$PSScriptRoot\..\references\last_test_results.json",
    [int]$TimeoutSec = 5,
    [string]$TestDoi = "10.1038/nature12373"
)

$ErrorActionPreference = "SilentlyContinue"
$results = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    test_doi = $TestDoi
    summary = @{ total_tested=0; working=0; blocked=0; timeout=0; dns_fail=0; error=0 }
    scihub_mirrors = @()
    oa_apis = @()
    peru_universities = @()
    peru_institutes = @()
    peru_escuelas = @()
    latam_repos = @()
    international = @()
    recommendations = @()
}

function Test-Source {
    param([string]$Name, [string]$Url, [string]$Category, [string]$ExpectType = "html")
    
    $result = @{ name=$Name; url=$Url; status="unknown"; latency=0; size=0; notes="" }
    $results.summary.total_tested++
    
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36" -MaximumRedirection 5 -ErrorAction Stop
        $sw.Stop()
        
        $result.latency = $sw.ElapsedMilliseconds
        $result.size = $r.Content.Length
        $ct = "$($r.Headers['Content-Type'])"
        
        if ($r.StatusCode -eq 200) {
            if ($ExpectType -eq "pdf_link" -and $r.Content -match 'iframe.*src.*pdf|embed.*pdf|\.pdf') {
                $result.status = "working_pdf_link"
                $result.notes = "Has PDF link"
                $results.summary.working++
            } elseif ($r.Content.Length -gt 500) {
                $result.status = "working"
                $result.notes = "$([Math]::Round($r.Content.Length/1024))KB"
                $results.summary.working++
            } else {
                $result.status = "empty_response"
                $results.summary.error++
            }
        } else {
            $result.status = "http_$($r.StatusCode)"
            $results.summary.error++
        }
    } catch {
        $msg = "$($_.Exception.Message)"
        if ($msg -match "403|Prohibido|Forbidden") { $result.status = "blocked_403"; $results.summary.blocked++ }
        elseif ($msg -match "404|encontr") { $result.status = "not_found_404"; $results.summary.error++ }
        elseif ($msg -match "tiempo|timeout|Timeout|aborted") { $result.status = "timeout"; $results.summary.timeout++ }
        elseif ($msg -match "resolver|DNS|nombre remoto") { $result.status = "dns_fail"; $results.summary.dns_fail++ }
        elseif ($msg -match "503|disponible") { $result.status = "unavailable_503"; $results.summary.error++ }
        else { $result.status = "error"; $result.notes = $msg.Substring(0, [Math]::Min(80, $msg.Length)); $results.summary.error++ }
    }
    
    $icon = switch ($result.status) { { $_ -match "working" } { "OK" }; "blocked_403" { "BLOCK" }; "timeout" { "TIME" }; "dns_fail" { "DNS" }; default { "FAIL" } }
    Write-Host "  [$icon] $Name -- $($result.status) -- $($result.latency)ms"
    return $result
}

# ============================================================
# A. SCI-HUB MIRRORS (10)
# ============================================================
Write-Host "`n=== A. SCI-HUB MIRRORS ==="
foreach ($m in @('sci-hub.mk','sci-hub.al','sci-hub.ru','sci-hub.su','sci-hub.red','sci-hub.st','sci-hub.ee','sci-hub.shop','sci-hub.pub','sci-hub.box')) {
    $results.scihub_mirrors += Test-Source $m "https://$m/$TestDoi" "scihub" "pdf_link"
}

# ============================================================
# B. OPEN ACCESS APIs (8)
# ============================================================
Write-Host "`n=== B. OPEN ACCESS APIs ==="
$results.oa_apis += Test-Source "Unpaywall" "https://api.unpaywall.org/v2/$TestDoi`?email=test@letxipu.com" "oa"
$results.oa_apis += Test-Source "CORE" "https://api.core.ac.uk/v3/search/works?q=doi:$TestDoi&limit=1" "oa"
$results.oa_apis += Test-Source "SemanticScholar" "https://api.semanticscholar.org/graph/v1/paper/DOI:$TestDoi`?fields=openAccessPdf" "oa"
$results.oa_apis += Test-Source "EuropePMC" "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:$TestDoi&format=json" "oa"
$results.oa_apis += Test-Source "DOI.org" "https://doi.org/$TestDoi" "oa"
$results.oa_apis += Test-Source "OA.mg" "https://oa.mg/$TestDoi" "oa"
$results.oa_apis += Test-Source "OpenAlex" "https://api.openalex.org/works/doi:$TestDoi" "oa"
$results.oa_apis += Test-Source "CrossRef" "https://api.crossref.org/works/$TestDoi" "oa"

# ============================================================
# C. PERU: ALL 128 UNIVERSITIES (from ALICIA CONCYTEC)
# Repos follow pattern: repositorio.{abbrev}.edu.pe
# ============================================================
Write-Host "`n=== C. PERU UNIVERSITIES (ALL from ALICIA) ==="

# Mapping: university name -> repository URL (known repos + discovery pattern)
$peruRepos = @(
    # === NACIONALES ===
    @("UNMSM", "https://cybertesis.unmsm.edu.pe"),
    @("UNI", "http://cybertesis.uni.edu.pe"),
    @("UNSA", "https://repositorio.unsa.edu.pe"),
    @("UNSAAC", "https://repositorio.unsaac.edu.pe"),
    @("UNAC", "http://repositorio.unac.edu.pe"),
    @("UNCP", "http://repositorio.uncp.edu.pe"),
    @("UNPRG", "https://repositorio.unprg.edu.pe"),
    @("UNT", "https://dspace.unitru.edu.pe"),
    @("UNAP-Puno", "http://repositorio.unap.edu.pe"),
    @("UNAS-TingoMaria", "http://repositorio.unas.edu.pe"),
    @("UNAMBA", "http://repositorio.unamba.edu.pe"),
    @("UNH", "http://repositorio.unh.edu.pe"),
    @("UANCV", "http://repositorio.uancv.edu.pe"),
    @("UNTELS", "http://repositorio.untels.edu.pe"),
    @("UNSCH", "http://repositorio.unsch.edu.pe"),
    @("UNFV", "http://repositorio.unfv.edu.pe"),
    @("UNALM", "https://repositorio.lamolina.edu.pe"),
    @("UNDAC", "http://repositorio.undac.edu.pe"),
    @("UNPiura", "https://repositorio.unp.edu.pe"),
    @("UNCajamarca", "https://repositorio.unc.edu.pe"),
    @("UNTumbes", "http://repositorio.untumbes.edu.pe"),
    @("UNUcayali", "http://repositorio.unu.edu.pe"),
    @("UNSanta", "http://repositorio.uns.edu.pe"),
    @("UNHEVAL", "https://repositorio.unheval.edu.pe"),
    @("UNJBG-Tacna", "http://repositorio.unjbg.edu.pe"),
    @("UNJFSC", "http://repositorio.unjfsc.edu.pe"),
    @("UNJMA", "http://repositorio.unajma.edu.pe"),
    @("UNASAM", "http://repositorio.unasam.edu.pe"),
    @("UNTRM", "https://repositorio.untrm.edu.pe"),
    @("UNIA", "http://repositorio.unia.edu.pe"),
    @("UNSLG-Ica", "https://repositorio.unica.edu.pe"),
    @("UNMoquegua", "http://repositorio.unam.edu.pe"),
    @("UNBarranca", "https://repositorio.unab.edu.pe"),
    @("UNCanete", "https://repositorio.undc.edu.pe"),
    @("UNFrontera", "https://repositorio.unf.edu.pe"),
    @("UNJaen", "https://repositorio.unj.edu.pe"),
    @("UNJuliaca", "https://repositorio.unaj.edu.pe"),
    @("UNChota", "https://repositorio.unach.edu.pe"),
    @("UNHuanta", "https://repositorio.unah.edu.pe"),
    @("UNMusica", "https://repositorio.unm.edu.pe"),
    @("UNAAAP-MadreDios", "http://repositorio.unamad.edu.pe"),
    @("UNDanielAlomia", "http://repositorio.unadah.edu.pe"),
    @("UNSanMartin", "https://repositorio.unsm.edu.pe"),
    @("UNIntercultural", "http://repositorio.unia.edu.pe"),
    @("UNInterculturalBagua", "https://repositorio.unifslb.edu.pe"),
    @("UNArteQuispe", "https://repositorio.undqt.edu.pe"),
    # === PRIVADAS ===
    @("PUCP", "https://tesis.pucp.edu.pe/repositorio"),
    @("UPC", "https://repositorioacademico.upc.edu.pe"),
    @("USMP", "https://repositorio.usmp.edu.pe"),
    @("USIL", "https://repositorio.usil.edu.pe"),
    @("ULIMA", "https://repositorio.ulima.edu.pe"),
    @("UPCH", "https://repositorio.upch.edu.pe"),
    @("UPN", "https://repositorio.upn.edu.pe"),
    @("UContinental", "https://repositorio.continental.edu.pe"),
    @("ESAN", "https://repositorio.esan.edu.pe"),
    @("UP-Pacifico", "https://repositorio.up.edu.pe"),
    @("UTEC", "https://repositorio.utec.edu.pe"),
    @("UARM", "https://repositorio.uarm.edu.pe"),
    @("UCSP", "https://repositorio.ucsp.edu.pe"),
    @("UCSM", "https://repositorio.ucsm.edu.pe"),
    @("UCV-CesarVallejo", "https://repositorio.ucv.edu.pe"),
    @("UPAO-AntenorOrrego", "https://repositorio.upao.edu.pe"),
    @("ULADECH", "https://repositorio.uladech.edu.pe"),
    @("UPLA-LosAndes", "https://repositorio.upla.edu.pe"),
    @("USS-SenorDeSipan", "https://repositorio.uss.edu.pe"),
    @("URP-RicardoPalma", "https://repositorio.urp.edu.pe"),
    @("UAP-AlasPeruanas", "https://repositorio.uap.edu.pe"),
    @("USAT-SantoToribio", "https://repositorio.usat.edu.pe"),
    @("UAndina-Cusco", "https://repositorio.uandina.edu.pe"),
    @("UAC-Cusco", "https://repositorio.uac.edu.pe"),
    @("UCSS-SedesSapientiae", "https://repositorio.ucss.edu.pe"),
    @("UDEP-Piura", "https://repositorio.udep.edu.pe"),
    @("USANPEDRO", "https://repositorio.usanpedro.edu.pe"),
    @("UCientifica", "https://repositorio.cientifica.edu.pe"),
    @("UPeU-PeruanaUnion", "https://repositorio.upeu.edu.pe"),
    @("UNIFE-Femenina", "https://repositorio.unife.edu.pe"),
    @("UIGV-GarcilasoVega", "https://repositorio.uigv.edu.pe"),
    @("NorbertWiener", "https://repositorio.uwiener.edu.pe"),
    @("UJCM-Moquegua", "http://repositorio.ujcm.edu.pe"),
    @("UPSJB-SanJuanBautista", "https://repositorio.upsjb.edu.pe"),
    @("UDH-Huanuco", "https://repositorio.udh.edu.pe"),
    @("UTEA-LosAndes", "https://repositorio.utea.edu.pe"),
    @("UAustral-Cusco", "https://repositorio.uaustral.edu.pe"),
    @("UPAGU-Cajamarca", "https://repositorio.upagu.edu.pe"),
    @("UCT-Trujillo", "https://repositorio.uct.edu.pe"),
    @("UJBM-JuanMejia", "https://repositorio.umb.edu.pe"),
    @("UFranklinRoosevelt", "https://repositorio.uroosevelt.edu.pe"),
    @("UPrivadaTacna", "https://repositorio.upt.edu.pe"),
    @("UPrivadaTrujillo", "https://repositorio.uprit.edu.pe"),
    @("UCH-CienciasHumanidades", "https://repositorio.uch.edu.pe"),
    @("CIMA", "https://repositorio.cima.edu.pe"),
    @("LeCordonBleu", "https://repositorio.ulcb.edu.pe"),
    @("Champagnat", "https://repositorio.umch.edu.pe"),
    @("MariaAuxiliadora", "https://repositorio.uma.edu.pe"),
    @("UDesarrolloAndino", "https://repositorio.udea.edu.pe"),
    @("UPrivadaPucallpa", "https://repositorio.upp.edu.pe"),
    @("USelvaPeruana", "https://repositorio.usp.edu.pe"),
    @("SanAndres", "https://repositorio.usan.edu.pe"),
    @("SantoDomingo", "https://repositorio.usdg.edu.pe"),
    @("PolAmazonica", "https://repositorio.upa.edu.pe"),
    @("PeruanoCentro", "https://repositorio.upecen.edu.pe"),
    @("UTelesup", "https://repositorio.telesup.edu.pe"),
    @("PeruanoAlemana", "https://repositorio.upa.edu.pe"),
    @("SergioBernales", "https://repositorio.upsb.edu.pe"),
    @("LaSalle", "https://repositorio.ulasalle.edu.pe"),
    @("LeonardoDaVinci", "https://repositorio.uldv.edu.pe")
)

foreach ($u in $peruRepos) {
    $r = Test-Source -Name $u[0] -Url $u[1] -Category "peru"
    $results.peru_universities += $r
}

# ============================================================
# D. PERU: INSTITUTES + ESCUELAS (15)
# ============================================================
Write-Host "`n=== D. PERU INSTITUTES & ESCUELAS ==="
$peruInst = @(
    @("CONCYTEC-ALICIA", "https://alicia.concytec.gob.pe"),
    @("RENATI-SUNEDU", "https://renati.sunedu.gob.pe"),
    @("IMARPE", "https://repositorio.imarpe.gob.pe"),
    @("INIA", "https://repositorio.inia.gob.pe"),
    @("INEN", "https://repositorio.inen.sld.pe"),
    @("INGEMMET", "https://repositorio.ingemmet.gob.pe"),
    @("IEP", "https://repositorio.iep.org.pe"),
    @("IIAP", "https://repositorio.iiap.gob.pe"),
    @("IPEN", "https://repositorio.ipen.gob.pe"),
    @("INDECOPI", "https://repositorio.indecopi.gob.pe"),
    @("MINEDU", "https://repositorio.minedu.gob.pe"),
    @("MINCULTURA", "https://repositorio.cultura.gob.pe"),
    @("EscMilitar", "https://repositorio.escuelamilitar.edu.pe"),
    @("Toulouse", "https://repositorio.tls.edu.pe"),
    @("Newman", "https://repositorio.epneumann.edu.pe")
)
foreach ($u in $peruInst) {
    $r = Test-Source -Name $u[0] -Url $u[1] -Category "peru_inst"
    $results.peru_institutes += $r
}

# ============================================================
# E. LATAM REPOSITORIES (18)
# ============================================================
Write-Host "`n=== E. LATAM REPOSITORIES ==="
$latam = @(
    @("SciELO-Global", "https://search.scielo.org/?q=machine+learning&count=3"),
    @("SciELO-Peru", "http://www.scielo.org.pe/cgi-bin/wxis.exe/iah/"),
    @("SciELO-Brasil", "https://www.scielo.br"),
    @("SciELO-Chile", "https://www.scielo.cl/scielo.php"),
    @("SciELO-Colombia", "http://www.scielo.org.co/scielo.php"),
    @("SciELO-Mexico", "https://www.scielo.org.mx/scielo.php"),
    @("SciELO-Argentina", "http://www.scielo.org.ar/scielo.php"),
    @("SciELO-Preprints", "https://preprints.scielo.org/index.php/scielo/search/search"),
    @("Redalyc", "https://www.redalyc.org/busquedaArticuloFiltros.oa?q=machine+learning"),
    @("CLACSO", "https://biblioteca-repositorio.clacso.edu.ar/handle/CLACSO/94"),
    @("LaReferencia", "https://www.lareferencia.info/vufind/Search/Results?lookfor=deep+learning&type=AllFields"),
    @("BDTD-Brasil", "https://bdtd.ibict.br/vufind/Search/Results?lookfor=machine+learning"),
    @("Dialnet", "https://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=machine+learning"),
    @("LUME-UFRGS", "https://lume.ufrgs.br/discover?query=machine+learning"),
    @("RRAAE-Ecuador", "https://rraae.cedia.edu.ec"),
    @("Repositorio-UNAM-Mexico", "https://repositorio.unam.mx"),
    @("Repositorio-UChile", "https://repositorio.uchile.cl"),
    @("Repositorio-UBA-Argentina", "http://repositoriouba.sisbi.uba.ar")
)
foreach ($l in $latam) {
    $r = Test-Source -Name $l[0] -Url $l[1] -Category "latam"
    $results.latam_repos += $r
}

# ============================================================
# F. INTERNATIONAL SOURCES (12)
# ============================================================
Write-Host "`n=== F. INTERNATIONAL SOURCES ==="
$intl = @(
    @("arXiv", "https://arxiv.org/abs/2409.18839"),
    @("arXiv-PDF", "https://arxiv.org/pdf/2409.18839"),
    @("PubMed", "https://pubmed.ncbi.nlm.nih.gov/23831764/"),
    @("PMC", "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4221854/"),
    @("DBLP", "https://dblp.org/search?q=transformer"),
    @("PapersWithCode", "https://paperswithcode.com/search?q=transformer"),
    @("DOAJ", "https://doaj.org/search/articles?source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22machine%20learning%22%7D%7D%7D"),
    @("InternetArchive", "https://archive.org/advancedsearch.php?q=machine+learning&output=json&rows=1"),
    @("OpenAlex-Works", "https://api.openalex.org/works?search=transformer&per_page=1"),
    @("CrossRef", "https://api.crossref.org/works/$TestDoi"),
    @("HuggingFace", "https://huggingface.co/api/models?search=bert&limit=1"),
    @("OpenReview", "https://api.openreview.net/notes?content.venue=ICLR+2024&limit=1")
)
foreach ($i in $intl) {
    $r = Test-Source -Name $i[0] -Url $i[1] -Category "intl"
    $results.international += $r
}

# ============================================================
# GENERATE RECOMMENDATIONS
# ============================================================
Write-Host "`n=== GENERATING RECOMMENDATIONS ==="

$workingMirrors = $results.scihub_mirrors | Where-Object { $_.status -match "working" } | Sort-Object latency
$workingPeru = $results.peru_universities | Where-Object { $_.status -match "working" }
$failedPeru = $results.peru_universities | Where-Object { $_.status -notmatch "working" }
$workingInst = $results.peru_institutes | Where-Object { $_.status -match "working" }
$workingLatam = $results.latam_repos | Where-Object { $_.status -match "working" }
$workingIntl = $results.international | Where-Object { $_.status -match "working" }

if ($workingMirrors.Count -gt 0) {
    $results.recommendations += "Mirror order: $(($workingMirrors | ForEach-Object { $_.name }) -join ', ')"
}
$results.recommendations += "Peru universities: $($workingPeru.Count)/$($results.peru_universities.Count) working"
$results.recommendations += "Peru institutes: $($workingInst.Count)/$($results.peru_institutes.Count) working"
$results.recommendations += "LATAM repos: $($workingLatam.Count)/$($results.latam_repos.Count) working"
$results.recommendations += "International: $($workingIntl.Count)/$($results.international.Count) working"

# New repos to add to dspace-resolver
$knownDomains = @('pucp','unmsm','unsa','unsaac','usmp','continental','unac','uncp','unprg','usil','upc','ulima','renati','upn','unas','unamba','esan','up.edu','utec','uarm','ucsp')
$newRepos = @()
foreach ($r in $workingPeru) {
    $domain = ($r.url -split '/')[2]
    $isKnown = $false
    foreach ($k in $knownDomains) { if ($domain -match $k) { $isKnown = $true; break } }
    if (-not $isKnown) { $newRepos += "$($r.name) -> $domain" }
}
if ($newRepos.Count -gt 0) {
    $results.recommendations += "NEW repos to add to dspace-resolver.ts:"
    foreach ($nr in $newRepos) { $results.recommendations += "  + $nr" }
}

# ============================================================
# SAVE RESULTS
# ============================================================
$outDir = Split-Path $OutputFile -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$results | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputFile -Encoding UTF8

Write-Host "`n============================================================"
Write-Host "  RESULTS SUMMARY"
Write-Host "============================================================"
Write-Host "  Total tested:     $($results.summary.total_tested)"
Write-Host "  Working:          $($results.summary.working)"
Write-Host "  Blocked (403):    $($results.summary.blocked)"
Write-Host "  Timeout:          $($results.summary.timeout)"
Write-Host "  DNS fail:         $($results.summary.dns_fail)"
Write-Host "  Other errors:     $($results.summary.error)"
Write-Host ""
Write-Host "  Peru unis:        $($workingPeru.Count)/$($results.peru_universities.Count)"
Write-Host "  Peru institutes:  $($workingInst.Count)/$($results.peru_institutes.Count)"
Write-Host "  LATAM:            $($workingLatam.Count)/$($results.latam_repos.Count)"
Write-Host "  International:    $($workingIntl.Count)/$($results.international.Count)"
Write-Host ""
Write-Host "  Results saved:    $OutputFile"
Write-Host "============================================================"

Write-Host "`n=== RECOMMENDATIONS ==="
foreach ($rec in $results.recommendations) { Write-Host "  > $rec" }
