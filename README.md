# ðŸ”¬ LetXipu Search MCP v7

> **Servidor MCP de bÃºsqueda acadÃ©mica + conversiÃ³n inteligente de documentos**
> 27 herramientas Â· 32+ fuentes Â· MinerU AI Â· Multi-formato Â· OCR 109 idiomas Â· Anti-bloqueo avanzado

---

## âœ¨ What's New in v7

| Feature | v6 | v7 |
|---|---|---|
| **Document Engine** | pymupdf4llm (Python) | **MinerU AI** (Cloud API) |
| **Formats** | PDF only | **PDF, DOCX, PPTX, XLSX, Images** |
| **Python Required** | âœ… Yes | **âŒ No** |
| **GPU Required** | No | **No** |
| **MCP Tools** | 23 | **27** (+4 new) |
| **Table Extraction** | Text-based | **ML-based** (StructEqTable) |
| **Formula Recognition** | None | **LaTeX** (UniMERNet) |
| **OCR** | None | **109 languages** (PaddleOCR) |
| **PDF Sources** | 9 fallback | **11 fallback** (+DSpace PerÃº, Europe PMC) |
| **User-Agents** | 3 (Chrome 121) | **18** (Chrome 128, Firefox 128, Safari 17, Edge, Brave, Opera) |
| **Anti-Detection** | Basic | **Sec-Fetch headers, rate limiting, circuit breaker TTL** |
| **Dockerfile** | Node + Python | **Node.js only** |
| **Config** | .env file | **claude_desktop_config.json** |

### New Tools
- ðŸ”„ `convert_document` â€” Convert any document to Markdown (PDF/DOCX/PPTX/XLSX/IMG)
- ðŸ“¦ `batch_convert` â€” Convert multiple documents in parallel (max 10)
- ðŸ“Š `extract_tables` â€” Extract tables as HTML/Markdown using ML recognition
- ðŸ“ `extract_formulas` â€” Extract mathematical formulas as LaTeX

---

## ðŸš€ Quick Start

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
5. Copy the token

> **Without token:** Flash mode (20 pages / 10MB per file, free)
> **With token:** Precision mode (200 pages / 200MB, 5,000 pages/day, free)

### 3. Configure in Claude Desktop

