/**
 * POST /api/mcp - JSON-RPC 2.0 MCP Server v7.0.0
 * 27 tools: batch-first search, enrichment, multi-format document converter (MinerU AI), source listing, and LatAm expansion
 */

import { Router, Request, Response } from 'express';
import { extractText, extractMarkdown, getMetadata, detectSections, extractCitations, analyzeAcademicDocument, extractSection, smartSummary } from '../providers/pdf-processor';
import { isPythonAvailable, getMarkdownCacheStats, checkMineruHealth, convertDocument, batchConvert, extractTablesFromDocument, extractFormulasFromDocument, isSupportedFormat, getSupportedFormats } from '../providers/mineru-client';
import { resolvePdfUrl, ResolvedPdfUrl } from '../providers/pdf-resolver';
import { fetchWithTimeout, decodeInvertedIndex } from '../providers/base';
import { SEARCH_LIMITS } from '../utils/search-limits';
import { getCached, setCache, cacheKey } from '../utils/cache';

const router = Router();

const MCP_SERVER_INFO = {
    name: 'letxipu-search-mcp',
    version: '7.0.0',
    protocolVersion: '2024-11-05',
};

const MCP_TOOLS = [
    {
        name: 'batch_search',
        description: 'Preferred search tool in V5. Runs multiple queries in parallel across multiple source groups, then globally deduplicates results. Best for broad literature discovery and LatAm coverage.',
        inputSchema: {
            type: 'object',
            properties: {
                queries: { type: 'array', items: { type: 'string' }, description: 'Array of search queries (max 6). You may pass one query for a single batch.' },
                query: { type: 'string', description: 'Optional single query fallback when queries is not provided.' },
                sources: { type: 'array', items: { type: 'string' }, description: 'Source IDs or groups (default: ["latam", "global"]). Try ["tesis"] for repositories or ["iberoamerica"] for LatAm + Spain.' },
                maxResults: { type: 'number', description: 'Max total results after dedup (default 60, max 120)' },
                yearStart: { type: 'string', description: 'Filter by start year (e.g. "2020")' },
                yearEnd: { type: 'string', description: 'Filter by end year (e.g. "2024")' },
                university: { type: 'string', description: 'Filter by university name' },
            },
            required: []
        }
    },
    {
        name: 'search',
        description: 'Single-query academic search across 32+ sources. For best recall use batch_search, which queries multiple variants and sources in parallel.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                sources: { type: 'array', items: { type: 'string' }, description: 'Source IDs or groups: "latam", "global", "tesis", "iberoamerica", "peru", "all", or specific IDs.' },
                maxSources: { type: 'number', description: 'Max results to return (default 50)' },
                yearStart: { type: 'string', description: 'Filter by start year (e.g. "2020")' },
                yearEnd: { type: 'string', description: 'Filter by end year (e.g. "2024")' },
                university: { type: 'string', description: 'Filter by university name' },
            },
            required: ['query']
        }
    },
    {
        name: 'smart_search',
        description: 'Intelligent multi-query academic search. Generates query variations (synonyms, ES/EN/PT translations, broader/narrower terms) and searches across multiple sources. Deduplicates results.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Main search query (in any language)' },
                sources: { type: 'array', items: { type: 'string' }, description: 'Source groups (default: ["global", "latam"])' },
                maxResults: { type: 'number', description: 'Max total results after dedup (default 30)' },
                yearStart: { type: 'string', description: 'Filter by start year' },
                yearEnd: { type: 'string', description: 'Filter by end year' },
            },
            required: ['query']
        }
    },
    {
        name: 'enrich_metadata',
        description: 'Enrich paper metadata (abstract, DOI, year, university, authors, PDF URL) using OpenAlex, Crossref, Semantic Scholar, DSpace 7, and HTML scraping',
        inputSchema: {
            type: 'object',
            properties: {
                papers: { type: 'array', description: 'Array of paper objects to enrich' }
            },
            required: ['papers']
        }
    },
    {
        name: 'fetch_metadata',
        description: 'Fetch complete metadata for a single paper by DOI, URL, or title. Returns completenessScore, enrichedFields, repoHandleUrl, pdfUrl.',
        inputSchema: {
            type: 'object',
            properties: {
                doi: { type: 'string', description: 'Paper DOI (e.g. "10.1038/s41586-020-2649-2")' },
                url: { type: 'string', description: 'Paper URL or repository handle' },
                title: { type: 'string', description: 'Paper title for search' },
            }
        }
    },
    {
        name: 'recover_metadata',
        description: 'Deep metadata recovery from any identifier (DOI, URL, handle, or title). Chains OpenAlex → Crossref → Semantic Scholar → DSpace7 → HTML scraping → ALICIA to recover maximum metadata.',
        inputSchema: {
            type: 'object',
            properties: {
                doi: { type: 'string', description: 'Paper DOI' },
                url: { type: 'string', description: 'Paper URL or handle' },
                title: { type: 'string', description: 'Paper title' },
            }
        }
    },
    {
        name: 'download_pdf',
        description: 'Resolve and get PDF download URL from DOI, repository URL, or PMC URL. Uses 9 fallback sources including Sci-Hub, Unpaywall, CORE, Semantic Scholar, PMC, OA.mg, WeLib, Google Scholar.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Paper URL' },
                doi: { type: 'string', description: 'Paper DOI' },
            }
        }
    },
    {
        name: 'resolve_pdf',
        description: 'Resolve the final PDF URL without downloading. Returns the URL, resolution source, and steps taken. Faster than download_pdf — no file transfer.',
        inputSchema: {
            type: 'object',
            properties: {
                identifier: { type: 'string', description: 'DOI, URL, handle, title, or filename to resolve' },
            },
            required: ['identifier']
        }
    },
    {
        name: 'list_sources',
        description: 'List all available search sources with their IDs and descriptions',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'health_check',
        description: 'Check connectivity to all configured academic sources and API keys. Returns status, latency, and configured keys.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'help',
        description: 'Get help and usage examples for any tool or source. Pass a tool name, source name, or "all" for complete documentation.',
        inputSchema: {
            type: 'object',
            properties: {
                topic: { type: 'string', description: 'Tool name (e.g. "search", "smart_search"), source name (e.g. "alicia", "openalex"), or "all"' },
            }
        }
    },
    // Specialized search tools
    {
        name: 'search_dblp',
        description: 'Search DBLP Computer Science Bibliography for publications, authors, venues. Returns BibTeX-ready results. No API key needed.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query (author name, paper title, or topic)' },
                maxResults: { type: 'number', description: 'Max results to return (default 25)' },
            },
            required: ['query']
        }
    },
    {
        name: 'search_paperswithcode',
        description: 'Search Papers With Code for research papers that have source code, benchmarks, datasets, and methods. No API key needed.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query (topic, method, or paper title)' },
                maxResults: { type: 'number', description: 'Max results to return (default 25)' },
            },
            required: ['query']
        }
    },
    {
        name: 'trending_papers',
        description: 'Get trending AI/ML papers from HuggingFace Daily Papers. Optionally filter by topic. No API key needed.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Optional: filter by topic (e.g. "language model", "diffusion"). Leave empty for all trending papers.' },
                maxResults: { type: 'number', description: 'Max results to return (default 25)' },
            }
        }
    },
    {
        name: 'search_conferences',
        description: 'Search OpenReview for conference papers (ICLR, NeurIPS, ICML, etc.). No API key needed.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query (topic or paper title)' },
                maxResults: { type: 'number', description: 'Max results to return (default 25)' },
            },
            required: ['query']
        }
    },
    // PDF tools
    {
        name: 'read_pdf',
        description: 'Extract text from a PDF as structured Markdown (via MinerU AI with OCR, table & formula recognition) or raw text. Supports character limits and page ranges for token efficiency. Accepts URL, DOI, or local file path.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL, DOI, or local file path' },
                maxChars: { type: 'number', description: 'Max characters to return (default 20000). Use -1 for no limit.' },
                pages: { type: 'string', description: 'Page range: "1-5", "1,3,7", "last3", "first5". Default: all pages.' },
                format: { type: 'string', description: 'Output format: "markdown" (default, structured) or "text" (raw)' },
            },
            required: ['source']
        }
    },
    {
        name: 'pdf_metadata',
        description: 'Get PDF document metadata: title, author, page count, creation date, file size.',
        inputSchema: {
            type: 'object',
            properties: { source: { type: 'string', description: 'PDF URL or local file path' } },
            required: ['source']
        }
    },
    {
        name: 'pdf_sections',
        description: 'Detect academic paper sections (Abstract, Introduction, Methods, Results, Conclusion, References, etc.) from a PDF.',
        inputSchema: {
            type: 'object',
            properties: { source: { type: 'string', description: 'PDF URL or local file path' } },
            required: ['source']
        }
    },
    {
        name: 'pdf_citations',
        description: 'Extract citations and reference list from a PDF academic paper. Parses numbered [1] and author-year styles.',
        inputSchema: {
            type: 'object',
            properties: { source: { type: 'string', description: 'PDF URL or local file path' } },
            required: ['source']
        }
    },
    {
        name: 'analyze_academic',
        description: 'Deep analysis of academic documents (theses and articles). Detects document type, language, 22 section types, and extracts statistical data (p-values, correlations, ANOVA, chi², regressions, sample sizes).',
        inputSchema: {
            type: 'object',
            properties: { source: { type: 'string', description: 'PDF URL or local file path' } },
            required: ['source']
        }
    },
    {
        name: 'extract_section',
        description: 'Extract a specific section from a PDF by name (e.g. "metodología", "marco teórico", "results", "conclusiones"). Returns FULL text with no character limit. Supports fuzzy matching in Spanish and English.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL or local file path' },
                section: { type: 'string', description: 'Section name to extract' },
            },
            required: ['source', 'section']
        }
    },
    {
        name: 'read_pdf_markdown',
        description: 'Convert PDF to structured Markdown preserving headings, tables, and lists. Uses MinerU AI engine with OCR and layout analysis. Much more token-efficient than read_pdf for LLM consumption. Supports page range selection.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL, DOI, or file path' },
                maxChars: { type: 'number', description: 'Max characters to return (default 30000). Use -1 for no limit.' },
                pages: { type: 'string', description: 'Page range: "1-5", "1,3,7", "last3", "first5". Default: all pages.' },
            },
            required: ['source']
        }
    },
    {
        name: 'pdf_smart_summary',
        description: 'Get a token-efficient summary of a PDF academic document. Returns structured overview with key sections (abstract, methods, results, conclusions) truncated to fit within token budget. Best first tool to call before diving deeper into a PDF.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL, DOI, or file path' },
                maxTotalChars: { type: 'number', description: 'Total character budget (default 8000)' },
            },
            required: ['source']
        }
    },
    // V7: Multi-format document tools (MinerU AI)
    {
        name: 'convert_document',
        description: 'Convert any document (PDF, DOCX, PPTX, XLSX, images) to structured Markdown using MinerU AI. Supports OCR for scanned documents in 109 languages, table recognition, and formula-to-LaTeX conversion.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'File path, URL, or DOI to convert' },
                maxChars: { type: 'number', description: 'Max characters (default 30000, -1 for no limit)' },
            },
            required: ['source']
        }
    },
    {
        name: 'batch_convert',
        description: 'Convert multiple documents to Markdown in parallel using MinerU AI. Returns summary per document. Max 10 files per batch.',
        inputSchema: {
            type: 'object',
            properties: {
                sources: { type: 'array', items: { type: 'string' }, description: 'Array of file paths/URLs/DOIs (max 10)' },
                maxCharsPerDoc: { type: 'number', description: 'Max chars per doc (default 10000)' },
            },
            required: ['sources']
        }
    },
    {
        name: 'extract_tables',
        description: 'Extract all tables from a document as HTML or Markdown using MinerU ML-based table recognition. Handles rotated, cross-page, and merged-cell tables.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Document path, URL, or DOI' },
                format: { type: 'string', description: '"html" (default, structured) or "markdown" (pipe tables)' },
            },
            required: ['source']
        }
    },
    {
        name: 'extract_formulas',
        description: 'Extract all mathematical formulas as LaTeX from a document using MinerU UniMERNet formula recognition. Handles complex nested expressions, multi-line, and display math.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Document path, URL, or DOI' },
            },
            required: ['source']
        }
    },
];

