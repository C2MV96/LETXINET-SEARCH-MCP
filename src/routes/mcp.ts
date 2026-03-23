/**
 * POST /api/mcp — JSON-RPC 2.0 MCP Server v3.0.0
 * Exposes search, enrichment, PDF reader/analyzer, and source listing tools
 */

import { Router, Request, Response } from 'express';
import { extractText, getMetadata, detectSections, extractCitations, analyzeAcademicDocument, extractSection } from '../providers/pdf-processor';

const router = Router();

const MCP_SERVER_INFO = {
    name: 'letxipu-search-mcp',
    version: '3.0.0',
    protocolVersion: '2024-11-05',
};

const MCP_TOOLS = [
    {
        name: 'search',
        description: 'Search academic papers across 22+ sources (OpenAlex, PubMed, ALICIA, Scopus, etc.)',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                sources: { type: 'array', items: { type: 'string' }, description: 'Source IDs or groups: "all", "latam", "global", "peru", or specific IDs' },
                maxSources: { type: 'number', description: 'Max results to return (default 50)' },
                yearStart: { type: 'string', description: 'Filter by start year (e.g. "2020")' },
                yearEnd: { type: 'string', description: 'Filter by end year (e.g. "2024")' },
                university: { type: 'string', description: 'Filter by university name' },
            },
            required: ['query']
        }
    },
    {
        name: 'enrich_metadata',
        description: 'Enrich paper metadata (abstract, DOI, year, university, authors) using multiple APIs and scraping',
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
        description: 'Fetch complete metadata for a single paper by DOI, URL, or title',
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
        name: 'download_pdf',
        description: 'Resolve and get PDF download URL from DOI, repository URL, or PMC URL',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Paper URL' },
                doi: { type: 'string', description: 'Paper DOI' },
            }
        }
    },
    {
        name: 'list_sources',
        description: 'List all available search sources with their IDs and descriptions',
        inputSchema: { type: 'object', properties: {} }
    },
    // v2: New specialized tools
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
        description: 'Search OpenReview for conference papers (ICLR, NeurIPS, ICML, etc.). No API key needed, optional auth for full access.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query (topic or paper title)' },
                maxResults: { type: 'number', description: 'Max results to return (default 25)' },
            },
            required: ['query']
        }
    },
    // v3: PDF reader/analyzer tools
    {
        name: 'read_pdf',
        description: 'Extract full text from a PDF. Accepts URL (e.g. arXiv PDF link) or local file path. Returns text, page count, and document info.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL (e.g. https://arxiv.org/pdf/2301.00001.pdf) or local file path' },
            },
            required: ['source']
        }
    },
    {
        name: 'pdf_metadata',
        description: 'Get PDF document metadata: title, author, page count, creation date, file size.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL or local file path' },
            },
            required: ['source']
        }
    },
    {
        name: 'pdf_sections',
        description: 'Detect academic paper sections (Abstract, Introduction, Methods, Results, Conclusion, References, etc.) from a PDF.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL or local file path' },
            },
            required: ['source']
        }
    },
    {
        name: 'pdf_citations',
        description: 'Extract citations and reference list from a PDF academic paper. Parses numbered [1] and author-year styles.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL or local file path' },
            },
            required: ['source']
        }
    },
    {
        name: 'analyze_academic',
        description: 'Deep analysis of academic documents (theses and articles). Detects document type (thesis/article), language (ES/EN), 22 section types (Marco Teórico, Metodología, Resultados, Hipótesis, Planteamiento del Problema, etc.), and extracts statistical data (p-values, correlations, ANOVA, chi², percentages, regression, sample sizes). Ideal for analyzing tesis, papers, and research reports.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL or local file path to the thesis/article' },
            },
            required: ['source']
        }
    },
    // v3.1: Smart search & section extraction
    {
        name: 'smart_search',
        description: 'Intelligent multi-query academic search. Automatically generates query variations (synonyms, Spanish/English translations, broader/narrower terms) and searches across multiple source groups. Deduplicates results. Use this when a simple search returns few or no results, or for niche/specialized topics.',
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
        name: 'extract_section',
        description: 'Extract a SPECIFIC section from a PDF by name (e.g. "metodolog\u00eda", "marco te\u00f3rico", "results", "conclusiones"). Returns the FULL text content with no character limit. Supports fuzzy matching in Spanish and English. If the section has multiple sub-parts, they are combined. Also returns all available section names in the document.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'PDF URL or local file path' },
                section: { type: 'string', description: 'Section name to extract (e.g. "metodolog\u00eda", "marco te\u00f3rico", "results", "introduction", "conclusiones")' },
            },
            required: ['source', 'section']
        }
    },
];

