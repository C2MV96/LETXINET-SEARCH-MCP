/**
 * Global Academic Repositories
 * Zenodo, OpenAIRE, DOAJ, Crossref, CORE, SciELO, Redalyc, SerpApi
 */

import { SEARCH_LIMITS } from '../utils/search-limits';
import { fetchWithTimeout, safeJson, sanitizeQueryForSearch, simplifyQuery, SearchResult, SearchOptions, generateRecordId } from './base';
import { executeFallback, registerSciELOFallback } from './fallback-manager';

/** Standalone abstract cleaner (replaces AI-agent dependency) */
function cleanAndTruncateAbstract(text: string | null | undefined, maxLen: number = Infinity): string {
    if (!text) return '';
    return text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().substring(0, maxLen);
}

export async function searchZenodo(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const cleanQuery = sanitizedQuery.replace(/[\"()]/g, ' ').trim();
        const finalQuery = cleanQuery.length > 120 ? simplifyQuery(cleanQuery, 5) : cleanQuery;
        const limit = Math.min(options?.limit || 20, SEARCH_LIMITS.ZENODO);
        console.log(`[ZENODO] Searching: "${finalQuery.substring(0, 50)}..."`);
        const queryParts = [finalQuery];
        if (options?.yearStart && options?.yearEnd) queryParts.push(`publication_date:[${options.yearStart}-01-01 TO ${options.yearEnd}-12-31]`);
        const url = `https://zenodo.org/api/records?q=${encodeURIComponent(queryParts.join(' AND '))}&size=${limit}&type=publication`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_STANDARD);
        if (!res.ok) return { results: [] };
        const data = await safeJson(res, 'ZENODO');
        const records = data.hits?.hits || [];
        return { results: records.map((record: any) => {
            const m = record.metadata || {};
            return { id: `zenodo_${record.id}`, title: m.title || 'Sin título', authors: m.creators?.map((c: any) => c.name) || ['Autor Desconocido'], year: m.publication_date ? parseInt(m.publication_date.substring(0, 4)) : null, abstract: m.description || null, pdfUrl: record.links?.self_html || record.files?.[0]?.links?.self || null, handleUrl: record.links?.self_html || undefined, source: 'Zenodo', type: m.resource_type?.type || 'publication', university: m.creators?.[0]?.affiliation || 'CERN Open Repository', doi: m.doi || null, citationCount: null };
        }) };
    } catch (e: any) { console.error('[ZENODO] Exception:', e.message); return { results: [] }; }
}

export async function searchOpenAIRE(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const cleanQuery = sanitizedQuery.replace(/[\"()]/g, ' ').trim();
        const finalQuery = cleanQuery.length > 120 ? simplifyQuery(cleanQuery, 6) : cleanQuery;
        const limit = Math.min(options?.limit || 20, SEARCH_LIMITS.OPENAIRE);
        console.log(`[OPENAIRE] Searching: "${finalQuery.substring(0, 50)}..."`);
        let url = `http://api.openaire.eu/search/publications?keywords=${encodeURIComponent(finalQuery)}&format=json&size=${limit}`;
        if (options?.yearStart) url += `&fromDateAccepted=${options.yearStart}-01-01`;
        if (options?.yearEnd) url += `&toDateAccepted=${options.yearEnd}-12-31`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, 25000);
        if (!res.ok) return { results: [] };
        const data = await safeJson(res, 'OPENAIRE');
        const resultsData = data.response?.results?.result || [];
        return { results: resultsData.map((result: any) => {
            const m = result.metadata?.['oaf:entity']?.['oaf:result'] || {};
            let title = 'Sin título';
            if (m.title) title = Array.isArray(m.title) ? (m.title[0]?.$ || m.title[0] || 'Sin título') : (m.title.$ || m.title || 'Sin título');
            let authors = ['Autor Desconocido'];
            if (m.creator) { const list = Array.isArray(m.creator) ? m.creator : [m.creator]; authors = list.map((c: any) => c.$ || c || 'Unknown').filter(Boolean); }
            let doi = null;
            if (m.pid) { const pids = Array.isArray(m.pid) ? m.pid : [m.pid]; const d = pids.find((p: any) => p['@classid'] === 'doi'); if (d) doi = d.$; }
            return { id: `openaire_${result.header?.['dri:objIdentifier']?.$?.replace(/[^a-zA-Z0-9]/g, '_') || generateRecordId('', title)}`, title, authors, year: m.dateofacceptance?.$ ? parseInt(m.dateofacceptance.$.substring(0, 4)) : null, abstract: cleanAndTruncateAbstract(m.description?.$), pdfUrl: m.webresource?.url || null, source: 'OpenAIRE', type: m.resulttype?.['@classname'] || 'publication', university: m.collectedfrom?.['@name'] || 'OpenAIRE', doi, citationCount: null };
        }) };
    } catch (e: any) { console.error('[OPENAIRE] Exception:', e.message); return { results: [] }; }
}