// ─── Smart Search: Query Variation Generator (V5 Enhanced) ──────

function generateQueryVariations(query: string): string[] {
    const variations = new Set<string>();
    variations.add(query);

    // ES↔EN↔PT translation pairs for academic terms
    const translations: [RegExp, string][] = [
        // ES ↔ EN
        [/\belicitaci[oó]n\b/i, 'elicitation'],
        [/\belicitation\b/i, 'elicitación'],
        [/\b[aá]cido\s+salic[ií]lico\b/i, 'salicylic acid'],
        [/\bsalicylic\s+acid\b/i, 'ácido salicílico'],
        [/\bmetabolitos?\s+secundarios?\b/i, 'secondary metabolites'],
        [/\bsecondary\s+metabolites?\b/i, 'metabolitos secundarios'],
        [/\bbiotecnolog[ií]a\b/i, 'biotechnology'],
        [/\bbiotechnology\b/i, 'biotecnología'],
        [/\bcultivo\s+(de\s+)?tejidos?\b/i, 'tissue culture'],
        [/\btissue\s+culture\b/i, 'cultivo de tejidos'],
        [/\bin\s+vitro\b/i, 'in vitro'],
        [/\bproducci[oó]n\b/i, 'production'],
        [/\bproduction\b/i, 'producción'],
        [/\bestevi[oa]\b/i, 'stevia'],
        [/\bestevi[oó]sidos?\b/i, 'stevioside'],
        [/\bstevioside\b/i, 'esteviósido'],
        [/\bcompuestos?\s+fen[oó]licos?\b/i, 'phenolic compounds'],
        [/\bphenolic\s+compounds?\b/i, 'compuestos fenólicos'],
        [/\bactividad\s+antioxidante\b/i, 'antioxidant activity'],
        [/\bantioxidant\s+activity\b/i, 'actividad antioxidante'],
        [/\bmachine\s+learning\b/i, 'aprendizaje automático'],
        [/\baprendizaje\s+(autom[aá]tico|de\s+m[aá]quina)\b/i, 'machine learning'],
        [/\binteligencia\s+artificial\b/i, 'artificial intelligence'],
        [/\bartificial\s+intelligence\b/i, 'inteligencia artificial'],
        [/\bred\s+neuronal\b/i, 'neural network'],
        [/\bneural\s+network\b/i, 'red neuronal'],
        [/\bdeep\s+learning\b/i, 'aprendizaje profundo'],
        [/\baprendizaje\s+profundo\b/i, 'deep learning'],
        [/\breinforcement\s+learning\b/i, 'aprendizaje por refuerzo'],
        [/\baprendizaje\s+por\s+refuerzo\b/i, 'reinforcement learning'],
        // ES ↔ PT (for Oasisbr coverage)
        [/\binvestigaci[oó]n\b/i, 'pesquisa'],
        [/\bpesquisa\b/i, 'investigación'],
        [/\buniversidad\b/i, 'universidade'],
        [/\bdesarrollo\b/i, 'desenvolvimento'],
        [/\bevaluaci[oó]n\b/i, 'avaliação'],
        [/\bsalud\b/i, 'saúde'],
        [/\benfermedad\b/i, 'doença'],
        [/\btratamiento\b/i, 'tratamento'],
    ];

    let translatedQuery = query;
    let matchedTranslation = false;
    for (const [pattern, replacement] of translations) {
        if (pattern.test(translatedQuery)) {
            translatedQuery = translatedQuery.replace(pattern, replacement);
            matchedTranslation = true;
        }
    }
    if (matchedTranslation) variations.add(translatedQuery);

    // Broader version: remove connectors, keep important words
    const words = query.split(/\s+/).filter(w => w.length > 3);
    const importantWords = words.filter(w =>
        w.length > 4 && !/^(with|from|para|desde|como|sobre|using|based|between|sobre)$/i.test(w)
    );
    if (importantWords.length >= 3 && importantWords.length < words.length) {
        variations.add(importantWords.join(' '));
    }
    if (variations.size < 3 && words.length > 3) {
        variations.add(words.slice(1).join(' '));
    }

    return Array.from(variations).slice(0, 4);
}

