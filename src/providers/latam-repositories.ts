/**
 * Latin American National Repositories
 * La Referencia, ALICIA (Peru), RENATI (Peru), CONAHCyT (Mexico),
 * UNAM (Mexico), ANID (Chile), Oasisbr (Brazil), SNRD (Argentina), MinCiencias (Colombia)
 */

import {
    fetchWithTimeout, safeJson, normalizeAccents, sanitizeQueryForSearch,
    simplifyQuery, constructBooleanQuery, SearchResult, SearchOptions, generateRecordId
} from './base';
import { VuFindRecord } from '../types/search';
import { centralizedOpenAlexFallback } from './openalex';
import { executeFallback } from './fallback-manager';
import { SEARCH_LIMITS } from '../utils/search-limits';
import { solveAnubisChallenge } from '../scraping/anubis-solver';

// =============================================================================
// UNIVERSITY MAPS (Peru)
// =============================================================================
export const HANDLE_PREFIX_MAP: Record<string, string> = {
    '20.500.12672': 'Universidad Nacional Mayor de San Marcos',
    '20.500.12404': 'Pontificia Universidad Católica del Perú',
    '20.500.14076': 'Universidad Nacional de Ingeniería',
    '10757': 'Universidad Peruana de Ciencias Aplicadas',
    '20.500.12727': 'Universidad de San Martín de Porres',
    '20.500.12692': 'Universidad César Vallejo',
    '11537': 'Universidad Privada del Norte',
    '20.500.12996': 'Universidad Nacional Agraria La Molina',
    '20.500.12773': 'Universidad Nacional de San Agustín',
    '20.500.14414': 'Universidad Nacional de Trujillo',
    '20.500.12918': 'Universidad Nacional de San Antonio Abad del Cusco',
    '20.500.12894': 'Universidad Nacional del Centro del Perú',
    '20.500.14082': 'Universidad Nacional del Altiplano',
    '20.500.12737': 'Universidad Nacional de la Amazonía Peruana',
    '20.500.14074': 'Universidad Nacional de Cajamarca',
    '20.500.13084': 'Universidad Nacional Federico Villarreal',
    '20.500.12952': 'Universidad Nacional del Callao',
    '20.500.14278': 'Universidad Nacional del Santa',
    '20.500.12599': 'Universidad Nacional Hermilio Valdizán',
    '20.500.12893': 'Universidad Nacional del Altiplano',
    '20.500.12848': 'Universidad Nacional de Piura',
    '20.500.12955': 'Universidad Nacional de Tumbes',
    '20.500.13080': 'Universidad Nacional de Huancavelica',
    '20.500.12959': 'Essalud',
    '20.500.12845': 'Universidad Nacional de Ucayali',
    '20.500.14077': 'Universidad Nacional Toribio Rodríguez de Mendoza',
    '11042': 'Universidad de Piura',
    '20.500.12805': 'Universidad Científica del Sur',
    '20.500.12394': 'Universidad Continental',
    '20.500.12759': 'Universidad Privada Antenor Orrego',
    '20.500.14005': 'Universidad San Ignacio de Loyola',
    '20.500.12920': 'Universidad Católica de Santa María',
    '20.500.12724': 'Universidad de Lima',
    '11354': 'Universidad del Pacífico',
    '20.500.12866': 'Universidad Peruana Cayetano Heredia',
    '20.500.12557': 'Universidad Andina del Cusco',
    '20.500.12802': 'Universidad Señor de Sipán',
    '20.500.12640': 'Universidad ESAN',
    '20.500.14138': 'Universidad Ricardo Palma',
    '20.500.12840': 'Universidad Peruana Unión',
    '20.500.12867': 'Universidad Tecnológica del Perú',
    '20.500.13067': 'Universidad Autónoma del Perú',
    '20.500.12423': 'Universidad Católica San Pablo',
    '20.500.12819': 'Universidad José Carlos Mariátegui',
    '20.500.12979': 'Universidad Católica Los Ángeles de Chimbote',
    '20.500.12428': 'Universidad Alas Peruanas',
    '20.500.12545': 'Universidad Norbert Wiener'
};