export async function searchDOAJ(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const cleanQuery = sanitizedQuery.replace(/[\"()]/g, ' ').trim();
        const finalQuery = cleanQuery.length > 100 ? simplifyQuery(cleanQuery, 5) : cleanQuery;
        const limit = Math.min(options?.limit || 20, SEARCH_LIMITS.DOAJ);
        console.log(`[DOAJ] Searching: "${finalQuery.substring(0, 50)}..."`);
        const url = `https://doaj.org/api/search/articles/${encodeURIComponent(finalQuery)}?pageSize=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_STANDARD);
        if (!res.ok) return { results: [] };
        const data = await safeJson(res, 'DOAJ');
        return { results: (data.results || []).map((record: any) => {
            const b = record.bibjson || {};
            const doiEntry = b.identifier?.find((id: any) => id.type === 'doi');
            const pdfLink = b.link?.find((l: any) => l.content_type === 'text/html' || l.type === 'fulltext');
            return { id: `doaj_${record.id || generateRecordId('', b.title || '')}`, title: b.title || 'Sin título', authors: b.author?.map((a: any) => a.name) || ['Autor Desconocido'], year: b.year ? parseInt(b.year) : null, abstract: cleanAndTruncateAbstract(b.abstract) || null, pdfUrl: pdfLink?.url || null, source: 'DOAJ', type: 'article', university: b.journal?.publisher || 'Open Access Journal', doi: doiEntry?.id || null, citationCount: null };
        }) };
    } catch (e: any) { console.error('[DOAJ] Exception:', e.message); return { results: [] }; }
}

export async function searchCrossref(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const cleanQuery = sanitizedQuery.replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 20, SEARCH_LIMITS.CROSSREF);
        console.log(`[CROSSREF] Searching: "${cleanQuery.substring(0, 50)}..."`);
        let url = `https://api.crossref.org/works?query=${encodeURIComponent(cleanQuery)}&rows=${limit}`;
        if (options?.yearStart) url += `&filter=from-pub-date:${options.yearStart}`;
        if (options?.yearEnd) url += `,until-pub-date:${options.yearEnd}`;
        const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'LetXipu-Search-MCP/1.0 (mailto:support@letxipu.com)' } }, SEARCH_LIMITS.TIMEOUT_STANDARD);
        if (!res.ok) return { results: [] };
        const data = await safeJson(res, 'CROSSREF');
        return { results: (data.message?.items || []).map((item: any) => ({
            id: `crossref_${item.DOI?.replace(/[^a-zA-Z0-9]/g, '_') || generateRecordId('', item.title?.[0] || '')}`,
            title: item.title?.[0] || 'Sin título',
            authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || ['Autor Desconocido'],
            year: item.published?.['date-parts']?.[0]?.[0] || null,
            abstract: cleanAndTruncateAbstract(item.abstract),
            pdfUrl: item.link?.[0]?.URL || (item.DOI ? `https://doi.org/${item.DOI}` : null),
            handleUrl: item.DOI ? `https://doi.org/${item.DOI}` : undefined,
            source: 'Crossref', type: item.type || 'work',
            university: item.publisher || 'Crossref Registry',
            doi: item.DOI || null, citationCount: item['is-referenced-by-count'] || null
        })) };
    } catch (e: any) { console.error('[CROSSREF] Exception:', e.message); return { results: [] }; }
}

export async function searchSciELO(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const limit = Math.min(options?.limit || 20, SEARCH_LIMITS.SCIELO);
        console.log(`[SCIELO] Searching: "${sanitizedQuery.substring(0, 50)}..."`);
        const url = `https://api.crossref.org/works?query=${encodeURIComponent(sanitizedQuery)}&filter=prefix:10.1590&rows=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'LetXipu-Search-MCP/1.0' } }, SEARCH_LIMITS.TIMEOUT_STANDARD);
        if (!res.ok) return { results: [] };
        const data = await safeJson(res, 'SCIELO');
        return { results: (data.message?.items || []).map((item: any) => ({
            id: `scielo_${item.DOI?.replace(/[^a-zA-Z0-9]/g, '_') || generateRecordId('', item.title?.[0] || '')}`,
            title: item.title?.[0] || 'Sin título',
            authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || ['Autor Desconocido'],
            year: item.published?.['date-parts']?.[0]?.[0] || null, abstract: '',
            pdfUrl: item.DOI ? `https://doi.org/${item.DOI}` : null,
            source: 'SciELO', type: item.type || 'article',
            university: item.publisher || 'SciELO',
            doi: item.DOI || null, citationCount: item['is-referenced-by-count'] || null
        })) };
    } catch (e: any) { console.error('[SCIELO] Exception:', e.message); return { results: [] }; }
}

// Register SciELO with fallback manager to resolve circular dependency
registerSciELOFallback(searchSciELO);

