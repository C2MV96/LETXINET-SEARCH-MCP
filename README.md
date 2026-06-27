---
title: LetXipu Search MCP v7
emoji: 🔬
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# LetXipu Search MCP v7

![Version](https://img.shields.io/badge/version-7.0.0-blue)
![MCP Tools](https://img.shields.io/badge/MCP_tools-27-purple)
![Sources](https://img.shields.io/badge/sources-39-green)
![DSpace](https://img.shields.io/badge/DSpace_repos-132-orange)
![Node](https://img.shields.io/badge/node-20+-339933)
![Docker](https://img.shields.io/badge/docker-ready-2496ED)
![License](https://img.shields.io/badge/license-MIT-green)

LetXipu Search MCP v7 is a Node.js/TypeScript MCP server for academic search, metadata recovery, PDF resolution, and document-to-Markdown conversion. It focuses on Latin American academic repositories while also exposing global sources such as OpenAlex, Semantic Scholar, PubMed, arXiv, Crossref, DBLP, Papers With Code, HuggingFace Daily Papers, and OpenReview.

The project can run locally, in Docker, or as a Hugging Face Docker Space. The YAML block above is intentionally kept for Hugging Face Spaces.

## Current Snapshot

| Item | Current value | Source |
|---|---:|---|
| Package/server version | 7.0.0 | `package.json`, `src/server.ts` |
| MCP tools | 27 | `src/routes/mcp.ts` |
| Search sources | 39 | `src/routes/sources.ts` |
| Known DSpace repositories | 132 | `src/scraping/dspace-resolver.ts` |
| Last source-test run | 2026-06-27T00:28:37Z | `.agents/skills/source-tester/references/last_test_results.json` |
| Last tested sources | 169 | source tester results |
| Working sources in last run | 111 | source tester results |

## What It Does

- Academic search across global, LatAm, country-specific, thesis, and AI/ML source groups.
- Batch-first search with query expansion and deduplication.
- Metadata enrichment and recovery from DOI, title, URL, repository handles, DSpace pages, and academic HTML.
- PDF URL resolution through DOI, OA APIs, repository pages, DSpace handles, PMC, Sci-Hub mirrors, and other fallbacks.
- PDF reading, section detection, citation extraction, targeted section extraction, and academic analysis.
- Multi-format document conversion through MinerU when configured: PDF, DOCX, PPTX, XLSX, PNG, JPG, TIFF.
- Local PDF fallback through MarkItDown/pymupdf4llm when available, then `pdf-parse` as last resort.
- Source health testing and auto-improvement scripts under `.agents/skills/`.

## Quick Start

### 1. Install

```bash
git clone https://github.com/C2MV96/LETXINET-SEARCH-MCP.git
cd LETXINET-SEARCH-MCP
npm install
npm run build
```

On Windows PowerShell, if `npm` is blocked by execution policy, use:

```powershell
npm.cmd install
npm.cmd run build
```

### 2. Configure

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Minimum local configuration:

```env
PORT=4000
```

Recommended document conversion configuration:

```env
MINERU_API_KEY=your_token_here
MINERU_API_URL=https://mineru.net/api/v4
```

Optional search/API keys:

```env
CORE_API_KEY=your_core_key
SCOPUS_API_KEY=your_scopus_key
SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_key
SERP_API_KEY=your_serpapi_key_for_/api/search
SERPAPI_KEY=your_serpapi_key_for_provider_fallback
HF_TOKEN=your_huggingface_token_if_needed_by_bridge
OPENREVIEW_USERNAME=optional_openreview_username
OPENREVIEW_PASSWORD=optional_openreview_password
SCIHUB_MIRRORS=https://sci-hub.mk,https://sci-hub.al
MINERU_TIMEOUT=300000
```

Note: the current code reads both `SERP_API_KEY` in the search route and `SERPAPI_KEY` in the provider. If you use SerpApi, set both until the config contract is unified.

### 3. Run

```bash
npm start
```

Development mode:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:4000/health
```

Expected shape:

```json
{
  "status": "ok",
  "service": "letxipu-search-mcp",
  "version": "7.0.0",
  "tools": 27
}
```

## Docker And Hugging Face Spaces

This repository includes a Dockerfile using Node 20:

```bash
docker build -t letxipu-search .
docker run -p 7860:7860 --env-file .env letxipu-search
```

Docker runs with:

```env
PORT=7860
NODE_ENV=production
```

For Hugging Face Spaces, keep the YAML metadata at the top of this README:

```yaml
---
title: LetXipu Search MCP v7
emoji: 🔬
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---
```

The Dockerfile exposes port `7860`, which matches Hugging Face Docker Space defaults.

## MCP Client Setup

The bridge is `mcp-bridge.js`. It talks to the HTTP MCP endpoint and translates stdio JSON-RPC for desktop clients.

Important: the bridge currently reads `LETXIPU_URL` or `MCP_API_URL`, not `LETXIPU_MCP_URL`.

### Claude Desktop

```json
{
  "mcpServers": {
    "letxipu-search-v7": {
      "command": "node",
      "args": ["D:/OTROS/LETXIPU-SEARCH-MCP-V7/mcp-bridge.js"],
      "env": {
        "LETXIPU_URL": "http://localhost:4000/api/mcp"
      }
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "letxipu-search-v7": {
      "command": "node",
      "args": ["D:/OTROS/LETXIPU-SEARCH-MCP-V7/mcp-bridge.js"],
      "env": {
        "LETXIPU_URL": "http://localhost:4000/api/mcp"
      }
    }
  }
}
```

For a remote Hugging Face Space, point `LETXIPU_URL` to:

```text
https://your-space-url/api/mcp
```

## HTTP Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Server health and uptime |
| `/` | GET | Service metadata and endpoint catalog |
| `/api/search` | POST | Multi-source academic search |
| `/api/metadata/enrich` | POST | Batch metadata enrichment |
| `/api/metadata/fetch` | POST | Single-paper metadata fetch |
| `/api/pdf/download` | POST | PDF URL/download resolution |
| `/api/pdf/read` | POST | PDF text/Markdown extraction |
| `/api/pdf/metadata` | POST | PDF metadata extraction |
| `/api/pdf/sections` | POST | Academic section detection |
| `/api/pdf/citations` | POST | Citation/reference extraction |
| `/api/pdf/analyze` | POST | Academic document analysis |
| `/api/pdf/markdown` | POST | Structured PDF to Markdown |
| `/api/pdf/summary` | POST | Token-efficient PDF summary |
| `/api/sources` | GET | Source catalog and source groups |
| `/api/mcp` | POST | MCP JSON-RPC 2.0 endpoint |

## MCP Tools

### Search And Discovery

| Tool | Purpose |
|---|---|
| `batch_search` | Preferred broad search. Runs multiple queries across source groups and deduplicates globally. |
| `search` | Single-query academic search. |
| `smart_search` | Generates query variations in Spanish, English, and Portuguese, then deduplicates results. |
| `search_dblp` | DBLP computer science bibliography search. |
| `search_paperswithcode` | Papers With Code search for papers, repositories, datasets, methods, and benchmarks. |
| `trending_papers` | HuggingFace Daily Papers, optionally filtered by topic. |
| `search_conferences` | OpenReview conference papers. |
| `list_sources` | Lists source IDs, names, categories, and groups. |
| `health_check` | Checks source/API connectivity and configured keys. |
| `help` | Usage help for tools and sources. |

### Metadata And PDF Resolution

| Tool | Purpose |
|---|---|
| `enrich_metadata` | Batch enrichment for paper metadata. |
| `fetch_metadata` | Fetch metadata for one DOI, URL, or title. |
| `recover_metadata` | Deep recovery chain across OpenAlex, Crossref, Semantic Scholar, DSpace, HTML, and ALICIA. |
| `download_pdf` | Resolve and return a PDF download URL. |
| `resolve_pdf` | Resolve final PDF URL without downloading. |

### PDF And Academic Document Reading

| Tool | Purpose |
|---|---|
| `read_pdf` | Extract text or Markdown from URL, DOI, or local PDF path. |
| `pdf_metadata` | Extract PDF title, author, page count, dates, and file size. |
| `pdf_sections` | Detect abstract, introduction, methods, results, conclusions, references, and related sections. |
| `pdf_citations` | Extract citations and reference lists. |
| `analyze_academic` | Detect document type, language, sections, and statistical data. |
| `extract_section` | Extract one named section with fuzzy Spanish/English matching. |
| `read_pdf_markdown` | Convert PDF to structured Markdown. |
| `pdf_smart_summary` | Produce a token-efficient academic summary. |

### Document Conversion

| Tool | Purpose |
|---|---|
| `convert_document` | Convert PDF, DOCX, PPTX, XLSX, PNG, JPG, or TIFF to Markdown through MinerU when configured. |
| `batch_convert` | Convert up to 10 documents in parallel. |
| `extract_tables` | Extract tables as HTML or Markdown. |
| `extract_formulas` | Extract mathematical formulas as LaTeX. |

## Source Catalog

The source catalog currently contains 39 source IDs.

### Global And International

| ID | Name | Category |
|---|---|---|
| `semantic` | Semantic Scholar | free |
| `openalex` | OpenAlex | free |
| `pubmed` | PubMed | free |
| `arxiv` | arXiv | free |
| `scopus` | Scopus | premium |
| `crossref` | Crossref | free |
| `doaj` | DOAJ | free |
| `zenodo` | Zenodo | free |
| `openaire` | OpenAIRE | free |
| `core` | CORE | free |
| `serpapi` | Google Scholar via SerpApi | premium |
| `dblp` | DBLP | free |
| `paperswithcode` | Papers With Code | free |
| `huggingface` | HuggingFace Daily Papers | free |
| `openreview` | OpenReview | free |

### Latin America, Spain, And Regional Sources

| ID | Name | Country/region |
|---|---|---|
| `scielo` | SciELO | LatAm/Spain |
| `redalyc` | Redalyc | LatAm |
| `alicia` | ALICIA CONCYTEC | Peru |
| `renati` | RENATI SUNEDU | Peru |
| `lareferencia` | La Referencia | LatAm |
| `conacyt` | CONAHCyT | Mexico |
| `unam` | UNAM | Mexico |
| `anid` | ANID | Chile |
| `oasisbr` | Oasisbr | Brazil |
| `snrd` | SNRD | Argentina |
| `minciencias` | MinCiencias | Colombia |
| `bdtd` | BDTD | Brazil |
| `rraae` | RRAAE | Ecuador |
| `espana` | Recolecta | Spain |
| `costarica` | KIMUK | Costa Rica |
| `uruguay` | Timbo | Uruguay |
| `elsalvador` | REDICCES | El Salvador |
| `laref_peru` | La Referencia Peru | Peru |
| `laref_brasil` | La Referencia Brasil | Brazil |
| `laref_ecuador` | La Referencia Ecuador | Ecuador |
| `laref_mexico` | La Referencia Mexico | Mexico |
| `laref_argentina` | La Referencia Argentina | Argentina |
| `laref_colombia` | La Referencia Colombia | Colombia |
| `laref_chile` | La Referencia Chile | Chile |

## Source Groups

Use these groups in `search`, `batch_search`, and `smart_search`:

| Group | Purpose |
|---|---|
| `global` | Main global academic APIs. |
| `latam` | Latin American and regional academic sources. |
| `iberoamerica` | LatAm plus Spain. |
| `tesis` | Thesis and institutional repository sources. |
| `peru`, `brasil`, `mexico`, `argentina`, `chile`, `colombia`, `ecuador` | Country-focused searches. |
| `centroamerica` | Costa Rica and El Salvador. |
| `ai_ml` | arXiv, HuggingFace, Papers With Code, OpenReview, DBLP. |
| `free` | Free sources only. |
| `premium` | API-key-backed premium sources. |
| `all` | All registered source IDs. |

Example:

```json
{
  "query": "machine learning mining Peru",
  "sources": ["latam", "global"],
  "maxSources": 50,
  "yearStart": "2020",
  "yearEnd": "2026"
}
```

## PDF Resolution Pipeline

`resolve_pdf`, `download_pdf`, and PDF-reading tools can receive a DOI, URL, repository handle, or local path. The resolver attempts multiple strategies depending on the identifier:

1. Direct URL or local file.
2. Repository and DSpace handle detection.
3. DOI and publisher redirect checks.
4. Open access APIs such as Unpaywall, CORE, Semantic Scholar, Europe PMC, OA.mg, OpenAlex, and Crossref where applicable.
5. PubMed Central and PMC-specific handling.
6. Sci-Hub mirror fallback where configured and reachable.
7. Google Scholar/SerpApi fallback when API keys are available.

Known DSpace repositories are optimized in `src/scraping/dspace-resolver.ts`; unknown DSpace pages still use generic handle and bitstream extraction.

## Document Conversion Pipeline

### With MinerU API Key

When `MINERU_API_KEY` is configured:

1. The document is sent to MinerU Cloud API.
2. The task is polled until completion.
3. Markdown and extracted structure are returned.
4. Tables and formulas can be extracted through the dedicated tools.

Supported formats:

| Type | Extensions |
|---|---|
| PDF | `.pdf` |
| Word | `.docx` |
| PowerPoint | `.pptx` |
| Excel | `.xlsx` |
| Images | `.png`, `.jpg`, `.jpeg`, `.tiff` |

### Without MinerU API Key

PDFs can still use local fallback:

1. MarkItDown/pymupdf4llm, if Python and dependencies are available.
2. `pdf-parse`, always available as a basic final PDF text fallback.

Non-PDF formats require `MINERU_API_KEY`.

## Last Source-Test Results

Latest stored source-test run:

```text
timestamp: 2026-06-27T00:28:37Z
total_tested: 169
working: 111
blocked: 7
timeout: 25
dns_fail: 14
error: 12
```

Breakdown:

| Category | Working | Total | Rate |
|---|---:|---:|---:|
| Sci-Hub mirrors | 6 | 10 | 60% |
| Open access APIs | 5 | 8 | 63% |
| Peru universities | 67 | 106 | 63% |
| Peru institutes/government | 11 | 15 | 73% |
| LATAM repositories | 13 | 18 | 72% |
| International sources | 9 | 12 | 75% |
| **Total** | **111** | **169** | **66%** |

These results depend on network conditions, rate limits, DNS availability, and anti-bot blocking at external sites. Re-run source tests before publishing new benchmark claims.

## Test And Validation Commands

### Build

```powershell
npm.cmd run build
```

### Start Server

```powershell
npm.cmd start
```

### Health

```powershell
Invoke-RestMethod http://localhost:4000/health
```

### Source Catalog

```powershell
Invoke-RestMethod http://localhost:4000/api/sources
```

### MCP Tools List

```powershell
$body = @{
  jsonrpc = "2.0"
  id = 1
  method = "tools/list"
  params = @{}
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri http://localhost:4000/api/mcp -Method Post -ContentType "application/json" -Body $body
```

### Basic Search

```powershell
$body = @{
  query = "machine learning Peru"
  sources = @("latam", "global")
  maxSources = 20
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri http://localhost:4000/api/search -Method Post -ContentType "application/json" -Body $body
```

### Source Health And Auto-Improvement

Dry run:

```powershell
powershell -ExecutionPolicy Bypass -File ".agents/skills/source-tester/scripts/auto_improve_master.ps1" -DryRun
```

Full run:

```powershell
powershell -ExecutionPolicy Bypass -File ".agents/skills/source-tester/scripts/auto_improve_master.ps1"
```

Country-focused auto-mejora:

```powershell
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -Country peru
```

All-country auto-mejora:

```powershell
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1"
```

## README Release Checklist

Before changing badges or benchmark numbers:

- Run `npm.cmd run build`.
- Start the server and verify `/health`.
- Verify `tools/list` returns 27 tools.
- Verify `/api/sources` returns 39 sources.
- Run at least one search against `global`, `latam`, and `tesis`.
- Run `resolve_pdf` on one DOI and one repository URL.
- Run `read_pdf` on a known open PDF.
- If documenting MinerU features, test with `MINERU_API_KEY` configured.
- Re-run source tester and update the timestamp/results table.
- Keep the Hugging Face YAML front matter at the top.

## Troubleshooting

### PowerShell blocks npm

Use `npm.cmd`:

```powershell
npm.cmd run build
```

### MCP client cannot connect

Check that:

- The server is running on `http://localhost:4000`.
- The bridge env var is `LETXIPU_URL`.
- The URL includes `/api/mcp`.
- `mcp-bridge.js` points to the same checkout you are running.

### MinerU tools fail

Check:

- `MINERU_API_KEY` is configured.
- `MINERU_API_URL` is correct.
- The document format is supported.
- For local PDF fallback, Python and pymupdf4llm/MarkItDown dependencies are installed.

### Search returns few results

Try:

- `batch_search` instead of `search`.
- Source groups such as `["latam", "global"]` or `["tesis"]`.
- Spanish, English, and Portuguese query variants.
- Optional API keys for rate-limited providers.

## Project Structure

```text
src/
  providers/        Search providers, PDF resolver, MinerU client, document processors
  routes/           HTTP routes and MCP JSON-RPC route
  scraping/         Resilient fetch, DSpace resolver, handle map, metadata extraction
  types/            Shared TypeScript types
  utils/            Cache, limits, data-mining config
scripts/            Python helper scripts
.agents/skills/     Source tester and auto-mejora workflows
mcp-bridge.js       stdio to HTTP bridge for MCP clients
Dockerfile          Hugging Face/Docker runtime
```

## Contributing

### Add A Search Source

1. Add or update a provider in `src/providers/`.
2. Export it from `src/providers/index.ts`.
3. Register the source in `src/routes/sources.ts`.
4. Add MCP tool wiring in `src/routes/mcp.ts` if it needs a dedicated tool.
5. Run `npm.cmd run build`.
6. Add or update source tests under `.agents/skills/`.

### Add A DSpace Repository

1. Add the repository metadata in `src/scraping/dspace-resolver.ts`.
2. Include name, domain, handle prefix, and bitstream pattern.
3. Test one handle page and one PDF bitstream.
4. Run `npm.cmd run build`.
5. Re-run source tester and update README metrics only after the run succeeds.

## Roadmap

- Normalize environment variable names and document aliases in one place.
- Generate README tool/source tables automatically from TypeScript constants.
- Add automated MCP smoke tests.
- Add a web dashboard for source health.
- Add Zotero/BibTeX export workflows.
- Add citation graph exploration.
- Expand repository coverage for Bolivia, Paraguay, Venezuela, Cuba, and more Central America.

## License

MIT. See `LICENSE`.

