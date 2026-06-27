---
title: LetXipu Search MCP v7
emoji: 🔬
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# LetXipu Search MCP v7

> **Servidor MCP de busqueda academica + conversion inteligente de documentos**
> 27 herramientas - 32+ fuentes - MinerU AI - Multi-formato - OCR 109 idiomas - Anti-bloqueo avanzado

---

## What's New in v7

| Feature | v6 | v7 |
|---|---|---|
| **Document Engine** | pymupdf4llm (Python) | **MinerU AI** (Cloud API) |
| **Formats** | PDF only | **PDF, DOCX, PPTX, XLSX, Images** |
| **Python Required** | Yes | **No** |
| **GPU Required** | No | **No** |
| **MCP Tools** | 23 | **27** (+4 new) |
| **Table Extraction** | Text-based | **ML-based** (StructEqTable) |
| **Formula Recognition** | None | **LaTeX** (UniMERNet) |
| **OCR** | None | **109 languages** (PaddleOCR) |
| **PDF Sources** | 9 fallback | **11 fallback** (+DSpace LATAM, Europe PMC) |
| **User-Agents** | 3 (Chrome 121) | **18** (Chrome 128, Firefox 128, Safari 17, Edge, Brave, Opera) |
| **Anti-Detection** | Basic | **Sec-Fetch headers, rate limiting, circuit breaker TTL** |
| **DSpace Repos** | 0 | **136** (7 paises LATAM) |
| **Dockerfile** | Node + Python | **Node.js only** |
| **Config** | .env file | **claude_desktop_config.json** |

### New Tools
- `convert_document` -- Convert any document to Markdown (PDF/DOCX/PPTX/XLSX/IMG)
- `batch_convert` -- Convert multiple documents in parallel (max 10)
- `extract_tables` -- Extract tables as HTML/Markdown using ML recognition
- `extract_formulas` -- Extract mathematical formulas as LaTeX

---

## Quick Start

### 1. Install

```bash
git clone <repo-url> LETXIPU-SEARCH-MCP-V7
cd LETXIPU-SEARCH-MCP-V7
npm install
npm run build
```

### 2. Get MinerU Token (Optional)