Edit your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "letxipu": {
      "command": "node",
      "args": ["D:/OTROS/LETXIPU-SEARCH-MCP-V7/mcp-bridge.js"],
      "env": {
        "LETXIPU_URL": "http://localhost:4000/api/mcp",
        "MINERU_API_KEY": "your_token_here"
      }
    }
  }
}
```

> **All API keys go in the `env` section above.** No `.env` file needed.

### 4. Start the Server

```bash
npm run dev    # Development (ts-node)
npm start      # Production (pre-built)
```

---

## âš™ï¸ Configuration

All variables can be set in `claude_desktop_config.json` under `env`:

### Core Configuration

| Variable | Description | Required | Default |
|---|---|---|---|
| `LETXIPU_URL` | MCP server URL | No | `http://localhost:4000/api/mcp` |
| `MINERU_API_KEY` | MinerU API token ([get free](https://mineru.net)) | No | Flash mode |
| `MINERU_API_URL` | MinerU API endpoint | No | `https://mineru.net/api/v4` |
| `PORT` | Server port | No | `4000` |

### Optional API Keys (enhance results but not required)

| Variable | Description |
|---|---|
| `CORE_API_KEY` | CORE.ac.uk â€” increases rate limits |
| `SCOPUS_API_KEY` | Elsevier Scopus â€” paywall access |
| `S2_API_KEY` | Semantic Scholar â€” higher rate limits |
| `SERP_API_KEY` | SerpAPI â€” Google Scholar enhanced |

### Anti-Blocker Configuration

| Variable | Description | Default |
|---|---|---|
| `SCIHUB_MIRRORS` | Custom Sci-Hub mirrors (comma-separated) | `sci-hub.al,sci-hub.mk,...` |
| `BYPASS_DELAY_MS` | Min delay between scraping requests (ms) | `300` |

### Bonus: Add MinerU MCP as standalone

```json
{
  "mcpServers": {
    "letxipu": { "..." : "..." },
    "mineru": {
      "command": "npx",
      "args": ["-y", "mineru-mcp"],
      "env": { "MINERU_API_KEY": "your_token" }
    }
  }
}
```

---

## ðŸ› ï¸ The 27 MCP Tools

### ðŸ” Search (5 tools)
| Tool | Description |
|---|---|
| `batch_search` | Multi-query parallel search across all sources with deduplication |
| `search` | Single query search with source group selection |
| `smart_search` | Auto-generates query variations (ESâ†”ENâ†”PT) for broader coverage |
| `search_conferences` | OpenReview conference papers (ICLR, NeurIPS, ICML) |
| `search_huggingface` | HuggingFace models, datasets, and papers |

### ðŸ“‹ Metadata (3 tools)
| Tool | Description |
|---|---|
| `enrich_metadata` | Batch enrichment of papers with DOI, citations, abstract |
| `fetch_metadata` | Single paper metadata from OpenAlex / Semantic Scholar |
| `download_pdf` | Download PDF via **11-source** resolver (Sci-Hub, Unpaywall, DSpace, etc.) |

### ðŸ“„ Documents (12 tools)
| Tool | Description |
|---|---|
| `read_pdf` | Extract text as Markdown or raw text with page ranges |
| `read_pdf_markdown` | Convert PDF to structured Markdown (MinerU AI engine) |
| `pdf_metadata` | Get document metadata (title, author, pages, size) |
| `pdf_sections` | Detect academic sections (Abstract, Methods, Results, etc.) |
| `pdf_citations` | Extract citation list from academic papers |
| `analyze_academic` | Deep analysis: doc type, language, statistics, 22 section types |
| `extract_section` | Extract specific section by name (fuzzy match, ES/EN) |
| `pdf_smart_summary` | Token-efficient structured summary of academic documents |
| `convert_document` | **NEW** Convert any format (PDF/DOCX/PPTX/XLSX/IMG) to Markdown |
| `batch_convert` | **NEW** Parallel conversion of multiple documents (max 10) |
| `extract_tables` | **NEW** ML-based table extraction as HTML/Markdown |
| `extract_formulas` | **NEW** Mathematical formula extraction as LaTeX |

### ðŸ“š Sources & Utilities (4 tools)
| Tool | Description |
|---|---|
| `list_sources` | List all 32+ available search sources |
| `health_check` | Server status, MinerU API status, source latency |
| `resolve_pdf` | Resolve DOI/URL to direct PDF download link |
| `help` | Interactive help for all tools and features |

---

## ðŸ“Š Supported Document Formats

| Format | Extensions | Features |
|---|---|---|
| **PDF** | `.pdf` | OCR, tables, formulas, layout analysis, scanned docs |
| **Word** | `.docx` | Full text extraction with formatting |
| **PowerPoint** | `.pptx` | Slide text and embedded content |
| **Excel** | `.xlsx` | Sheet data and tables |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.tiff`, `.bmp`, `.webp` | OCR text extraction in 109 languages |

---

## ðŸ›¡ï¸ Anti-Blocker & Bypass System

LetXipu v7 includes a sophisticated multi-layer anti-detection system for reliable access to academic content.

### PDF Resolution Chain (11 Sources)

When you request a PDF, LetXipu tries **11 fallback sources** automatically:

```
 1. Sci-Hub          â†’ 7 mirrors, working ones first (al, mk)
 2. Unpaywall        â†’ Open Access via DOI
 3. CORE             â†’ 300M+ open access works
 4. Semantic Scholar  â†’ PDF links from S2 database
 5. PMC              â†’ PubMed Central full text
 6. DOI.org          â†’ Content negotiation
 7. OA.mg            â†’ Open access search engine
 8. WeLib            â†’ 43M books, 98M papers
 9. Europe PMC       â†’ European biomedical repository âœ¨ NEW
10. DSpace           â†’ 136 LATAM institutional repos âœ¨ NEW
11. Google Scholar   â†’ Last resort (strict rate limit)
```

### Sci-Hub Mirror Management

Based on real-time testing (Jun 2026), mirrors are ordered by reliability:

| Mirror | Status | Notes |
|---|---|---|
| `sci-hub.al` | âœ… **Working** | Returns PDF iframe |
| `sci-hub.mk` | âœ… **Working** | Returns PDF iframe |
| `sci-hub.ru` | âš ï¸ Partial | Responds but may not return PDF |
| `sci-hub.su` | âš ï¸ Partial | Responds but may not return PDF |
| `sci-hub.red` | âš ï¸ Partial | Responds but may not return PDF |
| `sci-hub.st` | âŒ Blocked | Cloudflare 403 |
| `sci-hub.ee` | âŒ Blocked | Cloudflare 403 |

Override mirrors via environment: `SCIHUB_MIRRORS=sci-hub.al,sci-hub.mk`

### Anti-Detection Features

| Feature | Description |
|---|---|
| **18 User-Agents** | Chrome 126-128, Firefox 127-128, Safari 17.5, Edge 128, Brave, Opera, Vivaldi, ChromeOS |
| **Sec-Fetch-\* Headers** | Automatic Chrome-like `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`, `Sec-Fetch-User` |
| **Sec-Ch-Ua Headers** | Realistic browser client hints (`Sec-Ch-Ua`, `Sec-Ch-Ua-Platform`, `Sec-Ch-Ua-Mobile`) |
| **Accept-Language Rotation** | Cycles through `es-PE`, `es-ES`, `en-US`, `pt-BR`, `es-419` |
| **Per-Domain Rate Limits** | Google Scholar: 20s, Google: 10s, Semantic Scholar: 1s, default: 300ms |
| **Jitter** | Random delays (500-2000ms) added to backoff timers to avoid pattern detection |
| **Circuit Breaker + TTL** | Domains auto-blocked after 3 failures, **auto-reset after 5 minutes** (v6 was permanent) |
| **SSL Bypass** | Automatic fallback to insecure fetch for expired/self-signed certificates |
| **Anubis PoW Solver** | Proof-of-work challenge solver for Anubis-protected sites |
| **Bot Detection** | Detects Cloudflare, Turnstile, CAPTCHA, Anubis challenges (10 keywords) |
| **Domain-Specific Referers** | Google referer for most sites, no referer for Sci-Hub |

### DSpace Repositories â€” Peruvian Universities

LetXipu automatically detects and resolves PDFs from **136 LATAMvian institutional DSpace repositories** (universities, institutes, government entities):

<details>
<summary><b>ðŸ›ï¸ Universidades Nacionales (40+ repos)</b></summary>

| Universidad | Dominio | Latencia |
|---|---|---|
| UNMSM | `cybertesis.unmsm.edu.pe` | 81ms |
| PUCP | `tesis.pucp.edu.pe` | 483ms |
| UNSA (Arequipa) | `repositorio.unsa.edu.pe` | 938ms |
| UNSAAC (Cusco) | `repositorio.unsaac.edu.pe` | 552ms |
| UNAC (Callao) | `repositorio.unac.edu.pe` | 248ms |
| UNCP (Huancayo) | `repositorio.uncp.edu.pe` | 253ms |
| UNFV (Villarreal) | `repositorio.unfv.edu.pe` | âœ… |
| UNALM (La Molina) | `repositorio.lamolina.edu.pe` | âœ… |
| UNDAC (Cerro de Pasco) | `repositorio.undac.edu.pe` | âœ… |
| UNCajamarca | `repositorio.unc.edu.pe` | âœ… |
| UNHEVAL (HuÃ¡nuco) | `repositorio.unheval.edu.pe` | âœ… |
| UNJFSC (Huacho) | `repositorio.unjfsc.edu.pe` | âœ… |
| UNTRM (Amazonas) | `repositorio.untrm.edu.pe` | âœ… |
| UNICA (Ica) | `repositorio.unica.edu.pe` | 4414ms |
| UNBarranca | `repositorio.unab.edu.pe` | 639ms |
| UNCaÃ±ete | `repositorio.undc.edu.pe` | 687ms |
| UNFrontera | `repositorio.unf.edu.pe` | 4821ms |
| UNJuliaca | `repositorio.unaj.edu.pe` | 2641ms |
| UNChota | `repositorio.unach.edu.pe` | 4127ms |
| UNHuanta | `repositorio.unah.edu.pe` | 3068ms |
| UNMÃºsica | `repositorio.unm.edu.pe` | 1452ms |
| UNAMAD (Madre de Dios) | `repositorio.unamad.edu.pe` | 432ms |
| UNSM (San MartÃ­n) | `repositorio.unsm.edu.pe` | 528ms |
| UNSanta | `repositorio.uns.edu.pe` | âœ… |
| UNPiura | `repositorio.unp.edu.pe` | âœ… |
| UNIA (Intercultural) | `repositorio.unia.edu.pe` | 1389ms |
| + UNPRG, UNAS, UNAMBA y mÃ¡s... | | |

</details>

<details>
<summary><b>ðŸŽ“ Universidades Privadas (35+ repos)</b></summary>

| Universidad | Dominio | Latencia |
|---|---|---|
| USMP | `repositorio.usmp.edu.pe` | 83ms |
| UP (PacÃ­fico) | `repositorio.up.edu.pe` | 102ms |
| UPLA (Los Andes) | `repositorio.upla.edu.pe` | 131ms |
| UIGV (Garcilaso) | `repositorio.uigv.edu.pe` | 129ms |
| UCSS (Sedes Sapientiae) | `repositorio.ucss.edu.pe` | 165ms |
| UPSJB (San Juan Bautista) | `repositorio.upsjb.edu.pe` | 168ms |
| MarÃ­a Auxiliadora | `repositorio.uma.edu.pe` | 177ms |
| UPN | `repositorio.upn.edu.pe` | 201ms |
| UPAO (Antenor Orrego) | `repositorio.upao.edu.pe` | 212ms |
| UAndina (Cusco) | `repositorio.uandina.edu.pe` | 219ms |
| UDH (HuÃ¡nuco) | `repositorio.udh.edu.pe` | 294ms |
| UContinental | `repositorio.continental.edu.pe` | 585ms |
| USS (SeÃ±or de SipÃ¡n) | `repositorio.uss.edu.pe` | 660ms |
| Champagnat | `repositorio.umch.edu.pe` | 827ms |
| UTEC | `repositorio.utec.edu.pe` | 995ms |
| ULADECH | `repositorio.uladech.edu.pe` | 1038ms |
| URP (Ricardo Palma) | `repositorio.urp.edu.pe` | 1099ms |
| UCH (Ciencias y Humanidades) | `repositorio.uch.edu.pe` | 1133ms |
| NorbertWiener | `repositorio.uwiener.edu.pe` | 1192ms |
| USIL | `repositorio.usil.edu.pe` | 1203ms |
| ESAN | `repositorio.esan.edu.pe` | 1201ms |
| UCSP (San Pablo) | `repositorio.ucsp.edu.pe` | 1379ms |
| UAP (Alas Peruanas) | `repositorio.uap.edu.pe` | 1425ms |
| UCV (CÃ©sar Vallejo) | `repositorio.ucv.edu.pe` | 1480ms |
| USAT (Santo Toribio) | `repositorio.usat.edu.pe` | 1547ms |
| UCientÃ­fica | `repositorio.cientifica.edu.pe` | 1557ms |
| UPCH (Cayetano Heredia) | `repositorio.upch.edu.pe` | 1693ms |
| Le Cordon Bleu | `repositorio.ulcb.edu.pe` | 1855ms |
| UTEA (Los Andes) | `repositorio.utea.edu.pe` | 2012ms |
| UPeU (Peruana UniÃ³n) | `repositorio.upeu.edu.pe` | 2623ms |
| UCSM (Santa MarÃ­a) | `repositorio.ucsm.edu.pe` | 3254ms |
| + UPC, ULIMA, UAustral, LaSalle y mÃ¡s... | | |

</details>

<details>
<summary><b>ðŸ¢ Institutos y Gobierno (9 repos)</b></summary>

| InstituciÃ³n | Dominio | Latencia |
|---|---|---|
| RENATI-SUNEDU | `renati.sunedu.gob.pe` | 93ms |
| INDECOPI | `repositorio.indecopi.gob.pe` | 108ms |
| INGEMMET | `repositorio.ingemmet.gob.pe` | 166ms |
| MINCULTURA | `repositorio.cultura.gob.pe` | 265ms |
| Toulouse Lautrec | `repositorio.tls.edu.pe` | 452ms |
| IPEN | `repositorio.ipen.gob.pe` | 792ms |
| CONCYTEC-ALICIA | `alicia.concytec.gob.pe` | 991ms |
| IMARPE | `repositorio.imarpe.gob.pe` | 1241ms |
| MINEDU | `repositorio.minedu.gob.pe` | 1349ms |
| IEP | `repositorio.iep.org.pe` | 2208ms |
| IIAP | `repositorio.iiap.gob.pe` | 3656ms |

</details>

The DSpace resolver:
1. Detects DSpace handle URLs (`/handle/20.500.xxxxx/`)
2. Fetches the handle page HTML
3. Parses 3 bitstream URL patterns
4. Downloads the actual PDF with proper session headers
5. Falls back to constructed bitstream URLs if no links found

Any DSpace repository worldwide is automatically detected (not just Peru).

---

## ðŸ—ï¸ Architecture

```
Claude Desktop / Cursor / Antigravity
        â”‚
        â”‚ MCP Protocol (stdio)
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  mcp-bridge.js   â”‚ â† Translates stdio â†” HTTP
â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚ HTTP POST
         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  LetXipu Search MCP v7 (Node.js :4000)                  â”‚
â”‚                                                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”‚
â”‚  â”‚ 27 MCP Toolsâ”‚  â”‚  MinerU Client       â”‚              â”‚
â”‚  â”‚ (mcp.ts)    â”‚â†’ â”‚  (mineru-client.ts)  â”‚              â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â”‚
â”‚                          â”‚                                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”‚
â”‚  â”‚ Search      â”‚  â”‚  pdf-processor.ts    â”‚              â”‚
â”‚  â”‚ Providers   â”‚  â”‚  (fallback chain)    â”‚              â”‚
â”‚  â”‚ (32+ APIs)  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                         â”‚
â”‚                                                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”‚
â”‚  â”‚  Anti-Blocker System                   â”‚              â”‚
â”‚  â”‚  â”œâ”€â”€ resilient-fetch.ts (18 UAs)       â”‚              â”‚
â”‚  â”‚  â”œâ”€â”€ anubis-solver.ts (PoW)            â”‚              â”‚
â”‚  â”‚  â”œâ”€â”€ dspace-resolver.ts (136 repos)     â”‚              â”‚
â”‚  â”‚  â””â”€â”€ pdf-resolver.ts (11 sources)      â”‚              â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚               â”‚
           â–¼               â–¼
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚ OpenAlex â”‚    â”‚ mineru.net   â”‚    â”‚ DSpace Repos â”‚
    â”‚ Semantic â”‚    â”‚ Cloud API    â”‚    â”‚ (13 PerÃº +   â”‚
    â”‚ Scholar  â”‚    â”‚ (6 AI models)â”‚    â”‚  any worldwide)
    â”‚ CORE     â”‚    â”‚ FREE         â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”‚ 32+ APIs â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Document Conversion Fallback Chain

```
URL Input
  â”‚
  â”œâ”€ MINERU_API_KEY configured?
  â”‚    â”œâ”€â”€ YES â†’ MinerU Cloud API (precision mode)
  â”‚    â”‚         â”œâ”€â”€ Submit URL â†’ Poll status â†’ Download ZIP â†’ Extract full.md
  â”‚    â”‚         â”œâ”€â”€ Supports: PDF, DOCX, PPTX, XLSX, PNG, JPG, TIFF, BMP, WEBP
  â”‚    â”‚         â””â”€â”€ Features: OCR (109 langs), Tables (ML), Formulas (LaTeX)
  â”‚    â”‚
  â”‚    â””â”€â”€ NO â†’ MarkItDown (pymupdf4llm, local Python)
  â”‚              â””â”€â”€ Fallback â†’ pdf-parse (basic text extraction)
  â”‚
  â””â”€ PDF Not Found? â†’ 11-Source Resolver
       â”œâ”€â”€ Sci-Hub (7 mirrors)
       â”œâ”€â”€ Unpaywall, CORE, Semantic Scholar, PMC
       â”œâ”€â”€ DOI.org, OA.mg, WeLib, Europe PMC
       â”œâ”€â”€ DSpace (136 LATAM institutions)
       â””â”€â”€ Google Scholar (last resort)
```

---

## ðŸ³ Docker

```bash
docker build -t letxipu-mcp-v7 .
docker run -p 4000:7860 \
  -e MINERU_API_KEY=your_token \
  letxipu-mcp-v7
```

**Image size:** ~200MB (Node.js only, no Python/GPU)

### HuggingFace Spaces

Works on **free tier** â€” no GPU needed. MinerU runs via cloud API.

---

## ðŸŒ Search Sources (32+)

### Global Academic
| Source | API Key | Coverage |
|---|---|---|
| OpenAlex | âŒ Not needed | 250M+ works |
| Semantic Scholar | Optional | 200M+ papers |
| CORE | Optional | 300M+ works |
| PubMed / PMC | âŒ Not needed | 36M+ biomedical |
| ArXiv | âŒ Not needed | 2.4M+ preprints |
| DBLP | âŒ Not needed | 6M+ CS papers |
| OpenReview | âŒ Not needed | ICLR, NeurIPS, ICML |
| PapersWithCode | âŒ Not needed | ML papers + code |
| HuggingFace | âŒ Not needed | Models & datasets |
| Europe PMC | âŒ Not needed | European biomedical |

### Latin America (16+ repositories)
| Source | Country | Coverage |
|---|---|---|
| SciELO | Multi-country | 900K+ papers |
| Redalyc | Mexico/LATAM | 700K+ papers |
| CLACSO | Argentina | Social sciences |
| La Referencia | Multi-country | 3M+ theses & papers |
| ALICIA | ðŸ‡µðŸ‡ª Peru | CONCYTEC national repo |
| RENATI | ðŸ‡µðŸ‡ª Peru | SUNEDU thesis registry |
| BDTD | ðŸ‡§ðŸ‡· Brazil | 800K+ theses |
| SciELO Preprints | Multi-country | Preprints |
| + 10 more | Various | National repositories |

### Peruvian Institutional DSpace (136 repos)
Automatic thesis/paper resolution from 136 institutional repos: 40+ national universities, 35+ private universities, 9 government institutes (SUNEDU, CONCYTEC, MINEDU, INDECOPI, IMARPE, INGEMMET, IIAP, IPEN, IEP).

---

## ðŸ“¡ REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/mcp` | MCP JSON-RPC 2.0 (main) |
| POST | `/api/search` | Multi-source search |
| POST | `/api/metadata/enrich` | Batch metadata enrichment |
| POST | `/api/metadata/fetch` | Single paper metadata |
| POST | `/api/pdf/download` | PDF download |
| POST | `/api/pdf/read` | PDF text extraction |
| POST | `/api/pdf/metadata` | PDF metadata |
| POST | `/api/pdf/sections` | Academic sections |
| POST | `/api/pdf/citations` | Citation extraction |
| GET | `/api/sources` | Source catalog |
| GET | `/health` | Health check |

---

## ðŸ“œ Changelog

### v7.1 â€” Anti-Blocker Upgrade (Jun 2026)

#### Added
- `dspace-resolver.ts` â€” DSpace PDF extractor for 136 LATAMvian institutions (universities, institutes, government)
- `tryEuropePmc()` â€” Europe PMC as PDF source #9
- 18 modern User-Agents (Chrome 126-128, Firefox 127-128, Safari 17, Edge, Brave, Opera, Vivaldi)
- `Sec-Fetch-*` and `Sec-Ch-Ua` headers for Chrome-like anti-detection
- Per-domain rate limiting (Google Scholar: 20s, Google: 10s)
- Accept-Language rotation (es-PE, es-ES, en-US, pt-BR, es-419)
- Circuit breaker auto-reset after 5 minutes (was permanent)
- Jitter on exponential backoff timers
- 5 new bot detection keywords (Turnstile, CAPTCHA, Anubis, cf-browser-verification, recaptcha)
- `SCIHUB_MIRRORS` env variable for custom mirror list

#### Changed
- Sci-Hub mirrors reordered: `sci-hub.al` and `sci-hub.mk` first (only 2 that work)
- Removed dead mirrors: `sci-hub.box`, `sci-hub.pub`
- PDF resolution chain: 9 â†’ **11 sources** (+DSpace, +Europe PMC)
- All User-Agents updated from Chrome 121 to Chrome 128

### v7.0 â€” MinerU AI Engine (Jun 2026)

#### Added
- `mineru-client.ts` â€” MinerU Cloud API client
- `convert_document` tool â€” Multi-format document conversion
- `batch_convert` tool â€” Parallel batch conversion
- `extract_tables` tool â€” ML-based table extraction
- `extract_formulas` tool â€” LaTeX formula extraction
- MinerU health check in `health_check` tool
- Support for DOCX, PPTX, XLSX, and image formats
- OCR support for 109 languages via MinerU AI

#### Removed
- Python dependency for document conversion (optional fallback only)

#### Changed
- All API keys configurable via `claude_desktop_config.json` `env` section
- Dockerfile simplified to Node.js only (~200MB vs ~2GB)

---

## ðŸ“„ License

MIT License. See [LICENSE](LICENSE) for details.

---

## ðŸ™ Credits

- **MinerU** by [OpenDataLab](https://github.com/opendatalab/MinerU) â€” Document AI engine
- **OpenAlex** â€” Open academic metadata
- **Semantic Scholar** â€” AI-powered academic search
- **CORE** â€” Open access research aggregator
- **SciELO / Redalyc / CLACSO** â€” Latin American academic repositories
- **Europe PMC** â€” European biomedical literature
- **PUCP / UNMSM / UNSA** and all Peruvian universities â€” DSpace repositories