export async function searchCORE(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    const coreApiKey = process.env.CORE_API_KEY;
    if (!coreApiKey) return { results: [] };
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 20, SEARCH_LIMITS.CORE);
        console.log(`[CORE] Searching: "${cleanQuery.substring(0, 50)}..."`);
        const url = `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Authorization': `Bearer ${coreApiKey}`, 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_STANDARD);
        if (!res.ok) return { results: [] };
        const data = await safeJson(res, 'CORE');
        return { results: (data.results || []).map((item: any) => ({
            id: `core_${item.id || generateRecordId('', item.title || '')}`,
            title: item.title || 'Sin título',
            authors: item.authors?.map((a: any) => a.name || a) || ['Autor Desconocido'],
            year: item.yearPublished || null,
            abstract: cleanAndTruncateAbstract(item.abstract) || null,
            pdfUrl: item.downloadUrl || item.sourceFulltextUrls?.[0] || null,
            source: 'CORE', type: 'work',
            university: item.publisher || item.dataProvider?.name || 'CORE Aggregator',
            doi: item.doi || null, citationCount: null
        })) };
    } catch (e: any) { console.error('[CORE] Exception:', e.message); return { results: [] }; }
}

export async function searchRedalyc(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const shortQuery = simplifyQuery(sanitizeQueryForSearch(query), 5);
        const cleanQuery = shortQuery.replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 20, SEARCH_LIMITS.REDALYC);
        console.log(`[REDALYC] Searching: "${cleanQuery.substring(0, 50)}..."`);
        const url = `https://www.redalyc.org/busquedaArticuloFiltros.oa?q=${encodeURIComponent(cleanQuery)}&t=&rcPais498=&tipoRegistro=articulo&pagina=1&tamanioPagina=${limit}`;
        const res = await fetchWithTimeout(url, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.redalyc.org/busqueda.oa', 'X-Requested-With': 'XMLHttpRequest' }
        }, SEARCH_LIMITS.TIMEOUT_STANDARD);
        if (!res.ok) { const fb = await executeFallback(query, options, 'Redalyc'); return fb || { results: [] }; }
        const text = await res.text();
        if (text.trim().startsWith('<')) { const fb = await executeFallback(query, options, 'Redalyc'); return fb || { results: [] }; }
        let data;
        try { data = JSON.parse(text); } catch { const fb = await executeFallback(query, options, 'Redalyc'); return fb || { results: [] }; }
        const records = data.documentos || data.results || [];
        if (records.length === 0) { const fb = await executeFallback(query, options, 'Redalyc'); return fb || { results: [] }; }
        return { results: records.map((r: any) => ({
            id: `redalyc_${r.id || generateRecordId('', r.titulo || '')}`,
            title: r.titulo || r.title || 'Sin título',
            authors: r.autores?.split(';').map((a: string) => a.trim()) || ['Autor Desconocido'],
            year: r.anio ? parseInt(r.anio) : null,
            abstract: cleanAndTruncateAbstract(r.resumen) || null,
            pdfUrl: r.urlPdf || r.url || null, source: 'Redalyc', type: 'article',
            university: r.revista || r.institucion || 'Redalyc',
            doi: r.doi || null, citationCount: null
        })) };
    } catch { const fb = await executeFallback(query, options, 'Redalyc'); return fb || { results: [] }; }
}

export async function searchSerpApi(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    const serpApiKey = options?.serpApiKey || process.env.SERPAPI_KEY;
    if (!serpApiKey) return { results: [] };
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const limit = Math.min(options?.limit || 10, SEARCH_LIMITS.SERPAPI);
        console.log(`[SERPAPI] Searching: "${sanitizedQuery.substring(0, 50)}..."`);
        let url = `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(sanitizedQuery)}&num=${limit}&api_key=${serpApiKey}`;
        if (options?.yearStart) url += `&as_ylo=${options.yearStart}`;
        if (options?.yearEnd) url += `&as_yhi=${options.yearEnd}`;
        const res = await fetchWithTimeout(url, {}, SEARCH_LIMITS.TIMEOUT_STANDARD);
        if (!res.ok) return { results: [] };
        const data = await safeJson(res, 'SERPAPI');
        return { results: (data.organic_results || []).map((r: any) => ({
            id: `serpapi_${generateRecordId(r.link || '', r.title || '')}`,
            title: r.title || 'Sin título',
            authors: r.publication_info?.authors?.map((a: any) => a.name) || ['Google Scholar'],
            year: r.publication_info?.summary?.match(/(\d{4})/)?.[1] ? parseInt(r.publication_info.summary.match(/(\d{4})/)[1]) : null,
            abstract: r.snippet || null,
            pdfUrl: r.resources?.[0]?.link || r.link || null,
            source: 'Google Scholar (SerpApi)', type: 'Paper',
            university: r.publication_info?.summary?.split(' - ')?.[1] || undefined,
            doi: null, citationCount: r.inline_links?.cited_by?.total || null
        })) };
    } catch (e: any) { console.error('[SERPAPI] Exception:', e.message); return { results: [] }; }
}
