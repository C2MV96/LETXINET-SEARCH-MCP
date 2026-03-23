/**
 * POST /api/search — Multi-source academic search
 */

import { Router, Request, Response } from 'express';
import { SearchOptions, PaperResult } from '../types/search';
import { SOURCE_GROUPS } from './sources';
import * as providers from '../providers';

const router = Router();

const PROVIDER_MAP: Record<string, (query: string, options?: SearchOptions) => Promise<{ results: PaperResult[] }>> = {
    semantic: providers.searchSemanticScholar,
    openalex: providers.searchOpenAlex,
    pubmed: providers.searchPubMed,
    arxiv: providers.searchArxiv,
    scopus: providers.searchScopus,
    crossref: providers.searchCrossref,
    doaj: providers.searchDOAJ,
    zenodo: providers.searchZenodo,
    openaire: providers.searchOpenAIRE,
    core: providers.searchCORE,
    scielo: providers.searchSciELO,
    redalyc: providers.searchRedalyc,
    alicia: providers.searchAlicia,
    renati: providers.searchRenati,
    lareferencia: providers.searchLaReferencia,
    conacyt: providers.searchConacyt,
    unam: providers.searchUnam,
    anid: providers.searchAnid,
    oasisbr: providers.searchOasisbr,
    snrd: providers.searchSnrd,
    minciencias: providers.searchMinciencias,
    serpapi: providers.searchSerpApi,
    // v2: New AI/ML & CS sources
    dblp: providers.searchDblp,
    paperswithcode: providers.searchPapersWithCode,
    huggingface: providers.searchHuggingFacePapers,
    openreview: providers.searchOpenReview,
};

function expandSources(sources: string[]): string[] {
    const expanded = new Set<string>();
    for (const s of sources) {
        const group = SOURCE_GROUPS[s.toLowerCase()];
        if (group) { group.forEach(id => expanded.add(id)); }
        else expanded.add(s.toLowerCase());
    }
    return Array.from(expanded);
}

function deduplicateResults(results: PaperResult[]): PaperResult[] {
    const seen = new Map<string, PaperResult>();
    for (const r of results) {
        const key = r.doi || r.title.toLowerCase().substring(0, 80);
        if (!seen.has(key)) seen.set(key, r);
    }
    return Array.from(seen.values());
}

router.post('/', async (req: Request, res: Response) => {
    try {
        const { query, sources = ['all'], maxSources = 50, yearStart, yearEnd, university, limit } = req.body;
        if (!query) return res.status(400).json({ success: false, error: 'Missing "query" field' });

        const expandedSources = expandSources(Array.isArray(sources) ? sources : [sources]);
        const options: SearchOptions = {
            yearStart, yearEnd, university,
            limit: limit || 25,
            scopusKey: process.env.SCOPUS_API_KEY,
            semanticKey: process.env.SEMANTIC_SCHOLAR_API_KEY,
            coreKey: process.env.CORE_API_KEY,
            serpApiKey: process.env.SERP_API_KEY,
        };

        console.log(`\n[${'='.repeat(50)}]`);
        console.log(`[SEARCH] Query: "${query.substring(0, 80)}..."`);
        console.log(`[SEARCH] Sources: ${expandedSources.join(', ')}`);

        const stats: Record<string, { found: number; time: number }> = {};
        const allResults: PaperResult[] = [];

        const promises = expandedSources.map(async (sourceId) => {
            const provider = PROVIDER_MAP[sourceId];
            if (!provider) return;
            const start = Date.now();
            try {
                const { results } = await provider(query, options);
                stats[sourceId] = { found: results.length, time: Date.now() - start };
                allResults.push(...results);
            } catch (e: any) {
                stats[sourceId] = { found: 0, time: Date.now() - start };
                console.error(`[SEARCH] ${sourceId} failed:`, e.message);
            }
        });

        await Promise.all(promises);

        const deduplicated = deduplicateResults(allResults).slice(0, maxSources);

        console.log(`[SEARCH] Total: ${allResults.length} → Deduplicated: ${deduplicated.length}`);
        res.json({
            success: true,
            data: {
                sources: deduplicated,
                stats,
                total: deduplicated.length,
                totalBeforeDedup: allResults.length
            }
        });
    } catch (e: any) {
        console.error('[SEARCH] Fatal error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
