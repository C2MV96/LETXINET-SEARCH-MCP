/**
 * POST /api/search — Multi-source academic search (V5)
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
    bdtd: providers.searchBdtd,
    rraae: providers.searchRraae,
    espana: providers.searchEspana,
    costarica: providers.searchCostaRica,
    uruguay: providers.searchUruguay,
    elsalvador: providers.searchElSalvador,
    laref_peru: providers.searchLaReferenciaPeru,
    laref_brasil: providers.searchLaReferenciaBrasil,
    laref_ecuador: providers.searchLaReferenciaEcuador,
    laref_mexico: providers.searchLaReferenciaMexico,
    laref_argentina: providers.searchLaReferenciaArgentina,
    laref_colombia: providers.searchLaReferenciaColombia,
    laref_chile: providers.searchLaReferenciaChile,
    serpapi: providers.searchSerpApi,
    // v2: New AI/ML & CS sources
    dblp: providers.searchDblp,
    paperswithcode: providers.searchPapersWithCode,
    huggingface: providers.searchHuggingFacePapers,
    openreview: providers.searchOpenReview,
};

// V4: Source aliases for convenience
const SOURCE_ALIASES: Record<string, string> = {
    'semanticscholar': 'semantic',
    'semantic_scholar': 'semantic',
    'semantic-scholar': 'semantic',
    'openalex': 'openalex',
    'open_alex': 'openalex',
    'open-alex': 'openalex',
    'la_referencia': 'lareferencia',
    'la-referencia': 'lareferencia',
    'papers_with_code': 'paperswithcode',
    'papers-with-code': 'paperswithcode',
    'hugging_face': 'huggingface',
    'hugging-face': 'huggingface',
    'open_review': 'openreview',
    'open-review': 'openreview',
    'bdtdbr': 'bdtd',
    'bdtd-br': 'bdtd',
    'rraae_ecuador': 'rraae',
    'rraae-ecuador': 'rraae',
    'recolecta': 'espana',
    'espana': 'espana',
    'españa': 'espana',
    'spain': 'espana',
    'kimuk': 'costarica',
    'costa_rica': 'costarica',
    'costa-rica': 'costarica',
    'timbo': 'uruguay',
    'timbó': 'uruguay',
    'redicces': 'elsalvador',
    'el_salvador': 'elsalvador',
    'el-salvador': 'elsalvador',
    'laref-peru': 'laref_peru',
    'laref-brasil': 'laref_brasil',
    'laref-ecuador': 'laref_ecuador',
    'laref-mexico': 'laref_mexico',
    'laref-argentina': 'laref_argentina',
    'laref-colombia': 'laref_colombia',
    'laref-chile': 'laref_chile',
};

export function expandSources(sources: string[]): string[] {
    const expanded = new Set<string>();
    const visited = new Set<string>();
    const addSource = (source: string) => {
        const normalized = source.toLowerCase().trim();
        const aliased = SOURCE_ALIASES[normalized] || normalized;
        if (visited.has(aliased)) return;
        const group = SOURCE_GROUPS[aliased];
        if (group) {
            visited.add(aliased);
            group.forEach(addSource);
            return;
        }
        expanded.add(aliased);
    };
    for (const s of sources) {
        addSource(s);
    }
    return Array.from(expanded);
}

function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 60);
}

function deduplicateResults(results: PaperResult[]): PaperResult[] {
    const seen = new Map<string, PaperResult>();
    for (const r of results) {
        // V4: Stronger dedup — normalize titles + strip accents
        const titleKey = normalizeTitle(r.title);
        const doiKey = r.doi ? r.doi.toLowerCase() : null;

        // Check DOI first (exact match)
        if (doiKey && seen.has(`doi:${doiKey}`)) continue;
        // Then title similarity
        if (titleKey && seen.has(`title:${titleKey}`)) continue;

        if (doiKey) seen.set(`doi:${doiKey}`, r);
        if (titleKey) seen.set(`title:${titleKey}`, r);
    }

    // Deduplicate the values (a paper might be in both doi: and title: keys)
    const uniqueIds = new Set<string>();
    const unique: PaperResult[] = [];
    for (const r of seen.values()) {
        const uid = r.id || r.doi || r.title;
        if (!uniqueIds.has(uid)) {
            uniqueIds.add(uid);
            unique.push(r);
        }
    }
    return unique;
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