export const UNIVERSITY_PREFIX_MAP: Record<string, string> = {
    'UTEC': 'Universidad de Ingeniería y Tecnología',
    'RPUC': 'Pontificia Universidad Católica del Perú',
    'UUPC': 'Universidad Peruana de Ciencias Aplicadas (UPC)',
    'RULI': 'Universidad de Lima',
    'RUNM': 'Universidad Nacional Mayor de San Marcos',
    'UNMS': 'Universidad Nacional Mayor de San Marcos',
    'USMP': 'Universidad de San Martín de Porres',
    'USIL': 'Universidad San Ignacio de Loyola',
    'UCV': 'Universidad César Vallejo',
    'URP': 'Universidad Ricardo Palma',
    'UNSA': 'Universidad Nacional de San Agustín',
    'PUCP': 'Pontificia Universidad Católica del Perú',
    'UNSM': 'Universidad Nacional de San Martín',
    'ESAN': 'Universidad ESAN',
};

export function resolveUniversity(id: string = '', url: string = '', currentName: string = 'Universidad Peruana'): string {
    let university = currentName;
    const prefix = id.split('_')[0];
    const handleMatch = id.match(/((?:20\.500\.\d+)|(?:\d{4,}))/) || (url || '').match(/handle\/((?:20\.500\.\d+)|(?:\d+))/);
    if (!university || university === 'Universidad Peruana' || university === 'Universidad') {
        if (handleMatch && HANDLE_PREFIX_MAP[handleMatch[1]]) university = HANDLE_PREFIX_MAP[handleMatch[1]];
        else if (UNIVERSITY_PREFIX_MAP[prefix]) university = UNIVERSITY_PREFIX_MAP[prefix];
    }
    return university;
}

export async function enhanceAbstractFromSource(url: string | null): Promise<string | null> {
    if (!url || (!url.includes('handle') && !url.includes('.edu.pe') && !url.includes('.gob.pe'))) return null;
    try {
        let targetUrl = url;
        if (url.includes('hdl.handle.net')) {
            const handleId = url.split('handle.net/').pop();
            if (handleId) {
                try {
                    const hRes = await fetchWithTimeout(`https://hdl.handle.net/api/handles/${handleId}`, {}, 5000);
                    if (hRes.ok) { const hData = await hRes.json() as any; const resolved = hData.values?.find((v: any) => v.type === 'URL')?.data?.value; if (resolved) targetUrl = resolved; }
                } catch { }
            }
        }
        const fetchOptions = {
            headers: { 'Accept': 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' },
            redirect: 'follow' as const
        };
        let res = await fetchWithTimeout(targetUrl, fetchOptions, 12000);
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
            let redirectUrl = res.headers.get('location')!;
            if (redirectUrl.startsWith('/')) redirectUrl = new URL(targetUrl).origin + redirectUrl;
            res = await fetchWithTimeout(redirectUrl, fetchOptions, 12000);
        }
        if (!res.ok) return null;
        let html = await res.text();

        if (html.includes('id="anubis_challenge"')) {
            const bypass = await solveAnubisChallenge(html, targetUrl);
            if (bypass) { const bypassedRes = await fetchWithTimeout(targetUrl, { ...fetchOptions, headers: { ...fetchOptions.headers, 'Cookie': bypass } }, 15000); if (bypassedRes.ok) html = await bypassedRes.text(); }
        }

        // DSpace 7 detection
        if (html.includes('<div id="root"></div>') || html.includes('dspace-angular')) {
            const handleId = targetUrl.match(/handle\/((?:20\.500\.\d+)|(?:\d+\/\d+))/)?.[1];
            if (handleId) {
                const apiPaths = ['/server/api/core/items/findHandle?handle=', '/backend/api/core/items/findHandle?handle=', '/api/core/items/findHandle?handle=', '/rest/handle/'];
                const baseUrl = targetUrl.split('/handle/')[0];
                for (const path of apiPaths) {
                    try {
                        const apiRes = await fetchWithTimeout(`${baseUrl}${path}${handleId}`, { headers: { 'Accept': 'application/json' } }, 4000);
                        if (apiRes.ok) {
                            const apiData = await apiRes.json() as any;
                            const abstract = apiData.metadata?.['dc.description.abstract']?.[0]?.value || apiData.metadata?.['dc.description']?.[0]?.value;
                            if (abstract && abstract.length > 50) return abstract;
                        }
                    } catch { continue; }
                }
            }
        }

        if (html.length < 500) return null;

        // Citation metadata
        const citMatch = html.match(/<meta[^>]+(?:name|property)\s*=\s*["'](?:citation_abstract|DCTERMS\.abstract|DC\.abstract|DC\.description\.abstract|description)["'][^>]+content\s*=\s*(["'])([\s\S]*?)\1/i);
        if (citMatch?.[2] && citMatch[2].length > 50 && !citMatch[2].toLowerCase().includes('bienvenidos')) return citMatch[2].trim();

        // Div match
        const divMatch = html.match(/<div[^>]+class\s*=\s*["'][^"']*(?:abstract|simple-item-view-description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        if (divMatch?.[1]) { const found = divMatch[1].replace(/<[^>]+>/g, '').trim(); if (found.length > 50) return found; }

        return null;
    } catch { return null; }
}

function parseAliciaDetailsTable(html: string): { abstract: string | null; university: string | null; authors: string[]; title: string | null; doi: string | null; year: number | null } {
    const result = { abstract: null as string | null, university: null as string | null, authors: [] as string[], title: null as string | null, doi: null as string | null, year: null as number | null };
    const getCellValue = (key: string): string | null => {
        const re = new RegExp('<(?:th|td|rowheader)[^>]*>\\s*' + key.replace(/[.*+?${}()|[\]\\]/g, '\\$&') + '\\s*</(?:th|td|rowheader)>\\s*<(?:td|dd|cell)[^>]*>([\\s\\S]*?)</(?:td|dd|cell)>', 'i');
        const m = html.match(re);
        return m ? m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null;
    };
    const getMultiValue = (key: string): string[] => {
        const re = new RegExp('<(?:th|td|rowheader)[^>]*>\\s*' + key.replace(/[.*+?${}()|[\]\\]/g, '\\$&') + '\\s*</(?:th|td|rowheader)>\\s*<(?:td|dd|cell)[^>]*>([\\s\\S]*?)</(?:td|dd|cell)>', 'i');
        const m = html.match(re);
        return m ? m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '\n').split('\n').map(s => s.trim()).filter(s => s.length > 0) : [];
    };
    const desc = getCellValue('description'); if (desc && desc.length > 50) result.abstract = desc;
    const instname = getCellValue('instname_str'); if (instname) result.university = instname;
    const creators = getMultiValue('dc.creator.none.fl_str_mv'); if (creators.length > 0) result.authors = Array.from(new Set(creators));
    if (result.authors.length === 0) { const av = getMultiValue('author'); if (av.length > 0) result.authors = av.filter(s => s.length > 2); }
    const titleFull = getCellValue('title_full') || getCellValue('title'); if (titleFull) result.title = titleFull;
    const identifiers = getMultiValue('dc.identifier.none.fl_str_mv');
    for (const id of identifiers) { if (id.match(/^10\.\d{4,}/)) { result.doi = id; break; } }
    const pubDate = getCellValue('dc.date.none.fl_str_mv') || getCellValue('publishDate');
    if (pubDate) { const ym = pubDate.match(/(\d{4})/); if (ym) result.year = parseInt(ym[1]); }
    return result;
}

