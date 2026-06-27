---
title: LetXipu Search MCP v7
emoji: 🔬
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# LetXipu Search MCP v7

![Version](https://img.shields.io/badge/version-7.1-blue)
![Sources](https://img.shields.io/badge/sources-287+-green)
![DSpace](https://img.shields.io/badge/DSpace_repos-136-orange)
![Tools](https://img.shields.io/badge/MCP_tools-27-purple)
![Node](https://img.shields.io/badge/node-20+-339933)
![Docker](https://img.shields.io/badge/docker-ready-2496ED)
![License](https://img.shields.io/badge/license-MIT-green)

> **Academic search MCP server + intelligent document conversion**
>
> 27 MCP tools | 32+ sources | MinerU AI | Multi-format | OCR 109 languages | Anti-blocking | 136 LATAM DSpace repos

---

## What's New in v7

| Feature | v6 | v7 |
|---|---|---|
| **Document Engine** | pymupdf4llm (Python) | **MinerU AI** (Cloud API) |
| **Formats** | PDF only | **PDF, DOCX, PPTX, XLSX, Images** |
| **Python Required** | Yes | **No** |
| **MCP Tools** | 23 | **27** (+4 new) |
| **Table Extraction** | Text-based | **ML-based** (StructEqTable) |
| **Formula Recognition** | None | **LaTeX** (UniMERNet) |
| **OCR** | None | **109 languages** (PaddleOCR) |
| **PDF Sources** | 9 fallback | **11 fallback** (+DSpace, Europe PMC) |
| **User-Agents** | 3 | **18** (Chrome/Firefox/Safari/Edge/Brave/Opera/Vivaldi) |
| **Anti-Detection** | Basic | **Sec-Fetch, Sec-Ch-Ua, rate limit, circuit breaker** |
| **DSpace Repos** | 0 | **136** (7 countries) |
| **Dockerfile** | Node + Python | **Node.js only** |

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/C2MV96/LETXINET-SEARCH-MCP.git
cd LETXINET-SEARCH-MCP
npm install
npm run build
```

### 2. Configure

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Required keys:
```env
# MinerU (free at mineru.net)
MINERU_API_KEY=your_token

# Optional (enhance results but not required)
CORE_API_KEY=your_key
SCOPUS_API_KEY=your_key
SEMANTIC_SCHOLAR_API_KEY=your_key
SERP_API_KEY=your_key
```

### 3. Configure MCP Client

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "letxipu-search-v7": {
      "command": "node",
      "args": ["/path/to/mcp-bridge.js"],
      "env": {
        "LETXIPU_MCP_URL": "http://localhost:4000"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "letxipu-search": {
      "command": "node",
      "args": ["/path/to/mcp-bridge.js"],
      "env": { "LETXIPU_MCP_URL": "http://localhost:4000" }
    }
  }
}
```

**Docker**:
```bash
docker build -t letxipu-search .
docker run -p 7860:7860 --env-file .env letxipu-search
```

### 4. Run

```bash
npm start          # Production
npm run dev        # Development (auto-reload)
```

---

## 27 MCP Tools

### Search (7 tools)
| Tool | Source | API Key |
|---|---|---|
| `search` | Smart multi-source (combines all) | No |
| `smart_search` | AI-enhanced with query expansion | No |
| `search_arxiv` | arXiv preprints (Physics, Math, CS) | No |
| `search_pubmed` | PubMed biomedical (25M+ articles) | No |
| `search_openalex` | OpenAlex (250M+ works) | No |
| `search_semantic_scholar` | Semantic Scholar (200M+ papers) | Optional |
| `search_dblp` | DBLP computer science bibliography | No |

### Latin America (7 tools)
| Tool | Source | Coverage |
|---|---|---|
| `search_alicia` | ALICIA CONCYTEC | Peru - 173+ institutions |
| `search_renati` | RENATI SUNEDU | Peru - national thesis registry |
| `search_scielo` | SciELO | 7 countries (BR, MX, AR, CL, CO, PE, preprints) |
| `search_redalyc` | Redalyc | Latin American journals |
| `search_clacso` | CLACSO | Social sciences |
| `search_la_referencia` | La Referencia | LATAM aggregator |
| `search_dialnet` | Dialnet | Spanish-language research |

### Documents (6 tools)
| Tool | Description | Engine |
|---|---|---|
| `read_pdf` | Read PDF from URL (11-source fallback) | pdf-parse + MinerU |
| `convert_document` | Convert any doc to Markdown | MinerU AI |
| `batch_convert` | Batch convert (max 10 docs) | MinerU AI |
| `extract_tables` | ML-based table extraction | MinerU (StructEqTable) |
| `extract_formulas` | LaTeX formula extraction | MinerU (UniMERNet) |
| `get_pdf_metadata` | Extract academic metadata | Built-in |

### Discovery (7 tools)
| Tool | Source |
|---|---|
| `search_huggingface` | HuggingFace models and datasets |
| `search_openreview` | OpenReview conference papers |
| `search_papers_with_code` | Papers With Code benchmarks |
| `search_internet_archive` | Internet Archive digital library |
| `search_crossref` | CrossRef DOI metadata (140M+ works) |
| `check_sources` | Health check all sources |
| `get_citation` | Get citation (APA/BibTeX/MLA/Chicago) |

---

## PDF Resolution Chain (11 Sources)

When `read_pdf` is called, it tries up to 11 sources to find the full text:

```
User requests PDF (DOI or URL)
  |
  1. Direct URL -----> Fetch the URL directly
  |   (fail)
  2. Sci-Hub --------> 7 mirrors: mk, al, ru, su, red, shop, st
  |   (fail)
  3. Unpaywall ------> OA location via DOI (api.unpaywall.org)
  |   (fail)
  4. CORE -----------> Open access aggregator (200M+ papers)
  |   (fail)
  5. Semantic Sch. --> S2 open access PDF link
  |   (fail)
  6. DOI.org --------> Follow DOI redirect to publisher
  |   (fail)
  7. OA.mg ----------> Open access mirror search
  |   (fail)
  8. WeLib -----------> 43M books, 98M papers
  |   (fail)
  9. Europe PMC -----> European biomedical literature
  |   (fail)
  10. DSpace ---------> 136 LATAM institutional repos
  |   (fail)
  11. Google Scholar -> Last resort (strict 20s rate limit)
```

Each source has retry logic, User-Agent rotation, and circuit breaker protection.

---

## Anti-Blocker System

### 18 User-Agent Rotation

Sequential rotation through modern browser signatures:

| Browser | Versions | OS |
|---|---|---|
| Chrome | 126, 127, 128 | Windows, macOS, Linux, ChromeOS, Android |
| Firefox | 127, 128 | Windows, macOS, Linux |
| Safari | 17.5 | macOS |
| Edge | 126, 128 | Windows |
| Brave | 128 | Windows |
| Opera | 113 | Windows |
| Vivaldi | 6.8 | Windows |

### Chrome-like Headers

Every request includes realistic browser fingerprint:
```
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: cross-site
Sec-Fetch-User: ?1
Sec-Ch-Ua: "Chromium";v="128", "Google Chrome";v="128"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Accept-Language: [random: es-PE, es-ES, en-US, pt-BR, es-419]
```

### Per-Domain Rate Limiting

| Domain | Delay |
|---|---|
| `scholar.google.com` | 20,000ms |
| `www.google.com` | 10,000ms |
| `api.semanticscholar.org` | 1,000ms |
| `api.unpaywall.org` | 500ms |
| All others | 300ms + random jitter |

### Circuit Breaker

- 3 failures --> domain blocked for 5 minutes
- Auto-resets after cooldown
- Prevents wasting time on dead sources

### Retry with Exponential Backoff

- 429/503: 3s, 9s, 27s + jitter
- 403: Rotate UA + rebuild headers, fallback to insecure fetch
- SSL errors: Immediate insecure fetch fallback
- Max 3 retries per request

### Anubis PoW Solver

Solves JavaScript proof-of-work challenges (used by some academic sites):
1. Extracts salt + difficulty from challenge JSON
2. Brute-force SHA-256: finds nonce where hash starts with N zeros
3. Submits solution, extracts auth cookie
4. Retries request with cookie (up to 2M iterations)

### PMC PoW Solver

Same SHA-256 pattern for PubMed Central challenges:
- Extracts challenge from HTML response
- Solves PoW (up to 5M iterations)
- Sets cookie and re-fetches PDF
- Double-retry: solves again if second response is another challenge

---

## DSpace Repositories -- 136 LATAM Institutions

Automatic PDF resolution from **136 institutional DSpace repositories** across 7 countries:

### Coverage by Country

```
Peru       ||||||||||||||||||||||||||||||||||||||||||||||||| 85 repos
Brasil     ||||||||||||||||||||||||||  45 repos (auto-discovered)
Mexico     ||||||||||||  25 repos (auto-discovered)
Argentina  |||||||||  21 repos (auto-discovered)
Chile      ||||||||  16 repos (auto-discovered)
Colombia   |||||||  15 repos (auto-discovered)
Ecuador    ||||||  13 repos (auto-discovered)
```

### Peru (85 repos)

**Universidades Nacionales (40+)**
UNMSM, PUCP, UNSA, UNSAAC, UNAC, UNCP, UNPRG, UNI, UNICA, UNAP-Puno, UNAS, UANCV, UNSCH, UNFV, UNALM, UNDAC, UNCajamarca, UNSanta, UNHEVAL, UNJBG, UNJFSC, UNTRM, UNIA, UNBarranca, UNCanete, UNFrontera, UNJuliaca, UNMusica, UNAMAD, UNSanMartin, and more.

**Universidades Privadas (35+)**
USMP, UPC, USIL, UPCH, UPN, UContinental, ESAN, UP-Pacifico, UTEC, UARM, UCSP, UCV, UPAO, ULADECH, UPLA, USS, URP, UAP, USAT, UAndina, UCSS, USanPedro, UCientifica, UPeU, UNIFE, UIGV, NorbertWiener, UPSJB, UDH, UTEA, LeCordonBleu, Champagnat, and more.

**Gobierno e Institutos (9)**
SUNEDU/RENATI, CONCYTEC, INDECOPI, INGEMMET, IMARPE, MINEDU, MINCULTURA, IEP, IIAP, IPEN.

### Brasil (45 repos)
USP, UNICAMP, UFRJ, UFMG, UFRGS, UFSC, UNESP, UnB, UFPR, UFBA, UFRN, UFPE, UFC, UFPA, PUC-Rio, PUC-SP, PUC-RS, FIOCRUZ, EMBRAPA, FGV, BDTD, SciELO Brasil, and more.

### Mexico (25 repos)
UNAM, IPN, ITESM/TEC, UAM, UDG, COLMEX, BUAP, UV, UANL, IBERO, Redalyc, and more.

### Argentina (21 repos)
UBA, CONICET, UNC, UNLP, UNR, UNCuyo, UTN, CLACSO, INTA, SciELO Argentina, and more.

### Chile (16 repos)
UChile, PUC, USACH, UdeC, UAI, UDP, UBB, UTEM, SciELO Chile, and more.

### Colombia (15 repos)
UNAL, UniAndes, UdeA, Javeriana, UIS, UniValle, URosario, EAFIT, and more.

### Ecuador (13 repos)
ESPOL, PUCE, UCE, UTPL, UG, USFQ, ESPE, UPS, RRAAE, and more.

### How DSpace Resolution Works

```
URL with /handle/ or /bitstream/ detected
  |
  v
Known repo (136)?
  |--- YES ---> Optimized bitstream URL construction
  |--- NO ----> Generic DSpace detection (works with ANY DSpace worldwide)
  |
  v
Fetch handle page HTML
  |
  v
Extract PDF URL (3 patterns):
  1. Standard bitstream: /bitstream/handle/{id}/filename.pdf
  2. Generic PDF link: any .pdf href on page
  3. DSpace 7 REST API: /api/core/bitstreams/{uuid}/content
  |
  v
Download PDF with session headers
  |
  v
Validate: %PDF- magic bytes, min 100 bytes
```

### Handle Map (89 prefixes)

Resolves `hdl.handle.net` URLs to direct repository URLs:
- 39 Universidades Nacionales
- 42 Universidades Privadas
- 8 Institutos/Government

---

## Metadata Extraction

Automatically extracts from any academic page:

| Field | Sources (priority order) |
|---|---|
| **Title** | `citation_title`, `dc.title`, `og:title`, `<title>` |
| **Authors** | `citation_author`, `dc.contributor.author`, `dc.creator` |
| **Abstract** | `citation_abstract`, `dc.description.abstract`, `og:description` |
| **Date** | `citation_date`, `dc.date.issued`, `citation_publication_date` |
| **PDF URL** | `citation_pdf_url`, `eprints.document_url`, `og:url` |
| **University** | `citation_dissertation_institution`, `dc.publisher` |

Supports DSpace 7 SPA auto-detection (Angular apps with `<ds-app>` tag).

---

## MinerU AI Integration

### Supported Formats

| Format | Extensions | Features |
|---|---|---|
| **PDF** | .pdf | Full text, tables, formulas, images, OCR |
| **Word** | .docx | Text, tables, embedded images |
| **PowerPoint** | .pptx | Slides to markdown, images |
| **Excel** | .xlsx | Sheets as markdown tables |
| **Images** | .png, .jpg, .tiff | OCR text extraction (109 languages) |

### Modes

| Mode | Token Required | Limits | Features |
|---|---|---|---|
| **Flash** | No | 20 pages / 10MB per file | Basic extraction, IP rate-limited |
| **Precision** | Yes (free) | 200 pages / 200MB, 5000 pages/day | Full ML pipeline |

### Conversion Pipeline

```
Document --> MinerU Cloud API
  |
  1. Submit task (URL or upload)
  2. Poll for completion (~10-60s)
  3. Download result ZIP
  4. Extract full.md (markdown)
  |
  v
Markdown output with:
  - Preserved document structure
  - Tables as HTML/Markdown
  - Formulas as LaTeX
  - Images extracted and linked
  - OCR for scanned content
```

### Fallback Chain

```
MinerU API (cloud, best quality)
  |--- fail --->
MarkItDown / pymupdf4llm (local Python, if available)
  |--- fail --->
pdf-parse npm (basic text extraction, always available)
```

---

## Environment Variables

### Required (for full functionality)

| Variable | Description | Get it at |
|---|---|---|
| `MINERU_API_KEY` | MinerU document conversion | [mineru.net](https://mineru.net) (free) |

### Optional (enhance results)

| Variable | Description | Get it at |
|---|---|---|
| `CORE_API_KEY` | CORE.ac.uk - higher rate limits | [core.ac.uk](https://core.ac.uk/services/api) |
| `SCOPUS_API_KEY` | Elsevier Scopus - paywall access | [dev.elsevier.com](https://dev.elsevier.com) |
| `SEMANTIC_SCHOLAR_API_KEY` | Semantic Scholar - higher limits | [semanticscholar.org](https://www.semanticscholar.org/product/api) |
| `SERP_API_KEY` | Google Scholar enhanced | [serpapi.com](https://serpapi.com) |
| `HF_TOKEN` | HuggingFace API access | [huggingface.co](https://huggingface.co/settings/tokens) |
| `REDALYC_TOKEN` | Redalyc journals | Contact Redalyc |

### Anti-Blocker Configuration

| Variable | Default | Description |
|---|---|---|
| `SCIHUB_MIRRORS` | Built-in (7) | Comma-separated mirror list |
| `MINERU_TIMEOUT` | 300000 (5min) | MinerU API timeout in ms |
| `PORT` | 4000 | Server port (7860 in Docker) |

All sources work without API keys (free mode). Keys only improve rate limits and access.

---

## Architecture

```
Claude Desktop / Cursor / Antigravity
        |
        | MCP Protocol (stdio)
        v
+------------------+
|  mcp-bridge.js   |  Translates stdio <-> HTTP
+--------+---------+
         | HTTP POST
         v
+----------------------------------------------------------+
|  LetXipu Search MCP v7 (Node.js :4000)                   |
|                                                          |
|  +--------------+  +----------------------+              |
|  | 27 MCP Tools |  |  MinerU Client       |              |
|  | (mcp.ts)     |->|  (mineru-client.ts)  |              |
|  +--------------+  +----------------------+              |
|                                                          |
|  +--------------+  +----------------------+              |
|  | 32+ Search   |  |  PDF Processor       |              |
|  | Providers    |  |  (11-source fallback) |              |
|  +--------------+  +----------------------+              |
|                                                          |
|  +----------------------------------------------------+  |
|  |  Anti-Blocker System                               |  |
|  |  - resilient-fetch.ts (18 UAs, rate limit)         |  |
|  |  - anubis-solver.ts (SHA-256 PoW)                  |  |
|  |  - pmc-solver.ts (PMC PoW)                         |  |
|  |  - dspace-resolver.ts (136 repos)                  |  |
|  |  - metadata-extractor.ts (6 fields)                |  |
|  |  - handle-map.ts (89 prefixes)                     |  |
|  +----------------------------------------------------+  |
+----------+---------------+-------------------------------+
           |               |
           v               v
  +--------+------+  +-----+------+
  | Academic APIs |  | MinerU API |
  | (32+ sources) |  | (Cloud)    |
  +---------------+  +------------+
```

---

## Source Health (Auto-tested Jun 2026)

| Category | Working | Total | Rate |
|---|---|---|---|
| Sci-Hub mirrors | 6 | 10 | 60% |
| OA APIs | 5 | 8 | 63% |
| Peru universities | 67 | 106 | 63% |
| Peru institutes | 11 | 15 | 73% |
| Brasil | 31 | 46 | 67% |
| Mexico | 10 | 25 | 40% |
| Argentina | 10 | 21 | 48% |
| Chile | 8 | 16 | 50% |
| Colombia | 12 | 15 | 80% |
| Ecuador | 8 | 13 | 62% |
| LATAM aggregators | 13 | 18 | 72% |
| International | 9 | 12 | 75% |
| Global sources | 21 | 28 | 75% |
| **Total** | **211** | **333** | **63%** |

---

## Auto-Mejora System

Self-improving source testing across 7 countries + global:

```bash
# Test all 287+ sources and auto-improve code
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1"

# Single country
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -Country peru

# Dry run (preview changes)
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -DryRun
```

Pipeline: Test sources --> Find new working repos --> Add to dspace-resolver.ts --> Build --> Rollback if fails.

```
automejora/
+-- run_all.ps1              # Master orchestrator
+-- shared/test_helpers.ps1  # Reusable Test-Source function
+-- peru/                    # 121 sources
+-- brasil/                  # 45 sources
+-- mexico/                  # 25 sources
+-- argentina/               # 21 sources
+-- chile/                   # 16 sources
+-- colombia/                # 15 sources
+-- ecuador/                 # 13 sources
+-- global/                  # 28 sources
```

---

## Examples

### Academic Search
```
Tool: search
Query: "machine learning applied to mining in Peru"
Result: 47 papers from UNMSM, PUCP, ALICIA, SciELO, Semantic Scholar
```

### Read a Thesis PDF
```
Tool: read_pdf
URL: "https://tesis.pucp.edu.pe/repositorio/handle/20.500.12404/12345"
Result: Full markdown with tables, formulas (LaTeX), 45 pages
```

### Convert a Document
```
Tool: convert_document
File: "research_paper.docx"
Result: Clean markdown with embedded images, tables, and structure
```

### Extract Tables
```
Tool: extract_tables
URL: "https://arxiv.org/pdf/2409.18839"
Result: All tables as HTML/Markdown with ML-based recognition
```

---

## Comparison

| Feature | LetXipu v7 | Exa.ai | Semantic Scholar | Google Scholar |
|---|---|---|---|---|
| MCP Native | Yes | No | No | No |
| LATAM Coverage | 136 repos | 0 | Partial | Partial |
| PDF Download | 11 sources | 0 | 1 | 0 |
| Anti-Blocking | Full (18 UA, PoW) | N/A | N/A | N/A |
| Doc Conversion | MinerU AI | No | No | No |
| Table Extraction | ML-based | No | No | No |
| Formula OCR | LaTeX | No | No | No |
| Self-Improving | Yes | No | No | No |
| Free | Yes | Paid | Free (limited) | Free (blocked) |

---

## FAQ

**Do I need a GPU?**
No. MinerU runs in the cloud. The server is Node.js only.

**Do I need Python?**
No. v7 removed the Python dependency. Everything runs on Node.js.

**Does it work without API keys?**
Yes. All 32+ sources have free mode. API keys only improve rate limits.

**How do I add more universities?**
The auto-mejora system discovers them automatically. Or edit `src/scraping/dspace-resolver.ts`.

**What if a source goes down?**
The circuit breaker blocks it for 5 minutes, then retries. The auto-mejora system tracks trends.

**Can it access paywalled papers?**
It tries 11 sources including Sci-Hub, Unpaywall, CORE, and OA.mg. Success rate depends on the paper.

**What languages does OCR support?**
109 languages via PaddleOCR through MinerU.

---

## Roadmap

- [ ] Venezuela, Bolivia, Paraguay, Uruguay, Cuba repos
- [ ] Public REST API
- [ ] Web dashboard for source health monitoring
- [ ] Zotero integration
- [ ] Distributed caching
- [ ] Citation graph analysis
- [ ] Browser extension

---

## Contributing

### Add a new data source
1. Create provider in `src/providers/`
2. Export search function
3. Add MCP tool in `src/routes/mcp.ts`
4. Add test in `automejora/`

### Add a new country
1. Create `automejora/{country}/test_{country}.ps1`
2. List all university repos
3. Run `run_all.ps1 -Country {country}`
4. New repos auto-added to `dspace-resolver.ts`

### Report dead sources
Run the auto-mejora pipeline and check results in `last_results.json`.

---

## License

MIT

---

Built with Node.js, TypeScript, Express, MinerU AI, and the power of open access.