// ─── Smart Search: Query Variation Generator ────────────────────

/**
 * Generate multiple search query variations to improve coverage for niche topics.
 * Creates: original, ES/EN translation attempts, and a slightly broader noun-only version.
 * Prevents context-loss (e.g. splitting into "elicitación" which finds unrelated SE papers).
 */
function generateQueryVariations(query: string): string[] {
    const variations = new Set<string>();
    
    // 1. Original query
    variations.add(query);
    
    // 2. Common ES↔EN translation pairs for academic terms (FULL translations)
    const translations: [RegExp, string][] = [
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
        [/\brebaud[ií]?[oó]sido\b/i, 'rebaudioside'],
        [/\brebaudioside\b/i, 'rebaudiósido'],
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
    ];
    
    // Apply all matching translations at once to create a fully translated version
    let translatedQuery = query;
    let matchedTranslation = false;
    for (const [pattern, replacement] of translations) {
        if (pattern.test(translatedQuery)) {
            translatedQuery = translatedQuery.replace(pattern, replacement);
            matchedTranslation = true;
        }
    }
    
    if (matchedTranslation) {
        variations.add(translatedQuery);
    }
    
    // 3. Add broader version: remove connector/stop words but keep ALL >4 char nouns
    const words = query.split(/\s+/).filter(w => w.length > 3);
    const importantWords = words.filter(w => 
        w.length > 4 && !/^(with|from|para|desde|como|sobre|using|based|between|sobre)$/i.test(w)
    );
    
    // Only add if it actually simplifies the query safely (keeps at least 3 words)
    if (importantWords.length >= 3 && importantWords.length < words.length) {
        variations.add(importantWords.join(' '));
    }
    
    // If we only have 2 or 1 variations, and there are many words, try removing just the FIRST word 
    // (often verbs like "analyzing", "evaluating", "uso")
    if (variations.size < 3 && words.length > 3) {
        variations.add(words.slice(1).join(' '));
    }
    
    return Array.from(variations).slice(0, 4); // Max 4 tight variations
}