export async function fetchAliciaFullMetadata(recordId: string) {
    const url = `https://alicia.concytec.gob.pe/vufind/Record/${encodeURIComponent(recordId)}/Details`;
    try {
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, 10000);
        if (!res.ok) return null;
        const text = await res.text();
        if (text.includes('bot detection') || text.includes('id="anubis_challenge"')) return null;
        const details = parseAliciaDetailsTable(text);
        if (!details.abstract) {
            const descUrl = `https://alicia.concytec.gob.pe/vufind/Record/${encodeURIComponent(recordId)}/Description`;
            try {
                const descRes = await fetchWithTimeout(descUrl, { headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' } }, 8000);
                if (descRes.ok) {
                    const descHtml = await descRes.text();
                    const match = descHtml.match(/Descripci[oó]n\s+del\s+Art[ií]culo\s*([\s\S]*?)(?:<\/div>|<h[2-5]|Texto\s+completo)/i);
                    if (match) { const raw = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (raw.length > 50) details.abstract = raw; }
                }
            } catch { }
        }
        if (!details.abstract && !details.university && details.authors.length === 0) return null;
        return details;
    } catch { return null; }
}

// =============================================================================
// ALICIA (Peru - CONCYTEC)
// =============================================================================
export async function searchAlicia(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    let resultsWasFallback = false;
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const shortQuery = simplifyQuery(sanitizedQuery, 6);
        let cleanQuery = shortQuery.replace(/\b(investiga|investigación|estudio|busca|encuentra|analiza|revisión|acerca|sobre|el|la|los|las|un|una|de|del|y|o|con|para)\b/gi, '').replace(/[\"()]/g, ' ').replace(/\s+/g, ' ').trim();
        const booleanQuery = constructBooleanQuery(cleanQuery);
        const effectiveQuery = booleanQuery.length > 3 ? booleanQuery : cleanQuery;
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.ALICIA);
        let url = `https://alicia.concytec.gob.pe/vufind/api/v1/search?lookfor=${encodeURIComponent(effectiveQuery)}&type=AllFields&limit=${limit}`;
        if (options?.yearStart && options?.yearEnd) url += `&filter[]=publishDate:[${options.yearStart} TO ${options.yearEnd}]`;
        console.log(`[ALICIA] Searching: "${effectiveQuery.substring(0, 60)}..."`);
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
        if (!res.ok) return { results: [] };
        const text = await res.text();
        let data;
        try { const jsonStart = text.indexOf('{'); const jsonEnd = text.lastIndexOf('}'); data = jsonStart !== -1 && jsonEnd !== -1 ? JSON.parse(text.substring(jsonStart, jsonEnd + 1)) : JSON.parse(text); }
        catch { return { results: [] }; }
        let records = data.records || [];

        // Fallbacks
        if (records.length === 0 && effectiveQuery !== cleanQuery) {
            try { const fbRes = await fetchWithTimeout(`https://alicia.concytec.gob.pe/vufind/api/v1/search?lookfor=${encodeURIComponent(simplifyQuery(cleanQuery, 4))}&type=AllFields&limit=${limit}`, { headers: { 'Accept': 'application/json' } }, 25000); if (fbRes.ok) { const t = await fbRes.text(); const fStart = t.indexOf('{'); if (fStart !== -1) { const d = JSON.parse(t.substring(fStart, t.lastIndexOf('}') + 1)); if (d.records?.length > 0) { records = d.records; resultsWasFallback = true; } } } } catch { }
        }
        if (records.length === 0) {
            const minimalQuery = simplifyQuery(cleanQuery, 2);
            if (minimalQuery.length > 3) { try { const mr = await fetchWithTimeout(`https://alicia.concytec.gob.pe/vufind/api/v1/search?lookfor=${encodeURIComponent(minimalQuery)}&type=AllFields&limit=${limit}`, { headers: { 'Accept': 'application/json' } }, 20000); if (mr.ok) { const t = await mr.text(); const s = t.indexOf('{'); if (s !== -1) { const d = JSON.parse(t.substring(s, t.lastIndexOf('}') + 1)); if (d.records?.length > 0) { records = d.records; resultsWasFallback = true; } } } } catch { } }
        }

        console.log(`[ALICIA] Found=${records.length}`);
        const mappedResults = records.map((record: any) => {
            let authors: string[] = [];
            if (record.authors?.primary && typeof record.authors.primary === 'object') authors = Object.keys(record.authors.primary);
            if (authors.length === 0 && Array.isArray(record.dcContributorAuthor)) authors = record.dcContributorAuthor;
            if (authors.length === 0 && Array.isArray(record.authors)) authors = record.authors.map((a: any) => typeof a === 'string' ? a : a?.name || String(a));

            let pdfUrl: string | null = null; let enrichmentUrl: string | null = null;
            if (Array.isArray(record.urls)) {
                const pdfEntry = record.urls.find((u: any) => (typeof u === 'string' ? u : u?.url)?.toLowerCase().endsWith('.pdf'));
                if (pdfEntry) pdfUrl = typeof pdfEntry === 'string' ? pdfEntry : pdfEntry.url;
                const handleEntry = record.urls.find((u: any) => (typeof u === 'string' ? u : u?.url)?.includes('handle'));
                if (handleEntry) enrichmentUrl = typeof handleEntry === 'string' ? handleEntry : handleEntry.url;
                if (!pdfUrl) pdfUrl = enrichmentUrl;
                if (!pdfUrl && record.urls[0]) { const first = record.urls[0]; pdfUrl = typeof first === 'string' ? first : first.url; }
            }
            if (!enrichmentUrl) enrichmentUrl = pdfUrl;

            let year = null;
            for (const dateField of [record.dcDateIssued, record.publicationDates]) {
                if (Array.isArray(dateField) && dateField[0]) { const match = String(dateField[0]).match(/\d{4}/); if (match) { year = parseInt(match[0]); break; } }
            }

            let university = record.institutions?.[0] || '';
            if (!university || university === 'Universidad Peruana') {
                if (Array.isArray(record.dcPublisher) && record.dcPublisher[0]) university = record.dcPublisher[0];
                else if (Array.isArray(record.thesisDegreeGrantor) && record.thesisDegreeGrantor[0]) university = record.thesisDegreeGrantor[0];
            }
            if (!university) university = 'Universidad Peruana';
            university = resolveUniversity(record.id, pdfUrl || '', university);

            let doi: string | null = null;
            if (Array.isArray(record.dcIdentifierDoi) && record.dcIdentifierDoi[0]) doi = record.dcIdentifierDoi[0].replace(/^https?:\/\/doi\.org\//i, '');

            return {
                id: record.id || generateRecordId(pdfUrl || '', record.title || ''),
                title: record.title || 'Sin título', authors: authors.length > 0 ? authors : ['Autor Desconocido'],
                year, abstract: record.summary?.[0] || null,
                pdfUrl, handleUrl: record.id ? `https://alicia.concytec.gob.pe/vufind/Record/${record.id}` : pdfUrl,
                source: 'ALICIA (CONCYTEC)', type: record.formats?.[0] || 'Tesis',
                university, citationCount: null, doi, metadata: { enrichmentUrl }
            };
        });

        // DME Enhancement
        const isTruncated = (t: string | null) => !!t && (/\.{3}\s*Descripci[oó]n\s+completa\s*$/i.test(t) || /\.{3}\s*$/.test(t) || /\u2026\s*$/.test(t));
        const needsEnhancement = (r: SearchResult) => !r.abstract || r.abstract.length < 80 || isTruncated(r.abstract) || r.university === 'Universidad Peruana' || r.authors[0] === 'Autor Desconocido';
        const resultsToEnhance = mappedResults.filter((r: SearchResult) => needsEnhancement(r));
        if (resultsToEnhance.length > 0) {
            console.log(`[ALICIA] DME: Enhancing ${resultsToEnhance.length}/${mappedResults.length} records...`);
            await Promise.all(resultsToEnhance.slice(0, 30).map(async (res: SearchResult) => {
                if (!res.id) return;
                try {
                    const details = await fetchAliciaFullMetadata(res.id);
                    if (details) {
                        if (details.abstract && details.abstract.length > (res.abstract?.length || 0)) res.abstract = details.abstract;
                        if (details.university && (!res.university || res.university === 'Universidad Peruana')) res.university = details.university;
                        if (details.authors.length > 0 && res.authors[0] === 'Autor Desconocido') res.authors = details.authors;
                        if (details.doi && !res.doi) res.doi = details.doi;
                        if (details.year && !res.year) res.year = details.year;
                    }
                    if ((!res.abstract || isTruncated(res.abstract)) && res.metadata?.enrichmentUrl) {
                        const enhanced = await enhanceAbstractFromSource(res.metadata.enrichmentUrl as string);
                        if (enhanced && enhanced.length > (res.abstract?.length || 0)) res.abstract = enhanced;
                    }
                } catch { }
            }));
        }

        const filteredResults = options?.university
            ? mappedResults.filter((r: SearchResult) => {
                const needle = options.university!.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return `${r.university || ''} ${r.title || ''} ${r.abstract || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(needle);
            })
            : mappedResults;
        return { results: filteredResults, metadata: { isFallback: resultsWasFallback } };
    } catch (e: any) {
        console.warn(`[ALICIA] Exception: ${e.message}`);
        return { results: [], metadata: { isFallback: false } };
    }
}

export async function searchRenati(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        let { results, metadata: aliciaMetadata } = await searchAlicia(query, { ...options, limit: options?.limit || SEARCH_LIMITS.RENATI });
        let isFallback = aliciaMetadata?.isFallback || false;
        if (results.length === 0) {
            const simplifiedQuery = simplifyQuery(sanitizeQueryForSearch(query), 3);
            if (simplifiedQuery.length > 5) { const retry = await searchAlicia(simplifiedQuery, { ...options, limit: options?.limit || SEARCH_LIMITS.RENATI }); results = retry.results; if (results.length > 0) isFallback = true; }
        }
        if (results.length === 0) {
            const minimalQuery = simplifyQuery(sanitizeQueryForSearch(query), 2);
            if (minimalQuery.length > 4) { const retry = await searchAlicia(minimalQuery, { ...options, limit: options?.limit || SEARCH_LIMITS.RENATI }); results = retry.results; }
        }
        return { results: results.map(r => ({ ...r, source: 'RENATI (SUNEDU)', type: r.type || 'Tesis' })), metadata: { isFallback } };
    } catch (e: any) {
        const fallbackRes = await executeFallback(query, options, 'Renati');
        return fallbackRes || { results: [] };
    }
}

// =============================================================================
// LA REFERENCIA (LatAm Aggregator)
// =============================================================================
export async function searchLaReferencia(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = normalizeAccents(query).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.LA_REFERENCIA);
        console.log(`[LA REFERENCIA] Searching: "${cleanQuery.substring(0, 50)}..."`);
        const fields = ['id', 'title', 'authors', 'publicationDates', 'summary', 'urls', 'formats', 'institutions', 'country', 'doi'].map(f => `&field[]=${f}`).join('');
        let url = `https://www.lareferencia.info/vufind/api/v1/search?lookfor=${encodeURIComponent(cleanQuery)}&type=AllFields&limit=${limit}&format=json${fields}`;
        if (options?.yearStart && options?.yearEnd) url += `&filter[]=publishDate:[${options.yearStart} TO ${options.yearEnd}]`;
        const res = await fetchWithTimeout(url, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.lareferencia.info/' }
        }, SEARCH_LIMITS.TIMEOUT_LONG);
        if (!res.ok) {
            const fb = await executeFallback(query, options, 'La Referencia');
            if (fb) return fb;
            return { ...(await centralizedOpenAlexFallback(query, options, 'La Referencia')), metadata: { isFallback: true } };
        }
        const data = await safeJson(res, 'LA REFERENCIA');
        const records = data.records || [];
        return {
            results: records.map((record: any) => {
                let authors: string[] = []; if (record.authors?.primary) authors = Object.keys(record.authors.primary);
                else if (Array.isArray(record.authors)) authors = record.authors.map((a: any) => typeof a === 'string' ? a : a?.name);
                if (authors.length === 0) authors = ['Autor Desconocido'];
                let pdfUrl: string | null = null;
                if (Array.isArray(record.urls) && record.urls[0]) { const first = record.urls[0]; pdfUrl = typeof first === 'string' ? first : first.url; }
                let year = null; if (record.publicationDates?.[0]) { const match = String(record.publicationDates[0]).match(/\d{4}/); if (match) year = parseInt(match[0]); }
                return { id: record.id || generateRecordId(pdfUrl || '', record.title || ''), title: record.title || 'Sin título', authors, year, abstract: record.summary?.[0] || null, pdfUrl, source: 'La Referencia', type: record.formats?.[0] || 'Tesis', university: record.institutions?.[0] || record.country || 'Latinoamérica', citationCount: null, doi: record.doi || null };
            }),
            metadata: { isFallback: false }
        };
    } catch (e: any) {
        console.warn(`[LA REFERENCIA] Exception: ${e.message}`);
        const fb = await executeFallback(query, options, 'La Referencia');
        if (fb) return fb;
        return { ...(await centralizedOpenAlexFallback(query, options)), metadata: { isFallback: true } };
    }
}

// =============================================================================
// NATIONAL REPOSITORIES
// =============================================================================
export async function searchConacyt(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.CONACYT);
        console.log(`[CONACYT] Searching: "${cleanQuery.substring(0, 50)}..."`);
        const url = `https://repositorio.conacyt.mx/rest/items/find-by-metadata-field?query=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
        if (!res.ok) { const { results: r, metadata: m } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' México', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'CONAHCyT (México)' })), metadata: { ...m, isFallback: true } }; }
        const data = await safeJson(res, 'CONAHCyT'); const records = Array.isArray(data) ? data : (data.items || []);
        return { results: records.map((r: any) => ({ id: r.uuid || generateRecordId('', r.name || ''), title: r.name || r.title || 'Sin título', authors: r.metadata?.find((m: any) => m.key === 'dc.contributor.author')?.value ? [r.metadata.find((m: any) => m.key === 'dc.contributor.author').value] : ['Autor Desconocido'], year: r.metadata?.find((m: any) => m.key === 'dc.date.issued')?.value ? parseInt(r.metadata.find((m: any) => m.key === 'dc.date.issued').value.substring(0, 4)) : null, abstract: r.metadata?.find((m: any) => m.key === 'dc.description.abstract')?.value || '', pdfUrl: r.link || null, source: 'CONAHCyT (México)', type: 'Tesis', university: r.metadata?.find((m: any) => m.key === 'dc.publisher')?.value || 'México', citationCount: null, doi: null })) };
    } catch { const { results: r, metadata: m } = await searchLaReferencia(query + ' México', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'CONAHCyT (México)' })), metadata: { ...m, isFallback: true } }; }
}

export async function searchUnam(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.UNAM);
        const url = `https://repositorio.unam.mx/oaipmh-rest/search?query=${encodeURIComponent(cleanQuery)}&rows=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
        if (!res.ok) { const { results: r, metadata: m } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' UNAM', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'UNAM (México)' })), metadata: { ...m, isFallback: true } }; }
        const data = await safeJson(res, 'UNAM'); const records = data.response?.docs || data.records || [];
        return { results: records.map((r: any) => ({ id: r.id || generateRecordId('', r.title || ''), title: r.title || 'Sin título', authors: r.author ? [r.author] : ['Autor Desconocido'], year: r.date ? parseInt(String(r.date).substring(0, 4)) : null, abstract: r.description || '', pdfUrl: r.url || null, source: 'UNAM (México)', type: 'Tesis', university: 'Universidad Nacional Autónoma de México', citationCount: null, doi: null })) };
    } catch { const { results: r, metadata: m } = await searchLaReferencia(query + ' UNAM', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'UNAM (México)' })), metadata: { ...m, isFallback: true } }; }
}