// ─── V5: Health Check ───────────────────────────────────────────

async function performHealthCheck(): Promise<any> {
    const sources: Record<string, { status: string; latency: number; error?: string }> = {};

    const checks = [
        { name: 'OpenAlex', url: 'https://api.openalex.org/works?per-page=1' },
        { name: 'ALICIA', url: 'https://alicia.concytec.gob.pe/vufind/api/v1/search?lookfor=test&limit=1' },
        { name: 'La Referencia', url: 'https://www.lareferencia.info/vufind/api/v1/search?lookfor=test&limit=1' },
        { name: 'BDTD', url: 'https://bdtd.ibict.br/vufind/api/v1/search?lookfor=test&type=AllFields&limit=1' },
        { name: 'RRAAE', url: 'https://rraae.cedia.edu.ec/vufind/api/v1/search?lookfor=test&type=AllFields&limit=1' },
        { name: 'PubMed', url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=test&retmax=1&retmode=json' },
        { name: 'arXiv', url: 'http://export.arxiv.org/api/query?search_query=all:test&max_results=1' },
        { name: 'DBLP', url: 'https://dblp.org/search/publ/api?q=test&h=1&format=json' },
        { name: 'Crossref', url: 'https://api.crossref.org/works?query=test&rows=1' },
    ];

    await Promise.all(checks.map(async ({ name, url }) => {
        const start = Date.now();
        try {
            const res = await fetchWithTimeout(url, {}, 10000);
            sources[name] = { status: res.ok ? 'ONLINE' : 'ERROR', latency: Date.now() - start };
        } catch (e: any) {
            sources[name] = { status: 'OFFLINE', latency: Date.now() - start, error: e.message };
        }
    }));

    // Check configured API keys
    const apiKeys: Record<string, boolean> = {
        SCOPUS_API_KEY: !!process.env.SCOPUS_API_KEY,
        SEMANTIC_SCHOLAR_API_KEY: !!process.env.SEMANTIC_SCHOLAR_API_KEY,
        CORE_API_KEY: !!process.env.CORE_API_KEY,
        SERP_API_KEY: !!process.env.SERP_API_KEY,
    };

    return {
        success: true,
        data: {
            server: { version: '5.0.0', uptime: process.uptime(), tools: MCP_TOOLS.length },
            sources,
            apiKeys,
            timestamp: new Date().toISOString()
        }
    };
}

// ─── V5: Help System ────────────────────────────────────────────

function getHelpText(topic?: string): any {
    const toolHelp: Record<string, string> = {
        search: 'Single-query search across 32+ academic sources.\nUsage: { "query": "machine learning", "sources": ["global"], "maxSources": 50 }\nFor better recall prefer batch_search.\nSource groups: "latam", "global", "tesis", "iberoamerica", "peru", "ai_ml"',
        smart_search: 'Generates query variations (translations, synonyms) and searches multiple sources.\nUsage: { "query": "metabolitos secundarios stevia", "sources": ["global", "latam"], "maxResults": 30 }\nAutomatically creates ES↔EN↔PT translations.',
        batch_search: 'Preferred V5 search. Runs multiple queries in parallel across source groups and deduplicates globally.\nUsage: { "queries": ["aprendizaje automatico salud", "machine learning healthcare", "inteligencia artificial salud Peru"], "sources": ["latam", "global"], "maxResults": 60 }\nDefaults to ["latam", "global"]. Max 6 queries.',
        enrich_metadata: 'Enrich paper metadata using OpenAlex, Crossref, Semantic Scholar, DSpace 7.\nUsage: { "papers": [{ "id": "...", "title": "...", "abstract": "" }] }',
        fetch_metadata: 'Fetch complete metadata for one paper.\nUsage: { "doi": "10.1038/s41586-020-2649-2" } or { "title": "Paper title" }',
        recover_metadata: 'Deep recovery from any identifier.\nUsage: { "doi": "10.1038/..." } or { "url": "https://hdl.handle.net/..." } or { "title": "..." }',
        download_pdf: 'Download PDF using 9 fallback sources.\nUsage: { "doi": "10.1038/..." } or { "url": "https://..." }',
        resolve_pdf: 'Resolve PDF URL without downloading.\nUsage: { "identifier": "10.1038/..." }\nReturns URL + resolution steps.',
        health_check: 'Check connectivity to all sources.\nUsage: {} (no arguments needed)',
        help: 'Get help for any tool or source.\nUsage: { "topic": "search" } or { "topic": "alicia" } or { "topic": "all" }',
        read_pdf: 'Extract text from PDF.\nUsage: { "source": "https://arxiv.org/pdf/2301.00001.pdf" }',
        analyze_academic: 'Deep analysis of theses/articles.\nUsage: { "source": "https://..." }\nDetects sections, statistics, language.',
        extract_section: 'Extract specific section from PDF.\nUsage: { "source": "https://...", "section": "metodología" }',
    };

    const sourceHelp: Record<string, string> = {
        bdtd: 'BDTD (Brazil) - Brazilian Digital Library of Theses and Dissertations by IBICT. Useful for theses and dissertations.',
        rraae: 'RRAAE (Ecuador) - Ecuadorian Open Access Repository Network by CEDIA.',
        espana: 'Recolecta (Spain) - Spanish open repository network available through La Referencia filters.',
        costarica: 'KIMUK (Costa Rica) - Costa Rican national repository records through La Referencia.',
        uruguay: 'Timbo (Uruguay) - Uruguayan repository records through La Referencia.',
        elsalvador: 'REDICCES (El Salvador) - Salvadoran repository records through La Referencia.',
        alicia: 'ALICIA (CONCYTEC Peru) — Peruvian academic repository aggregator.\nSearches theses, articles from 130+ institutions.\nNo API key needed. Includes DME (Direct Metadata Extraction) for full abstracts.',
        openalex: 'OpenAlex — Free, open academic graph with 250M+ works.\nNo API key needed. Returns abstracts (inverted index), DOIs, institutions.',
        semantic: 'Semantic Scholar — AI-powered academic search by Allen AI.\nOptional API key (SEMANTIC_SCHOLAR_API_KEY) for higher rate limits.',
        lareferencia: 'La Referencia — LatAm regional repository aggregator.\nCovers Argentina, Brazil, Chile, Colombia, Ecuador, Mexico, Peru.',
        oasisbr: 'Oasisbr (IBICT Brazil) — Brazilian research portal.\nAutomatic Portuguese query translation for better coverage.',
    };

    if (!topic || topic === 'all') {
        return {
            success: true, data: {
                tools: MCP_TOOLS.map(t => ({ name: t.name, description: t.description })),
                sourceGroups: { all: '32+ sources including premium sources when configured', global: 'OpenAlex, Semantic Scholar, PubMed, Crossref, DOAJ, Zenodo, OpenAIRE, CORE', latam: 'ALICIA, RENATI, La Referencia, CONAHCyT, UNAM, ANID, Oasisbr, BDTD, SNRD, MinCiencias, RRAAE, KIMUK, Timbo, REDICCES, SciELO, Redalyc', tesis: 'Repository-heavy thesis/dissertation search', iberoamerica: 'LatAm plus Recolecta Spain', peru: 'ALICIA, RENATI, La Referencia (PE)', brasil: 'Oasisbr, BDTD, La Referencia (BR)', ecuador: 'RRAAE, La Referencia (EC)', mexico: 'CONAHCyT, UNAM, La Referencia (MX)', argentina: 'SNRD, La Referencia (AR)', colombia: 'MinCiencias, La Referencia (CO)', chile: 'ANID, La Referencia (CL)', centroamerica: 'KIMUK (Costa Rica), REDICCES (El Salvador)', ai_ml: 'DBLP, PapersWithCode, HuggingFace, OpenReview, arXiv', free: 'All 30 free sources (excludes Scopus, SerpAPI)', premium: 'Scopus, Google Scholar (SerpAPI)' },
                version: '5.0.0'
            }
        };
    }

    const toolText = toolHelp[topic.toLowerCase()];
    if (toolText) return { success: true, data: { tool: topic, help: toolText } };

    const sourceText = sourceHelp[topic.toLowerCase()];
    if (sourceText) return { success: true, data: { source: topic, help: sourceText } };

    return { success: false, error: `Unknown topic: "${topic}". Use "all" to see all tools and sources.` };
}

// ─── V5: Recover Metadata ───────────────────────────────────────

async function recoverMetadata(args: { doi?: string; url?: string; title?: string }): Promise<any> {
    const { doi, url, title } = args;
    if (!doi && !url && !title) return { success: false, error: 'Provide at least one of: doi, url, title' };

    const paper: any = { title: title || '', authors: [], year: null, abstract: '', pdfUrl: url || null, doi: doi || null, source: 'recover_metadata', citationCount: null, sourcesTried: [], fieldsRecovered: [] };

    // 1. OpenAlex
    if (doi) {
        try {
            paper.sourcesTried.push('OpenAlex (DOI)');
            const res = await fetchWithTimeout(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`, {}, 10000);
            if (res.ok) {
                const work = await res.json() as any;
                if (work.title) { paper.title = work.title; paper.fieldsRecovered.push('title'); }
                if (work.abstract_inverted_index) { paper.abstract = decodeInvertedIndex(work.abstract_inverted_index); paper.fieldsRecovered.push('abstract'); }
                if (work.publication_year) { paper.year = work.publication_year; paper.fieldsRecovered.push('year'); }
                if (work.doi) paper.doi = work.doi.replace('https://doi.org/', '');
                if (work.authorships?.length > 0) { paper.authors = work.authorships.map((a: any) => a.author.display_name); paper.fieldsRecovered.push('authors'); }
                if (work.authorships?.[0]?.institutions?.[0]?.display_name) { paper.university = work.authorships[0].institutions[0].display_name; paper.fieldsRecovered.push('university'); }
                if (work.open_access?.oa_url) { paper.pdfUrl = work.open_access.oa_url; paper.fieldsRecovered.push('pdfUrl'); }
                paper.citationCount = work.cited_by_count || null;
            }
        } catch { }
    } else if (title) {
        try {
            paper.sourcesTried.push('OpenAlex (title)');
            const res = await fetchWithTimeout(`https://api.openalex.org/works?filter=title.search:${encodeURIComponent(title)}&per-page=1`, {}, 10000);
            if (res.ok) {
                const data = await res.json() as any;
                const work = data.results?.[0];
                if (work) {
                    if (work.title) paper.title = work.title;
                    if (work.abstract_inverted_index) { paper.abstract = decodeInvertedIndex(work.abstract_inverted_index); paper.fieldsRecovered.push('abstract'); }
                    if (work.publication_year) { paper.year = work.publication_year; paper.fieldsRecovered.push('year'); }
                    if (work.doi) { paper.doi = work.doi.replace('https://doi.org/', ''); paper.fieldsRecovered.push('doi'); }
                    if (work.authorships?.length > 0) { paper.authors = work.authorships.map((a: any) => a.author.display_name); paper.fieldsRecovered.push('authors'); }
                }
            }
        } catch { }
    }

    // 2. Crossref
    if (paper.doi && (!paper.abstract || paper.abstract.length < 100)) {
        try {
            paper.sourcesTried.push('Crossref');
            const res = await fetchWithTimeout(`https://api.crossref.org/works/${encodeURIComponent(paper.doi)}`, {}, 8000);
            if (res.ok) {
                const item = (await res.json() as any).message;
                if (item?.abstract && item.abstract.length > (paper.abstract?.length || 0)) { paper.abstract = item.abstract.replace(/<[^>]+>/g, '').trim(); paper.fieldsRecovered.push('abstract'); }
                if (!paper.year && item.published?.['date-parts']?.[0]?.[0]) { paper.year = item.published['date-parts'][0][0]; paper.fieldsRecovered.push('year'); }
            }
        } catch { }
    }

    // 3. Semantic Scholar
    if (paper.doi) {
        try {
            paper.sourcesTried.push('Semantic Scholar');
            const headers: Record<string, string> = {};
            if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
            const res = await fetchWithTimeout(`https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(paper.doi)}?fields=title,authors,year,abstract,citationCount,openAccessPdf`, { headers }, 8000);
            if (res.ok) {
                const ss = await res.json() as any;
                if (ss.authors?.length > 0 && paper.authors.length === 0) { paper.authors = ss.authors.map((a: any) => a.name); paper.fieldsRecovered.push('authors'); }
                if (ss.abstract && (!paper.abstract || paper.abstract.length < 50)) { paper.abstract = ss.abstract; paper.fieldsRecovered.push('abstract'); }
                if (ss.openAccessPdf?.url && !paper.pdfUrl) { paper.pdfUrl = ss.openAccessPdf.url; paper.fieldsRecovered.push('pdfUrl'); }
                if (ss.citationCount && !paper.citationCount) paper.citationCount = ss.citationCount;
            }
        } catch { }
    }

    // Compute completeness
    let score = 0;
    if (paper.title?.length > 10) score += 15;
    if (paper.abstract?.length > 100) score += 25;
    if (paper.year) score += 10;
    if (paper.doi) score += 15;
    if (paper.pdfUrl) score += 15;
    if (paper.authors?.length > 0) score += 10;
    if (paper.university) score += 10;
    paper.completenessScore = score;
    paper.fieldsRecovered = [...new Set(paper.fieldsRecovered)];

    return { success: true, data: paper };
}

// ─── Internal API caller ────────────────────────────────────────

function normalizeForDedup(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function resultDedupKey(result: any): string {
    const doi = typeof result.doi === 'string' ? result.doi.replace(/^https?:\/\/doi\.org\//i, '').toLowerCase().trim() : '';
    if (doi) return `doi:${doi}`;

    const title = typeof result.title === 'string' ? normalizeForDedup(result.title) : '';
    if (title.length > 12) {
        const year = result.year ? String(result.year).match(/\d{4}/)?.[0] || '' : '';
        return `title:${title.substring(0, 90)}:${year}`;
    }

    return result.id ? `id:${result.id}` : '';
}

function resultQualityScore(result: any): number {
    let score = 0;
    if (result.doi) score += 20;
    if (result.pdfUrl || result.url || result.handleUrl) score += 15;
    if (result.abstract && String(result.abstract).length > 80) score += 20;
    if (Array.isArray(result.authors) && result.authors.length > 0) score += 10;
    if (result.year) score += 10;
    if (result.university) score += 5;
    if (result.citationCount) score += Math.min(10, Number(result.citationCount) || 0);
    return score;
}

function deduplicateBatchResults(results: any[]): any[] {
    const seen = new Map<string, any>();
    const matchedQueries = new Map<string, Set<string>>();

    for (const result of results) {
        const key = resultDedupKey(result);
        if (!key) continue;

        if (!matchedQueries.has(key)) matchedQueries.set(key, new Set<string>());
        if (result.matchedQuery) matchedQueries.get(key)?.add(result.matchedQuery);

        const existing = seen.get(key);
        if (!existing || resultQualityScore(result) > resultQualityScore(existing)) {
            seen.set(key, result);
        }
    }

    return Array.from(seen.entries()).map(([key, result]) => {
        const queries = Array.from(matchedQueries.get(key) || []);
        return queries.length > 0 ? { ...result, matchedQueries: queries, matchedQuery: undefined } : result;
    });
}

async function callInternalApi(method: string, body: any, baseUrl: string): Promise<any> {
    // Specialized source mapping
    const specializedSourceMap: Record<string, string> = {
        'search_dblp': 'dblp',
        'search_paperswithcode': 'paperswithcode',
        'trending_papers': 'huggingface',
        'search_conferences': 'openreview',
    };

    if (specializedSourceMap[method]) {
        const sourceId = specializedSourceMap[method];
        const searchBody = { query: body.query || '', sources: [sourceId], maxSources: body.maxResults || 25 };
        const url = `${baseUrl}/api/search`;
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(searchBody), signal: AbortSignal.timeout(120000) });
        return res.json();
    }

    // V5: New tools handled directly
    if (method === 'health_check') return performHealthCheck();
    if (method === 'help') return getHelpText(body.topic);
    if (method === 'recover_metadata') return recoverMetadata(body);

    if (method === 'resolve_pdf') {
        const result: ResolvedPdfUrl = await resolvePdfUrl(body.identifier || body.doi || body.url || '');
        return { success: true, data: result };
    }

    if (method === 'batch_search') {
        const rawQueries = Array.isArray(body.queries) ? body.queries : (body.query ? [body.query] : []);
        const queries: string[] = rawQueries
            .map((q: unknown) => String(q || '').trim())
            .filter((q: string) => q.length > 0)
            .slice(0, SEARCH_LIMITS.BATCH_MAX_QUERIES);
        if (queries.length === 0) return { success: false, error: 'Provide "queries" or "query" for batch_search.' };

        const sources = body.sources || ['latam', 'global'];
        const maxResults = Math.min(body.maxResults || 60, SEARCH_LIMITS.BATCH_MAX_RESULTS);
        const perQueryLimit = Math.min(60, Math.max(20, Math.ceil(maxResults / queries.length) + 10));
        const yearStart = body.yearStart;
        const yearEnd = body.yearEnd;
        const university = body.university;

        const allResults: any[] = [];
        const sourceStats: Record<string, { found: number; time: number; errors: number }> = {};
        const queryReports: Array<{ query: string; returned: number; beforeDedup: number; error?: string }> = [];

        await Promise.all(queries.map(async (q: string) => {
            try {
                const res = await fetch(`${baseUrl}/api/search`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: q, sources, maxSources: perQueryLimit, yearStart, yearEnd, university }),
                    signal: AbortSignal.timeout(120000),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json() as any;
                const results = data.success && data.data?.sources ? data.data.sources : [];
                allResults.push(...results.map((r: any) => ({ ...r, matchedQuery: q })));

                if (data.data?.stats) {
                    for (const [sourceId, stat] of Object.entries(data.data.stats as Record<string, any>)) {
                        if (!sourceStats[sourceId]) sourceStats[sourceId] = { found: 0, time: 0, errors: 0 };
                        sourceStats[sourceId].found += Number(stat.found || 0);
                        sourceStats[sourceId].time += Number(stat.time || 0);
                        if (Number(stat.found || 0) === 0) sourceStats[sourceId].errors += 0;
                    }
                }

                queryReports.push({
                    query: q,
                    returned: results.length,
                    beforeDedup: data.data?.totalBeforeDedup || results.length
                });
            } catch (e: any) {
                console.error(`[BATCH] Query "${q}" failed: ${e.message}`);
                queryReports.push({ query: q, returned: 0, beforeDedup: 0, error: e.message });
            }
        }));

        let deduplicated = deduplicateBatchResults(allResults);

        // Strict post-filtering to guarantee years
        if (yearStart) {
            const minYear = parseInt(String(yearStart), 10);
            if (!isNaN(minYear)) deduplicated = deduplicated.filter(r => !r.year || r.year >= minYear);
        }
        if (yearEnd) {
            const maxYear = parseInt(String(yearEnd), 10);
            if (!isNaN(maxYear)) deduplicated = deduplicated.filter(r => !r.year || r.year <= maxYear);
        }

        deduplicated = deduplicated.slice(0, maxResults);

        return {
            success: true,
            data: {
                results: deduplicated,
                total: deduplicated.length,
                totalBeforeDedup: allResults.length,
                queriesExecuted: queries,
                sourcesUsed: Array.isArray(sources) ? sources : [sources],
                perQueryLimit,
                queryReports,
                sourceStats
            }
        };
    }

    // PDF & Document tools (direct, no HTTP roundtrip) — V7: MinerU AI integration
    const pdfTools: Record<string, (args: any) => Promise<any>> = {
        'read_pdf': async (args) => {
            const format = args.format || 'markdown';
            if (format === 'text') {
                const result = await extractText(args.source);
                let text = result.text;
                const maxChars = args.maxChars ?? 20000;
                if (maxChars > 0 && text.length > maxChars) {
                    const { smartTruncate } = await import('../providers/mineru-client');
                    text = smartTruncate(text, maxChars);
                }
                return { success: true, data: { text, pages: result.pages, info: result.info, textLength: text.length, format: 'text' } };
            }
            const result = await extractMarkdown(args.source, { maxChars: args.maxChars ?? 20000, pages: args.pages });
            return { success: true, data: { text: result.text, pages: result.pages, info: result.info, textLength: result.text.length, format: result.format } };
        },
        'pdf_metadata': async (args) => {
            const metadata = await getMetadata(args.source);
            return { success: true, data: metadata };
        },
        'pdf_sections': async (args) => {
            const sections = await detectSections(args.source);
            return { success: true, data: { sections: sections.map(s => ({ name: s.name, contentPreview: s.content.substring(0, 500), contentLength: s.content.length })), totalSections: sections.length } };
        },
        'pdf_citations': async (args) => {
            const citations = await extractCitations(args.source);
            return { success: true, data: { citations, totalCitations: citations.length } };
        },
        'analyze_academic': async (args) => {
            try {
                const analysis = await analyzeAcademicDocument(args.source);
                return {
                    success: true, data: {
                        documentType: analysis.documentType, language: analysis.language, pages: analysis.pages, totalWords: analysis.totalWords,
                        sections: analysis.sections.map(s => ({ name: s.name, category: s.category, contentPreview: s.content.substring(0, 800), contentLength: s.contentLength, hasNumericalData: s.hasNumericalData, statistics: s.statistics })),
                        globalStatistics: analysis.globalStatistics, summary: analysis.summary,
                    }
                };
            } catch (e: any) {
                return { success: false, error: e.message, hint: 'Provide a DOI, direct PDF URL, or repository link. The server resolves via Sci-Hub, Unpaywall, CORE, Semantic Scholar, PMC, DOI.org, and Google Scholar.' };
            }
        },
        'extract_section': async (args) => {
            try {
                const result = await extractSection(args.source, args.section);
                return { success: true, data: result };
            } catch (e: any) {
                return { success: false, error: e.message, hint: 'Provide a DOI or direct PDF URL. The server will auto-resolve the PDF.' };
            }
        },
        'read_pdf_markdown': async (args) => {
            try {
                const result = await extractMarkdown(args.source, { maxChars: args.maxChars ?? 30000, pages: args.pages });
                return { success: true, data: { text: result.text, pages: result.pages, info: result.info, textLength: result.text.length, format: result.format } };
            } catch (e: any) {
                return { success: false, error: e.message, hint: 'MinerU API may be unavailable. Check MINERU_API_KEY configuration.' };
            }
        },
        'pdf_smart_summary': async (args) => {
            try {
                const result = await smartSummary(args.source, args.maxTotalChars ?? 8000);
                return { success: true, data: result };
            } catch (e: any) {
                return { success: false, error: e.message, hint: 'Provide a DOI, direct PDF URL, or repository link.' };
            }
        },
        // V7: Multi-format document tools
        'convert_document': async (args) => {
            try {
                const source = args.source;
                const isUrl = source.startsWith('http://') || source.startsWith('https://');
                const filename = source.split('/').pop() || 'document.pdf';

                // For URLs with MinerU API: pass URL directly (no buffer download needed)
                if (isUrl && process.env.MINERU_API_KEY) {
                    const result = await convertDocument(Buffer.alloc(0), filename, source);
                    let markdown = result.markdown;
                    const maxChars = args.maxChars ?? 30000;
                    if (maxChars > 0 && markdown.length > maxChars) {
                        const { smartTruncate } = await import('../providers/mineru-client');
                        markdown = smartTruncate(markdown, maxChars);
                    }
                    return { success: true, data: { text: markdown, chars: result.chars, format: result.format, source: result.source, tables: result.tables, formulas: result.formulas, images: result.images } };
                }

                // For local files or fallback: resolve buffer first
                const { resolvePdfBuffer: resolveBuffer } = await import('../providers/pdf-resolver');
                const resolved = await resolveBuffer(source);
                if (!resolved) throw new Error(`Could not resolve document: ${source}`);
                const result = await convertDocument(resolved.buffer, filename, source);
                let markdown = result.markdown;
                const maxChars = args.maxChars ?? 30000;
                if (maxChars > 0 && markdown.length > maxChars) {
                    const { smartTruncate } = await import('../providers/mineru-client');
                    markdown = smartTruncate(markdown, maxChars);
                }
                return { success: true, data: { text: markdown, chars: result.chars, format: result.format, source: result.source, tables: result.tables, formulas: result.formulas, images: result.images } };
            } catch (e: any) {
                return { success: false, error: e.message, hint: 'Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG. Set MINERU_API_KEY for precision mode.' };
            }
        },
        'batch_convert': async (args) => {
            try {
                const sources = (args.sources || []).slice(0, 10);
                const { resolvePdfBuffer: resolveBuffer } = await import('../providers/pdf-resolver');
                const files = await Promise.all(sources.map(async (src: string) => {
                    const resolved = await resolveBuffer(src);
                    if (!resolved) throw new Error(`Could not resolve: ${src}`);
                    return { buffer: resolved.buffer, name: src.split('/').pop() || 'doc.pdf' };
                }));
                const results = await batchConvert(files);
                return { success: true, data: { results: results.map(r => ({ name: r.name, chars: r.result?.chars, format: r.result?.format, source: r.result?.source, error: r.error })), total: results.length, successful: results.filter(r => r.result).length } };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        'extract_tables': async (args) => {
            try {
                const { resolvePdfBuffer: resolveBuffer } = await import('../providers/pdf-resolver');
                const resolved = await resolveBuffer(args.source);
                if (!resolved) throw new Error(`Could not resolve document: ${args.source}`);
                const filename = args.source.split('/').pop() || 'document.pdf';
                const result = await extractTablesFromDocument(resolved.buffer, filename, args.format || 'html');
                return { success: true, data: result };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
        'extract_formulas': async (args) => {
            try {
                const { resolvePdfBuffer: resolveBuffer } = await import('../providers/pdf-resolver');
                const resolved = await resolveBuffer(args.source);
                if (!resolved) throw new Error(`Could not resolve document: ${args.source}`);
                const filename = args.source.split('/').pop() || 'document.pdf';
                const result = await extractFormulasFromDocument(resolved.buffer, filename);
                return { success: true, data: result };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        },
    };

    // Smart search
    if (method === 'smart_search') {
        const { query, sources = ['global', 'latam'], maxResults = 30, yearStart, yearEnd } = body;
        const variations = generateQueryVariations(query);
        console.log(`[SMART_SEARCH] Query: "${query}" → ${variations.length} variations`);

        const allResults: any[] = [];
        const searchSources = Array.isArray(sources) ? sources : [sources];

        for (const variant of variations) {
            try {
                const searchBody: any = { query: variant, sources: searchSources, maxSources: 15 };
                if (yearStart) searchBody.yearStart = yearStart;
                if (yearEnd) searchBody.yearEnd = yearEnd;
                const res = await fetch(`${baseUrl}/api/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(searchBody) });
                const data = await res.json() as any;
                if (data.success && data.data?.sources) allResults.push(...data.data.sources);
            } catch (e: any) { console.error(`[SMART_SEARCH] Variation "${variant}" failed: ${e.message}`); }
        }

        // Deduplicate
        const seen = new Map<string, any>();
        for (const r of allResults) {
            const key = r.doi || r.title?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 60) || '';
            if (key && !seen.has(key)) seen.set(key, r);
        }
        const deduplicated = Array.from(seen.values()).slice(0, maxResults);

        return { success: true, data: { results: deduplicated, total: deduplicated.length, totalBeforeDedup: allResults.length, queriesUsed: variations } };
    }

    if (pdfTools[method]) return pdfTools[method](body);

    // Health check with MinerU status
    if (method === 'health_check') {
        const mineruHealth = await checkMineruHealth();
        const mdCacheStats = getMarkdownCacheStats();
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(10000) });
        const healthData = await res.json() as any;
        return {
            success: true,
            data: {
                ...healthData,
                mineru: {
                    available: mineruHealth.available,
                    mode: mineruHealth.mode,
                    engine: 'MinerU AI Cloud API',
                    apiUrl: mineruHealth.apiUrl,
                    supportedFormats: mineruHealth.supportedFormats,
                    cacheEntries: mdCacheStats.entries,
                },
            },
        };
    }

    // Standard endpoint mapping
    const endpointMap: Record<string, string> = {
        'search': '/api/search',
        'enrich_metadata': '/api/metadata/enrich',
        'fetch_metadata': '/api/metadata/fetch',
        'download_pdf': '/api/pdf/download',
        'list_sources': '/api/sources',
    };

    const endpoint = endpointMap[method];
    if (!endpoint) throw new Error(`Unknown tool: ${method}`);

    const isGet = method === 'list_sources';
    const url = `${baseUrl}${endpoint}`;
    const res = await fetch(url, {
        method: isGet ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isGet ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
    });
    return res.json();
}

// ─── MCP JSON-RPC Handler ───────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request: expected jsonrpc 2.0' } });

    const baseUrl = `http://localhost:${process.env.PORT || 4000}`;

    try {
        if (method === 'initialize') {
            return res.json({
                jsonrpc: '2.0', id,
                result: {
                    protocolVersion: MCP_SERVER_INFO.protocolVersion,
                    capabilities: { tools: {} },
                    serverInfo: { name: MCP_SERVER_INFO.name, version: MCP_SERVER_INFO.version }
                }
            });
        }

        if (method === 'notifications/initialized') return res.json({ jsonrpc: '2.0', id, result: {} });
        if (method === 'ping') return res.json({ jsonrpc: '2.0', id, result: {} });

        if (method === 'tools/list') {
            return res.json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
        }

        if (method === 'tools/call') {
            const toolName = params?.name;
            const args = params?.arguments || {};

            if (!toolName) return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool name' } });

            console.log(`[MCP] tools/call: ${toolName}`);

            // V5: Cache layer for search tools
            const CACHEABLE_TOOLS = new Set(['search', 'batch_search', 'smart_search', 'search_dblp',
                'search_paperswithcode', 'trending_papers', 'search_conferences', 'list_sources']);

            if (CACHEABLE_TOOLS.has(toolName)) {
                const key = cacheKey(toolName, args);
                const cached = getCached(key);
                if (cached) {
                    console.log(`[MCP] Cache HIT for ${toolName}`);
                    return res.json({
                        jsonrpc: '2.0', id,
                        result: {
                            content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
                        }
                    });
                }
            }

            if (toolName === 'download_pdf') args.returnUrl = true;

            const result = await callInternalApi(toolName, args, baseUrl);

            // Cache the result if cacheable
            if (CACHEABLE_TOOLS.has(toolName)) {
                setCache(cacheKey(toolName, args), result);
            }

            return res.json({
                jsonrpc: '2.0', id,
                result: {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }]
                }
            });
        }

        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    } catch (e: any) {
        console.error(`[MCP] Error handling ${method}:`, e.message);
        return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: e.message } });
    }
});

export default router;