async function callInternalApi(method: string, body: any, baseUrl: string): Promise<any> {
    // v2: Map specialized tools to search endpoint with specific source
    const specializedSourceMap: Record<string, string> = {
        'search_dblp': 'dblp',
        'search_paperswithcode': 'paperswithcode',
        'trending_papers': 'huggingface',
        'search_conferences': 'openreview',
    };

    if (specializedSourceMap[method]) {
        const sourceId = specializedSourceMap[method];
        const searchBody = {
            query: body.query || '',
            sources: [sourceId],
            maxSources: body.maxResults || 25,
        };
        const url = `${baseUrl}/api/search`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchBody),
            signal: AbortSignal.timeout(120000),
        });
        return res.json();
    }

    // v3: Handle PDF tools directly (no HTTP roundtrip)
    const pdfTools: Record<string, (args: any) => Promise<any>> = {
        'read_pdf': async (args) => {
            const result = await extractText(args.source);
            return { success: true, data: { text: result.text, pages: result.pages, info: result.info, textLength: result.text.length } };
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
                    success: true,
                    data: {
                        documentType: analysis.documentType,
                        language: analysis.language,
                        pages: analysis.pages,
                        totalWords: analysis.totalWords,
                        sections: analysis.sections.map(s => ({ name: s.name, category: s.category, contentPreview: s.content.substring(0, 800), contentLength: s.contentLength, hasNumericalData: s.hasNumericalData, statistics: s.statistics })),
                        globalStatistics: analysis.globalStatistics,
                        summary: analysis.summary,
                    }
                };
            } catch (e: any) {
                console.error(`[MCP] analyze_academic error for "${args.source}": ${e.message}`);
                return {
                    success: false,
                    error: e.message,
                    hint: 'Tip: Provide a DOI (e.g. "10.1016/j.jclepro.2019.03.031"), a direct PDF URL, or a repository link instead of a local file path. The server resolved via Sci-Hub, Unpaywall, CORE, Semantic Scholar, PMC, DOI.org, and Google Scholar.',
                };
            }
        },
        'extract_section': async (args) => {
            try {
                const result = await extractSection(args.source, args.section);
                return { success: true, data: result };
            } catch (e: any) {
                console.error(`[MCP] extract_section error for "${args.source}": ${e.message}`);
                return {
                    success: false,
                    error: e.message,
                    hint: 'Tip: Provide a DOI or direct PDF URL. The server will auto-resolve the PDF from multiple academic sources.',
                };
            }
        },
    };

    // ── smart_search: generate variations and search multiple times ──
    if (method === 'smart_search') {
        const { query, sources = ['global', 'latam'], maxResults = 30, yearStart, yearEnd } = body;
        
        // Generate query variations
        const variations = generateQueryVariations(query);
        console.log(`[SMART_SEARCH] Query: "${query}" → ${variations.length} variations`);
        
        const allResults: any[] = [];
        const searchSources = Array.isArray(sources) ? sources : [sources];
        
        // Search each variation
        for (const variant of variations) {
            try {
                const searchBody: any = { query: variant, sources: searchSources, maxSources: 15 };
                if (yearStart) searchBody.yearStart = yearStart;
                if (yearEnd) searchBody.yearEnd = yearEnd;
                
                const url = `${baseUrl}/api/search`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(searchBody),
                });
                const data = await res.json() as any;
                if (data.success && data.data?.sources) {
                    allResults.push(...data.data.sources);
                }
            } catch (e: any) {
                console.error(`[SMART_SEARCH] Variation "${variant}" failed: ${e.message}`);
            }
        }
        
        // Deduplicate by DOI or title
        const seen = new Map<string, any>();
        for (const r of allResults) {
            const key = r.doi || r.title?.toLowerCase().substring(0, 80) || '';
            if (key && !seen.has(key)) seen.set(key, r);
        }
        const deduplicated = Array.from(seen.values()).slice(0, maxResults);
        
        console.log(`[SMART_SEARCH] Total: ${allResults.length} → Deduplicated: ${deduplicated.length}`);
        
        return {
            success: true,
            data: {
                results: deduplicated,
                total: deduplicated.length,
                totalBeforeDedup: allResults.length,
                queriesUsed: variations,
            }
        };
    }

    if (pdfTools[method]) {
        return pdfTools[method](body);
    }

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

router.post('/', async (req: Request, res: Response) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request: expected jsonrpc 2.0' } });

    const baseUrl = `http://localhost:${process.env.PORT || 4000}`;

    try {
        // ─── PROTOCOL METHODS ─────────────────────────────
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

        // ─── TOOL CALL ────────────────────────────────────
        if (method === 'tools/call') {
            const toolName = params?.name;
            const args = params?.arguments || {};

            if (!toolName) return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool name' } });

            console.log(`[MCP] tools/call: ${toolName}`);

            // For download_pdf, always return URL mode via MCP
            if (toolName === 'download_pdf') args.returnUrl = true;

            const result = await callInternalApi(toolName, args, baseUrl);

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