export async function searchAnid(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.ANID);
        const url = `https://repositorio.anid.cl/rest/items/find-by-metadata-field?query=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
        if (!res.ok) { const { results: r, metadata: m } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' Chile', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'ANID (Chile)' })), metadata: { ...m, isFallback: true } }; }
        const data = await safeJson(res, 'ANID'); const records = Array.isArray(data) ? data : (data.items || []);
        return { results: records.map((r: any) => ({ id: r.uuid || generateRecordId('', r.name || ''), title: r.name || 'Sin título', authors: r.metadata?.find((m: any) => m.key === 'dc.contributor.author')?.value ? [r.metadata.find((m: any) => m.key === 'dc.contributor.author').value] : ['Autor Desconocido'], year: r.metadata?.find((m: any) => m.key === 'dc.date.issued')?.value ? parseInt(r.metadata.find((m: any) => m.key === 'dc.date.issued').value.substring(0, 4)) : null, abstract: r.metadata?.find((m: any) => m.key === 'dc.description.abstract')?.value || '', pdfUrl: r.link || null, source: 'ANID (Chile)', type: 'Tesis', university: r.metadata?.find((m: any) => m.key === 'dc.publisher')?.value || 'Chile', citationCount: null, doi: null })) };
    } catch { const { results: r, metadata: m } = await searchLaReferencia(query + ' Chile', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'ANID (Chile)' })), metadata: { ...m, isFallback: true } }; }
}

function convertToPortuguese(spanishQuery: string): string {
    const t: Record<string, string> = { 'investigación': 'pesquisa', 'investigacion': 'pesquisa', 'estudio': 'estudo', 'análisis': 'análise', 'desarrollo': 'desenvolvimento', 'evaluación': 'avaliação', 'mejora': 'melhoria', 'proceso': 'processo', 'calidad': 'qualidade', 'universidad': 'universidade', 'tesis': 'tese', 'salud': 'saúde', 'enfermedad': 'doença', 'tratamiento': 'tratamento' };
    let portuguese = spanishQuery.toLowerCase();
    for (const [es, pt] of Object.entries(t)) portuguese = portuguese.replace(new RegExp(`\\b${es}\\b`, 'gi'), pt);
    return portuguese;
}

export async function searchOasisbr(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = simplifyQuery(sanitizeQueryForSearch(query), 5).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.OASISBR);
        console.log(`[OASISBR] Searching: "${cleanQuery.substring(0, 50)}..."`);
        const url = `https://oasisbr.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(cleanQuery)}&type=AllFields&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
        let records: any[] = [];
        if (res.ok) { const data = await safeJson(res, 'OASISBR'); records = data.records || []; }
        if (records.length < 5) {
            const ptQuery = convertToPortuguese(cleanQuery);
            if (ptQuery !== cleanQuery) {
                try { const ptRes = await fetchWithTimeout(`https://oasisbr.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(ptQuery)}&type=AllFields&limit=${limit}`, { headers: { 'Accept': 'application/json' } }, 25000); if (ptRes.ok) { const ptData = await safeJson(ptRes, 'OASISBR-PT'); const existingIds = new Set(records.map((r: any) => r.id)); for (const rec of (ptData.records || [])) { if (!existingIds.has(rec.id)) records.push(rec); } } } catch { }
            }
        }
        if (records.length === 0) { const { results: r, metadata: m } = await searchLaReferencia(cleanQuery + ' Brasil', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'Oasisbr (Brasil)' })), metadata: { ...m, isFallback: true } }; }
        return { results: records.map((record: any) => {
            let authors: string[] = []; if (record.authors?.primary) authors = Object.keys(record.authors.primary);
            else if (Array.isArray(record.authors)) authors = record.authors.map((a: any) => typeof a === 'string' ? a : a?.name);
            if (authors.length === 0) authors = ['Autor Desconocido'];
            let pdfUrl: string | null = null; if (Array.isArray(record.urls) && record.urls[0]) { const first = record.urls[0]; pdfUrl = typeof first === 'string' ? first : first.url; }
            return { id: record.id || generateRecordId(pdfUrl || '', record.title || ''), title: record.title || 'Sin título', authors, year: record.publicationDates?.[0] ? parseInt(record.publicationDates[0]) : null, abstract: record.summary?.[0] || '', pdfUrl, handleUrl: record.id ? `https://oasisbr.ibict.br/vufind/Record/${record.id}` : undefined, source: 'Oasisbr (Brasil)', type: record.formats?.[0] || 'Tesis', university: record.institutions?.[0] || 'Brasil', citationCount: null, doi: null };
        }) };
    } catch (e: any) {
        const { results: r, metadata: m } = await searchLaReferencia(query + ' Brasil', options);
        return { results: r.map((x: any) => ({ ...x, source: 'Oasisbr (Brasil)' })), metadata: { ...m, isFallback: true } };
    }
}

