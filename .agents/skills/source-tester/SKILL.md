---
name: source-tester
description: >
  Auto-test and self-improve all academic source routes. Tests 169+ sources
  (84 Peru institutions from ALICIA, Sci-Hub, OA APIs, LATAM, International).
  Automatically updates dspace-resolver.ts and pdf-resolver.ts based on results.
  Tracks history to detect trends. Rolls back on build failure.
---

# Source Tester & Auto-Improver Skill

## Purpose

This skill tests ALL academic sources and **automatically improves** the codebase:
- Discovers new working repos → adds them to `dspace-resolver.ts`
- Reorders Sci-Hub mirrors by latency → updates `pdf-resolver.ts`
- Detects dead/blocked sources → suggests removal
- Tracks trends over time → `test_history.json`
- Rolls back changes if build fails

## When to Use

- User says: "test sources", "automejorar", "self-improve", "probar fuentes"
- Periodically to keep source data fresh
- After adding new repos or changing mirrors
- When PDF resolution starts failing

## Quick Start

### One command — full pipeline:
```powershell
powershell -ExecutionPolicy Bypass -File "d:\OTROS\LETXIPU-SEARCH-MCP-V7\.agents\skills\source-tester\scripts\auto_improve_master.ps1"
```

### Dry run (no changes applied):
```powershell
powershell -ExecutionPolicy Bypass -File "d:\OTROS\LETXIPU-SEARCH-MCP-V7\.agents\skills\source-tester\scripts\auto_improve_master.ps1" -DryRun
```

## Pipeline Phases

```
Phase 1: TEST    → Run test_all_sources.ps1 (169+ URLs, 4s timeout each)
Phase 2: ANALYZE → Compare with previous results, find new/dead repos
Phase 3: APPLY   → Update dspace-resolver.ts + pdf-resolver.ts
Phase 4: BUILD   → npm run build (rollback on failure via git checkout)
Phase 5: HISTORY → Save results to test_history.json for trend tracking
```

## What Gets Tested (169+ sources)

### A. Sci-Hub Mirrors (10)
Tests each mirror with a real DOI, checks if PDF iframe is returned.
Auto-reorders mirrors by: PDF confirmed first → latency.

### B. Open Access APIs (8)
Unpaywall, CORE, Semantic Scholar, Europe PMC, DOI.org, OA.mg, OpenAlex, CrossRef.

### C. Peru Universities (106)
ALL universities from ALICIA CONCYTEC — nacionales + privadas.
Tests repository landing pages. New working repos auto-added to `dspace-resolver.ts`.

### D. Peru Institutes & Government (15)
CONCYTEC, SUNEDU/RENATI, IMARPE, INIA, INGEMMET, IEP, IIAP, IPEN, INDECOPI,
MINEDU, MINCULTURA, Escuela Militar, Toulouse, Newman.

### E. LATAM Repositories (18)
SciELO (7 countries), Redalyc, CLACSO, La Referencia, BDTD, Dialnet, LUME,
RRAAE, UNAM México, UChile, UBA Argentina.

### F. International (12)
arXiv, PubMed, PMC, DBLP, PapersWithCode, DOAJ, Internet Archive, OpenAlex,
CrossRef, HuggingFace, OpenReview.

## Auto-Improvement Logic

### Adding New Repos
When a Peru university repo responds (status=working) but is NOT in
`dspace-resolver.ts`, the master script:
1. Extracts domain from URL
2. Generates a DSpace repo entry
3. Inserts it before the closing `];`
4. Rebuilds → rolls back if build fails

### Sci-Hub Mirror Reorder
1. Tests all 10 mirrors with real DOI
2. Separates: PDF confirmed > working > partial > dead
3. Within each tier, sorts by latency
4. Updates mirror order in `pdf-resolver.ts`

### Build Safety
- Always runs `npm run build` after changes
- On build failure → `git checkout` restores original files
- Re-runs build to confirm rollback

### History Tracking
Each run saves to `test_history.json`:
```json
{
  "timestamp": "2026-06-27T05:00:00Z",
  "total": 169,
  "working": 110,
  "peru_working": 66,
  "new_repos_added": 8,
  "changes_made": 2,
  "best_mirrors": ["sci-hub.mk", "sci-hub.al"],
  "dead_in_list": ["ULIMA"]
}
```
Compare runs to detect:
- Sources going down (need bypass fix)
- Sources coming back (re-enable)
- Latency trends (rate limiting detection)

## Individual Scripts

| Script | Purpose |
|---|---|
| `auto_improve_master.ps1` | Full pipeline: test → analyze → fix → build → verify |
| `test_all_sources.ps1` | Test only (no code changes) |
| `auto_improve.ps1` | Analyze only (reads results, prints recommendations) |

## File Structure

```
.agents/skills/source-tester/
├── SKILL.md                           # This file
├── scripts/
│   ├── auto_improve_master.ps1        # Full auto-improve pipeline
│   ├── test_all_sources.ps1           # Test 169+ sources
│   └── auto_improve.ps1              # Analyze results only
└── references/
    ├── last_test_results.json         # Latest test results
    ├── improvement_report.json        # Last improvement report
    └── test_history.json              # Historical trend data
```

## Coverage Architecture

```
ALICIA CONCYTEC (173+ institutions)
     │
     ├── searchAlicia() ──→ Search ALL institutions
     ├── searchRenati() ──→ SUNEDU thesis search
     │
     └── When result has handleUrl:
           │
           ├── Known repo (84) ──→ Optimized bitstream URL
           │   dspace-resolver.ts
           │
           └── Unknown repo ──→ Generic DSpace detection
               Any URL with /handle/ or /bitstream/
               Parses HTML → finds PDF links
```

All 173+ ALICIA institutions work for search.
84 known repos get optimized PDF downloads.
Unknown repos use generic DSpace parsing (also works, just slower).
