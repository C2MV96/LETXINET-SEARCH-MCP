# ============================================================
# Test Global Sources â€” Sci-Hub, OA APIs, International
# ============================================================
param([int]$TimeoutSec = 5, [string]$TestDoi = "10.1038/nature12373")
. "$PSScriptRoot\..\shared\test_helpers.ps1"

Write-Host "`n=== GLOBAL: SCI-HUB MIRRORS ==="
$summary = New-Summary
$scihub = @()
foreach ($m in @('sci-hub.mk','sci-hub.al','sci-hub.ru','sci-hub.su','sci-hub.red','sci-hub.st','sci-hub.ee','sci-hub.shop','sci-hub.pub','sci-hub.box')) {
    $scihub += Test-Source $m "https://$m/$TestDoi" "scihub" "pdf_link" $TimeoutSec ([ref]$summary)
}

Write-Host "`n=== GLOBAL: OA APIs ==="
$apis = @()
$apis += Test-Source "Unpaywall" "https://api.unpaywall.org/v2/$TestDoi`?email=test@letxipu.com" "oa" "html" $TimeoutSec ([ref]$summary)
$apis += Test-Source "CORE" "https://api.core.ac.uk/v3/search/works?q=doi:$TestDoi&limit=1" "oa" "html" $TimeoutSec ([ref]$summary)
$apis += Test-Source "SemanticScholar" "https://api.semanticscholar.org/graph/v1/paper/DOI:$TestDoi`?fields=openAccessPdf" "oa" "html" $TimeoutSec ([ref]$summary)
$apis += Test-Source "EuropePMC" "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:$TestDoi&format=json" "oa" "html" $TimeoutSec ([ref]$summary)
$apis += Test-Source "DOI.org" "https://doi.org/$TestDoi" "oa" "html" $TimeoutSec ([ref]$summary)
$apis += Test-Source "OA.mg" "https://oa.mg/$TestDoi" "oa" "html" $TimeoutSec ([ref]$summary)
$apis += Test-Source "OpenAlex" "https://api.openalex.org/works/doi:$TestDoi" "oa" "html" $TimeoutSec ([ref]$summary)
$apis += Test-Source "CrossRef" "https://api.crossref.org/works/$TestDoi" "oa" "html" $TimeoutSec ([ref]$summary)

Write-Host "`n=== GLOBAL: INTERNATIONAL ==="
$intl = @()
$intl += Test-Source "arXiv" "https://arxiv.org/abs/2409.18839" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "arXiv-PDF" "https://arxiv.org/pdf/2409.18839" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "PubMed" "https://pubmed.ncbi.nlm.nih.gov/23831764/" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "PMC" "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4221854/" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "DBLP" "https://dblp.org/search?q=transformer" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "PapersWithCode" "https://paperswithcode.com/search?q=transformer" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "DOAJ" "https://doaj.org" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "InternetArchive" "https://archive.org/advancedsearch.php?q=machine+learning&output=json&rows=1" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "HuggingFace" "https://huggingface.co" "intl" "html" $TimeoutSec ([ref]$summary)
$intl += Test-Source "OpenReview" "https://openreview.net" "intl" "html" $TimeoutSec ([ref]$summary)

$allResults = @{ scihub=$scihub; oa_apis=$apis; international=$intl }
Save-Results -OutputFile "$PSScriptRoot\last_results.json" -Results $allResults -Summary $summary -Country "Global"

Write-Host "`n  Global: $($summary.working)/$($summary.total_tested) working"