export async function searchSnrd(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.SNRD);
        const url = `https://bdu.siu.edu.ar/api/v1/search?q=${encodeURIComponent(cleanQuery)}&rows=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
        if (!res.ok) { const { results: r, metadata: m } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' Argentina', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'SNRD (Argentina)' })), metadata: { ...m, isFallback: true } }; }
        const data = await safeJson(res, 'SNRD'); const records = data.response?.docs || data.records || [];
        return { results: records.map((r: any) => ({ id: r.id || generateRecordId('', r.title || ''), title: r.title || 'Sin título', authors: r.author ? [r.author] : ['Autor Desconocido'], year: r.date ? parseInt(String(r.date).substring(0, 4)) : null, abstract: r.description || '', pdfUrl: r.url || null, source: 'SNRD (Argentina)', type: 'Tesis', university: r.institution || 'Argentina', citationCount: null, doi: null })) };
    } catch { const { results: r, metadata: m } = await searchLaReferencia(query + ' Argentina', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'SNRD (Argentina)' })), metadata: { ...m, isFallback: true } }; }
}

export async function searchMinciencias(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/[\"()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.MINCIENCIAS);
        const url = `https://repositorionacional.gov.co/rest/items/find-by-metadata-field?query=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
        if (!res.ok) { const { results: r, metadata: m } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' Colombia', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'MinCiencias (Colombia)' })), metadata: { ...m, isFallback: true } }; }
        const data = await safeJson(res, 'MINCIENCIAS'); const records = Array.isArray(data) ? data : (data.items || []);
        return { results: records.map((r: any) => ({ id: r.uuid || generateRecordId('', r.name || ''), title: r.name || 'Sin título', authors: r.metadata?.find((m: any) => m.key === 'dc.contributor.author')?.value ? [r.metadata.find((m: any) => m.key === 'dc.contributor.author').value] : ['Autor Desconocido'], year: r.metadata?.find((m: any) => m.key === 'dc.date.issued')?.value ? parseInt(r.metadata.find((m: any) => m.key === 'dc.date.issued').value.substring(0, 4)) : null, abstract: r.metadata?.find((m: any) => m.key === 'dc.description.abstract')?.value || '', pdfUrl: r.link || null, source: 'MinCiencias (Colombia)', type: 'Tesis', university: r.metadata?.find((m: any) => m.key === 'dc.publisher')?.value || 'Colombia', citationCount: null, doi: null })) };
    } catch { const { results: r, metadata: m } = await searchLaReferencia(query + ' Colombia', options); return { results: r.map((x: any) => ({ ...x, source: m?.isFallback ? x.source : 'MinCiencias (Colombia)' })), metadata: { ...m, isFallback: true } }; }
}