1. Go to [mineru.net](https://mineru.net)
2. Sign up / Login
3. Navigate to **API Management**
4. Click **Create API Token**

### 3. Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "letxipu-search-v7": {
      "command": "node",
      "args": ["path/to/mcp-bridge.js"],
      "env": {
        "LETXIPU_MCP_URL": "http://localhost:4000",
        "MINERU_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

### 4. Run

```bash
npm start
```

---

## 27 MCP Tools

### Search Tools (7)
| Tool | Description |
|---|---|
| `search` | Smart multi-source academic search |
| `smart_search` | AI-enhanced search with query expansion |
| `search_arxiv` | arXiv preprints |
| `search_pubmed` | PubMed biomedical literature |
| `search_openalex` | OpenAlex works database |
| `search_semantic_scholar` | Semantic Scholar papers |
| `search_dblp` | DBLP computer science bibliography |

### LATAM Tools (7)
| Tool | Description |
|---|---|
| `search_scielo` | SciELO multi-country (Brasil, Mexico, Argentina, Chile, Colombia, Peru) |
| `search_alicia` | ALICIA CONCYTEC (Peru - 173+ institutions) |
| `search_renati` | RENATI SUNEDU (Peru theses) |
| `search_redalyc` | Redalyc Latin American journals |
| `search_clacso` | CLACSO social sciences |
| `search_la_referencia` | La Referencia aggregator |
| `search_dialnet` | Dialnet Spanish-language research |

### Document Tools (6)
| Tool | Description |
|---|---|
| `read_pdf` | Read PDF from URL with 11-source fallback |
| `convert_document` | Convert any document to Markdown (MinerU AI) |
| `batch_convert` | Batch convert documents (max 10) |
| `extract_tables` | ML-based table extraction |
| `extract_formulas` | LaTeX formula extraction |
| `get_pdf_metadata` | Extract metadata from academic PDFs |

### Other Tools (7)
| Tool | Description |
|---|---|
| `search_huggingface` | HuggingFace models and datasets |
| `search_openreview` | OpenReview conference papers |
| `search_papers_with_code` | Papers With Code benchmarks |
| `search_internet_archive` | Internet Archive |
| `check_sources` | Health check all sources |
| `get_citation` | Get citation in APA/BibTeX/MLA |
| `search_crossref` | CrossRef DOI metadata |

---

## PDF Resolution Chain (11 Sources)

```
User requests PDF
  |
  v
 1. Direct URL     -> try fetching the URL directly
 2. Sci-Hub        -> 7 mirrors (mk, al, ru, su, red, shop, st)
 3. Unpaywall      -> OA location via DOI
 4. CORE           -> Open access aggregator
 5. Semantic Sch.  -> S2 open access PDF
 6. DOI.org        -> Follow DOI redirect
 7. OA.mg          -> Open access search
 8. WeLib           -> 43M books, 98M papers
 9. Europe PMC     -> European biomedical [NEW]
10. DSpace         -> 136 LATAM institutional repos [NEW]
11. Google Scholar -> Last resort (strict rate limit)
```

---

## DSpace Repositories -- 136 LATAM Institutions

LetXipu automatically detects and resolves PDFs from **136 Latin American institutional DSpace repositories** (universities, institutes, government entities):

### Peru -- Universidades Nacionales (40+ repos)

| Universidad | Dominio | Latencia |
|---|---|---|
| UNMSM | cybertesis.unmsm.edu.pe | 81ms |
| PUCP | tesis.pucp.edu.pe | 483ms |
| UNSA (Arequipa) | repositorio.unsa.edu.pe | 938ms |
| UNSAAC (Cusco) | repositorio.unsaac.edu.pe | 552ms |
| UNAC (Callao) | repositorio.unac.edu.pe | 248ms |
| UNCP (Huancayo) | repositorio.uncp.edu.pe | 253ms |
| UNFV (Villarreal) | repositorio.unfv.edu.pe | OK |
| UNALM (La Molina) | repositorio.lamolina.edu.pe | OK |
| + UNDAC, UNCajamarca, UNHEVAL, UNJFSC, UNTRM, UNICA, UNBarranca, UNCaete, UNFrontera, UNJuliaca y mas... | | |

### Peru -- Universidades Privadas (35+ repos)

| Universidad | Dominio | Latencia |
|---|---|---|
| USMP | repositorio.usmp.edu.pe | 83ms |
| UP (Pacifico) | repositorio.up.edu.pe | 102ms |
| UPLA (Los Andes) | repositorio.upla.edu.pe | 131ms |
| UIGV (Garcilaso) | repositorio.uigv.edu.pe | 129ms |
| UCV (Cesar Vallejo) | repositorio.ucv.edu.pe | 1480ms |
| UPAO (Antenor Orrego) | repositorio.upao.edu.pe | 212ms |
| ULADECH | repositorio.uladech.edu.pe | 1038ms |
| NorbertWiener | repositorio.uwiener.edu.pe | 1192ms |
| + UPN, UContinental, ESAN, UTEC, UCSP, USS, URP, UAP, USAT, UAndina, UCSS, UCientifica, UPeU, UNIFE y mas... | | |

### Peru -- Institutos y Gobierno (9 repos)

| Institucion | Dominio | Latencia |
|---|---|---|
| RENATI-SUNEDU | renati.sunedu.gob.pe | 93ms |
| INDECOPI | repositorio.indecopi.gob.pe | 108ms |
| INGEMMET | repositorio.ingemmet.gob.pe | 166ms |
| MINCULTURA | repositorio.cultura.gob.pe | 265ms |
| IMARPE | repositorio.imarpe.gob.pe | 1241ms |
| MINEDU | repositorio.minedu.gob.pe | 1349ms |
| IPEN, IEP, IIAP | | OK |

### Brasil (45 repos)
USP, UNICAMP, UFRJ, UFMG, UFRGS, UFSC, UNESP, UnB, UFPR, UFBA, UFRN, UFPE, UFC, UFPA, UFPB, UFG, UFES, UFSCar, PUC-Rio, PUC-SP, PUC-RS, FIOCRUZ, EMBRAPA, FGV, BDTD, SciELO Brasil y mas.

### Mexico (25 repos)
UNAM, IPN, ITESM/TEC, UAM, UDG, COLMEX, BUAP, UV, UANL, IBERO, Redalyc y mas.

### Argentina (21 repos)
UBA, CONICET, UNC, UNLP, UNR, UNCuyo, UTN, CLACSO, INTA, FLACSO, SciELO Argentina y mas.

### Chile (16 repos)
UChile, PUC, USACH, UdeC, UAI, UDP, UBB, UTEM, ANID, SciELO Chile y mas.

### Colombia (15 repos)
UNAL, UniAndes, UdeA, Javeriana, UIS, UniValle, URosario, EAFIT, MinCiencias y mas.

### Ecuador (13 repos)
ESPOL, PUCE, UCE, UTPL, UG, USFQ, ESPE, UPS, RRAAE y mas.

The DSpace resolver:
1. Detects DSpace handle URLs (/handle/20.500.xxxxx/)
2. Fetches the handle page HTML
3. Parses 3 bitstream URL patterns
4. Downloads the actual PDF with proper session headers
5. Falls back to constructed bitstream URLs if no links found

Any DSpace repository worldwide is automatically detected (not just LATAM).

---

## Architecture

```
Claude Desktop / Cursor / Antigravity
        |
        | MCP Protocol (stdio)
        v
+------------------+
|  mcp-bridge.js   |  <-- Translates stdio <-> HTTP
+--------+---------+
         | HTTP POST
         v
+----------------------------------------------------------+
|  LetXipu Search MCP v7 (Node.js :4000)                   |
|                                                           |
|  +--------------+  +----------------------+               |
|  | 27 MCP Tools |  |  MinerU Client       |               |
|  | (mcp.ts)     |->|  (mineru-client.ts)  |               |
|  +--------------+  +------+---------------+               |
|                           |                               |
|  +--------------+  +------v---------------+               |
|  | Search       |  |  pdf-processor.ts    |               |
|  | Providers    |  |  (fallback chain)    |               |
|  | (32+ APIs)   |  +----------------------+               |
|  +--------------+                                         |
|                                                           |
|  +----------------------------------------------------+  |
|  |  Anti-Blocker System                                |  |
|  |  +-- resilient-fetch.ts (18 UAs)                    |  |
|  |  +-- anubis-solver.ts (PoW)                         |  |
|  |  +-- dspace-resolver.ts (136 repos)                 |  |
|  |  +-- pdf-resolver.ts (11 sources)                   |  |
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

## Anti-Blocker System

### User-Agent Rotation (18 UAs)

Rotates through modern browser signatures:
- Chrome 126-128 (Win/Mac/Linux)
- Firefox 127-128
- Safari 17.5
- Edge 126-127
- Brave, Opera, Vivaldi

### Headers Anti-Detection

Every request includes realistic browser headers:
```
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Sec-Ch-Ua: "Chromium";v="128"
```

### Rate Limiting

Per-domain rate limiting with configurable intervals:
- Default: 2000ms between requests
- Sci-Hub: 3000ms
- Google Scholar: 10000ms

### Circuit Breaker

- Opens after 3 consecutive failures per domain
- 5 minute cooldown before retrying
- Prevents wasting time on dead sources

### Anubis PoW Solver

Solves Anubis JavaScript proof-of-work challenges:
- Brute-force SHA-256 hash matching
- Automatic cookie extraction
- Retry with solved cookie

---

## Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `MINERU_API_TOKEN` | MinerU API token | No | None |
| `UNPAYWALL_EMAIL` | Unpaywall API email | No | Built-in |
| `SCIHUB_MIRRORS` | Custom Sci-Hub mirrors (comma-separated) | No | Built-in |
| `MINERU_API_URL` | MinerU API endpoint | No | `https://mineru.net/api/v4` |
| `PORT` | Server port | No | `4000` |

### Optional API Keys (enhance results but not required)

| Variable | Description |
|---|---|
| `CORE_API_KEY` | CORE.ac.uk -- increases rate limits |
| `SCOPUS_API_KEY` | Elsevier Scopus -- paywall access |
| `S2_API_KEY` | Semantic Scholar -- higher rate limits |
| `SERP_API_KEY` | SerpAPI -- Google Scholar enhanced |

### Anti-Blocker Configuration

| Variable | Description | Default |
|---|---|---|
| `RATE_LIMIT_MS` | Min delay between requests (ms) | `2000` |
| `CIRCUIT_BREAKER_THRESHOLD` | Failures before circuit opens | `3` |
| `CIRCUIT_BREAKER_TIMEOUT` | Cooldown before retry (ms) | `300000` |

---

## Search Sources (32+)

### International
| Source | Coverage |
|---|---|
| arXiv | Physics, Math, CS preprints |
| PubMed / PMC | Biomedical literature |
| Semantic Scholar | 200M+ papers |
| OpenAlex | 250M+ works |
| CrossRef | DOI metadata |
| DBLP | Computer Science |
| DOAJ | Open access journals |
| Papers With Code | ML benchmarks |
| OpenReview | Conference reviews |
| HuggingFace | AI models/datasets |
| Internet Archive | Digital library |

### Latin America
| Source | Country | Coverage |
|---|---|---|
| ALICIA | Peru | CONCYTEC national repository (173+ institutions) |
| RENATI | Peru | SUNEDU thesis registry |
| SciELO | Multi | Open access journals (7 countries) |
| Redalyc | Multi | Latin American journals |
| CLACSO | Multi | Social sciences |
| La Referencia | Multi | LATAM aggregator |
| Dialnet | Spain/LATAM | Spanish-language research |
| BDTD | Brasil | National thesis database |
| + 10 more | Various | National repositories |

### LATAM Institutional DSpace (136 repos)
Automatic thesis/paper resolution from 136 institutional repos across 7 countries:
40+ Peru national universities, 35+ Peru private universities, 9 Peru government institutes,
45 Brasil repos, 25 Mexico repos, 21 Argentina repos, 16 Chile repos, 15 Colombia repos, 13 Ecuador repos.

---

## Auto-Mejora System

Self-improving source testing across 7 countries:

```
.agents/skills/automejora/
+-- run_all.ps1            # Master orchestrator
+-- shared/test_helpers.ps1
+-- peru/test_peru.ps1     # 121 sources
+-- brasil/test_brasil.ps1 # 45 sources
+-- mexico/test_mexico.ps1 # 25 sources
+-- argentina/             # 21 sources
+-- chile/                 # 16 sources
+-- colombia/              # 15 sources
+-- ecuador/               # 13 sources
+-- global/                # 28 sources (Sci-Hub, APIs, International)
```

```bash
# Run full auto-improvement pipeline
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1"

# Single country
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -Country peru

# Dry run (no code changes)
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -DryRun
```

The pipeline: Tests 287+ sources -> Discovers new repos -> Adds to dspace-resolver.ts -> Builds -> Rollback on failure.

---

## Changelog

### v7.0 -- MinerU AI Engine (Jun 2026)

#### Added
- MinerU AI cloud integration for document conversion
- 4 new MCP tools (convert_document, batch_convert, extract_tables, extract_formulas)
- Support for DOCX, PPTX, XLSX, and image formats
- LaTeX formula extraction (UniMERNet)
- ML-based table extraction (StructEqTable)
- OCR support for 109 languages (PaddleOCR)

### v7.1 -- Anti-Blocker + LATAM Expansion (Jun 2026)

#### Added
- `dspace-resolver.ts` -- DSpace PDF extractor for 136 LATAM institutions (7 countries)
- `tryEuropePmc()` -- Europe PMC as PDF source #9
- 18 modern User-Agents (Chrome 126-128, Firefox 127-128, Safari 17, Edge, Brave, Opera, Vivaldi)
- `Sec-Fetch-*` and `Sec-Ch-Ua` headers for Chrome-like anti-detection
- Per-domain rate limiting (configurable via env vars)
- Circuit breaker with 5-minute TTL per domain
- Auto-mejora skill: tests 287+ sources, auto-discovers repos, updates code

#### Improved
- Sci-Hub mirror order optimized by latency (mk > al > ru)
- Handle-based DSpace URL detection (works with any DSpace repo worldwide)
- Bitstream URL pattern matching (3 patterns)

---

## License

MIT
