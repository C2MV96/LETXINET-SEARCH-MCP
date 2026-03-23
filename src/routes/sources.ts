/**
 * GET /api/sources — Source Catalog
 */

import { Router, Request, Response } from 'express';

const router = Router();

export interface SourceInfo {
    id: string;
    name: string;
    country: string;
    category: 'free' | 'premium' | 'regional';
    help: string;
}

export const SOURCES_CATALOG: SourceInfo[] = [
    { id: 'semantic', name: 'Semantic Scholar', country: 'Global', category: 'free', help: 'AI-powered academic search engine by Allen AI. 200M+ papers.' },
    { id: 'openalex', name: 'OpenAlex', country: 'Global', category: 'free', help: 'Free comprehensive index of scholarly works. 250M+ records.' },
    { id: 'pubmed', name: 'PubMed', country: 'Global', category: 'free', help: 'Biomedical literature from MEDLINE, life science journals.' },
    { id: 'arxiv', name: 'arXiv', country: 'Global', category: 'free', help: 'Open-access preprints in physics, math, CS, biology, and more.' },
    { id: 'scopus', name: 'Scopus', country: 'Global', category: 'premium', help: 'Elsevier\'s abstract and citation database. Requires API key.' },
    { id: 'crossref', name: 'Crossref', country: 'Global', category: 'free', help: 'Global DOI registration agency. 140M+ DOI records.' },
    { id: 'doaj', name: 'DOAJ', country: 'Global', category: 'free', help: 'Directory of Open Access Journals. 9M+ articles.' },
    { id: 'zenodo', name: 'Zenodo', country: 'Global', category: 'free', help: 'CERN open repository for research data and publications.' },
    { id: 'openaire', name: 'OpenAIRE', country: 'Europe', category: 'free', help: 'European Open Science infrastructure. 150M+ records.' },
    { id: 'core', name: 'CORE', country: 'Global', category: 'free', help: 'Aggregator of open access research. Requires API key.' },
    { id: 'scielo', name: 'SciELO', country: 'LatAm/Spain', category: 'free', help: 'Scientific Electronic Library Online for Latin America.' },
    { id: 'redalyc', name: 'Redalyc', country: 'LatAm', category: 'free', help: 'Diamond Open Access network for LatAm journals.' },
    { id: 'alicia', name: 'ALICIA (CONCYTEC)', country: 'Peru', category: 'free', help: 'Peru\'s national repository aggregator by CONCYTEC.' },
    { id: 'renati', name: 'RENATI (SUNEDU)', country: 'Peru', category: 'free', help: 'Peru\'s national thesis registry by SUNEDU.' },
    { id: 'lareferencia', name: 'La Referencia', country: 'LatAm', category: 'free', help: 'Latin American open access research aggregator.' },
    { id: 'conacyt', name: 'CONAHCyT', country: 'Mexico', category: 'free', help: 'Mexico\'s national science and technology council repository.' },
    { id: 'unam', name: 'UNAM', country: 'Mexico', category: 'free', help: 'Universidad Nacional Autónoma de México repository.' },
    { id: 'anid', name: 'ANID', country: 'Chile', category: 'free', help: 'Chile\'s national research and development agency repository.' },
    { id: 'oasisbr', name: 'Oasisbr', country: 'Brazil', category: 'free', help: 'Brazil\'s open access portal by IBICT.' },
    { id: 'snrd', name: 'SNRD', country: 'Argentina', category: 'free', help: 'Argentina\'s national digital repository system.' },
    { id: 'minciencias', name: 'MinCiencias', country: 'Colombia', category: 'free', help: 'Colombia\'s ministry of science repository.' },
    { id: 'serpapi', name: 'Google Scholar', country: 'Global', category: 'premium', help: 'Google Scholar via SerpApi. Requires API key.' },
    // v2: New AI/ML & CS sources
    { id: 'dblp', name: 'DBLP', country: 'Global', category: 'free', help: 'DBLP Computer Science Bibliography. Publications, authors, venues, BibTeX. No API key.' },
    { id: 'paperswithcode', name: 'Papers With Code', country: 'Global', category: 'free', help: 'Papers with source code, benchmarks, datasets, and methods. No API key.' },
    { id: 'huggingface', name: 'HuggingFace Daily Papers', country: 'Global', category: 'free', help: 'Trending AI/ML papers curated daily on HuggingFace. No API key.' },
    { id: 'openreview', name: 'OpenReview', country: 'Global', category: 'free', help: 'Conference papers from ICLR, NeurIPS, ICML, etc. Optional auth for full access.' },
];

export const SOURCE_GROUPS: Record<string, string[]> = {
    latam: ['alicia', 'renati', 'lareferencia', 'conacyt', 'unam', 'anid', 'oasisbr', 'snrd', 'minciencias', 'scielo', 'redalyc'],
    global: ['semantic', 'openalex', 'pubmed', 'crossref', 'doaj', 'zenodo', 'openaire', 'core'],
    free: ['semantic', 'openalex', 'pubmed', 'arxiv', 'crossref', 'doaj', 'zenodo', 'openaire', 'core', 'scielo', 'redalyc', 'alicia', 'renati', 'lareferencia', 'conacyt', 'unam', 'anid', 'oasisbr', 'snrd', 'minciencias', 'dblp', 'paperswithcode', 'huggingface', 'openreview'],
    premium: ['scopus', 'serpapi'],
    peru: ['alicia', 'renati'],
    ai_ml: ['arxiv', 'huggingface', 'paperswithcode', 'openreview', 'dblp'],
    all: ['semantic', 'openalex', 'pubmed', 'arxiv', 'scopus', 'crossref', 'doaj', 'zenodo', 'openaire', 'core', 'scielo', 'redalyc', 'alicia', 'renati', 'lareferencia', 'conacyt', 'unam', 'anid', 'oasisbr', 'snrd', 'minciencias', 'serpapi', 'dblp', 'paperswithcode', 'huggingface', 'openreview'],
};

router.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            sources: SOURCES_CATALOG,
            groups: SOURCE_GROUPS,
            total: SOURCES_CATALOG.length
        }
    });
});

export default router;
