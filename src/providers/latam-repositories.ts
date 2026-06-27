/**
 * Latin American National Repositories
 * La Referencia, ALICIA (Peru), RENATI (Peru), CONAHCyT (Mexico), 
 * UNAM (Mexico), ANID (Chile), Oasisbr (Brazil), SNRD (Argentina), MinCiencias (Colombia)
 */

import {
    fetchWithTimeout,
    safeJson,
    normalizeAccents,
    sanitizeQueryForSearch,
    simplifyQuery,
    constructBooleanQuery,
    SearchResult,
    SearchOptions,
    generateRecordId
} from './base';
import { VuFindRecord } from '../types/search';
import { centralizedOpenAlexFallback } from './openalex';
import { executeFallback } from './fallback-manager';
import { SEARCH_LIMITS } from '../utils/search-limits';
import { solveAnubisChallenge } from '../scraping/anubis-solver';

// =============================================================================
// UNIVERSITY MAPS (Peru)
// =============================================================================
import aliciaData from '../data/alicia-institutions.json';

export const HANDLE_PREFIX_MAP: Record<string, string> = {};
export const UNIVERSITY_PREFIX_MAP: Record<string, string> = {};

aliciaData.institutions.forEach((inst: any) => {
    if (Array.isArray(inst.handlePrefixes)) {
        inst.handlePrefixes.forEach((prefix: string) => {
            HANDLE_PREFIX_MAP[prefix] = inst.fullName;
        });
    }
    if (Array.isArray(inst.acronyms)) {
        inst.acronyms.forEach((acronym: string) => {
            UNIVERSITY_PREFIX_MAP[acronym] = inst.fullName;
        });
    }
});

/**
 * Resolve university name from ID or URL using known mappings
 */
export function resolveUniversity(id: string = '', url: string = '', currentName: string = 'Universidad Peruana'): string {
    let university = currentName;
    const prefix = id.split('_')[0];
    const handleMatch = id.match(/((?:20\.500\.\d+)|(?:\d{4,}))/) || (url || '').match(/handle\/((?:20\.500\.\d+)|(?:\d+))/);

    if (!university || university === 'Universidad Peruana' || university === 'Universidad') {
        if (handleMatch && HANDLE_PREFIX_MAP[handleMatch[1]]) {
            university = HANDLE_PREFIX_MAP[handleMatch[1]];
        } else if (UNIVERSITY_PREFIX_MAP[prefix]) {
            university = UNIVERSITY_PREFIX_MAP[prefix];
        }
    }
    return university;
}

/**
 * DME (Deep Metadata Enhancement) - Extracts abstract directly from repository source
 * if the aggregator (ALICIA) provides an empty summary.
 */
export async function enhanceAbstractFromSource(url: string | null): Promise<string | null> {
    if (!url || (!url.includes('handle') && !url.includes('.edu.pe') && !url.includes('.gob.pe'))) return null;

    try {
        // Phase 2: Handle API Resolution (Discovery)
        // If the URL is just a handle.net redirect, or we suspect it moved
        let targetUrl = url;
        if (url.includes('hdl.handle.net')) {
            const handleId = url.split('handle.net/').pop();
            if (handleId) {
                try {
                    const hRes = await fetchWithTimeout(`https://hdl.handle.net/api/handles/${handleId}`, {}, 5000);
                    if (hRes.ok) {
                        const hData = await hRes.json() as any;
                        const resolved = hData.values?.find((v: any) => v.type === 'URL')?.data?.value;
                        if (resolved) targetUrl = resolved;
                    }
                } catch (e) { /* fallback to original url */ }
            }
        }

        // Use a more realistic User-Agent and headers
        const fetchOptions = {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Referer': 'https://alicia.concytec.gob.pe/'
            },
            redirect: 'follow' as any // Ensure native fetch follows redirects
        };

        let res = await fetchWithTimeout(targetUrl, fetchOptions, 12000);

        // Manual Redirect Handling (Helper for some environments)
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
            let redirectUrl = res.headers.get('location')!;
            if (redirectUrl.startsWith('/')) {
                const baseUrl = new URL(targetUrl).origin;
                redirectUrl = baseUrl + redirectUrl;
            }
            console.log(`[ALICIA-DME] Following redirect to: ${redirectUrl}`);
            res = await fetchWithTimeout(redirectUrl, fetchOptions, 12000);
        }

        if (!res.ok) {
            console.log(`[ALICIA-DME] Source Fetch Failed: ${res.status} for ${targetUrl}`);
            return null;
        }
        let html = await res.text();

        // Phase 1.5: Anubis Bypass
        if (html.includes('id="anubis_challenge"') || html.includes('techaro.lol-anubis')) {
            console.log(`[ALICIA-DME] Anubis Challenge detected for ${targetUrl}`);
            const bypass = await solveAnubisChallenge(targetUrl, html);
            if (bypass) {
                console.log(`[ALICIA-DME] Anubis Bypass Successful for ${targetUrl}`);
                // Re-fetch with the new cookie
                const bypassedRes = await fetchWithTimeout(targetUrl, {
                    ...fetchOptions,
                    headers: {
                        ...fetchOptions.headers,
                        'Cookie': bypass
                    }
                }, 15000);
                if (bypassedRes.ok) {
                    html = await bypassedRes.text();
                }
            }
        }

        // Phase 2: DSpace 7 (React/Angular) Detection
        // If the page is mostly empty and has a module script, it's likely DSpace 7.
        if (html.includes('<div id="root"></div>') || html.includes('dspace-angular') || html.includes('<ds-app>') || html.includes('<ds-app></ds-app>')) {
            console.log(`[ALICIA-DME] DSpace 7 detected for ${targetUrl}`);
            const handleId = targetUrl.match(/handle\/((?:20\.500\.\d+)|(?:\d+\/\d+))/)?.[1];
            if (handleId) {
                const baseUrl = targetUrl.split('/handle/')[0];
                
                // Try REST API (common patterns in DSpace 6/7)
                const apiPaths = [
                    '/server/api/core/items/findHandle?handle=',
                    '/backend/api/core/items/findHandle?handle=',
                    '/api/core/items/findHandle?handle=',
                    '/dspace-spring-rest/api/core/items/findHandle?handle=',
                    '/rest/handle/'
                ];
                for (const path of apiPaths) {
                    try {
                        let finalUrl = `${baseUrl}${path}${handleId}`;
                        // Special case for DSpace 6 REST
                        if (path === '/rest/handle/') finalUrl = `${baseUrl}${path}${handleId}?expand=metadata`;

                        const apiRes = await fetchWithTimeout(finalUrl, { headers: { 'Accept': 'application/json' } }, 4000);
                        if (apiRes.ok) {
                            const apiData = await apiRes.json() as any;
                            // Support for both DSpace 7 and DSpace 6 JSON structures
                            const abstract = apiData.metadata?.['dc.description.abstract']?.[0]?.value ||
                                apiData.metadata?.['dc.description']?.[0]?.value ||
                                (Array.isArray(apiData.metadata) ? apiData.metadata.find((m: any) => m.key === 'dc.description.abstract')?.value : null);
                            if (abstract && abstract.length > 50) {
                                console.log(`[ALICIA-DME] Success via REST API ${path} (${abstract.substring(0, 30)}...)`);
                                return abstract;
                            }
                        }
                    } catch (e) { continue; }
                }
                
                // Fallback: pid/find (used by La Molina and newer DSpace 7 instances)
                const pidPaths = ['/server/api/pid/find?id=', '/backend/api/pid/find?id=', '/api/pid/find?id='];
                for (const pidPath of pidPaths) {
                    try {
                        const pidUrl = `${baseUrl}${pidPath}${handleId}`;
                        const pidRes = await fetchWithTimeout(pidUrl, { headers: { 'Accept': 'application/json' }, redirect: 'manual' as any }, 8000);
                        
                        let itemUrl: string | null = null;
                        if (pidRes.status === 302) {
                            itemUrl = pidRes.headers.get('location');
                        } else if (pidRes.ok) {
                            const pidData = await pidRes.json() as any;
                            if (pidData?._links?.self?.href) itemUrl = pidData._links.self.href;
                        }
                        
                        if (itemUrl) {
                            const itemRes = await fetchWithTimeout(itemUrl, { headers: { 'Accept': 'application/json' } }, 8000);
                            if (itemRes.ok) {
                                const itemData = await itemRes.json() as any;
                                const abstract = itemData.metadata?.['dc.description.abstract']?.[0]?.value ||
                                    itemData.metadata?.['dc.description']?.[0]?.value;
                                if (abstract && abstract.length > 50) {
                                    console.log(`[ALICIA-DME] Success via pid/find (${abstract.substring(0, 30)}...)`);
                                    return abstract;
                                }
                            }
                        }
                    } catch (e) { continue; }
                }
            }
        }

        // GENERIC FILTER: If HTML looks like a homepage or error page, skip it
        if (html.length < 500 || html.includes('<title>Index of /</title>') || html.includes('<h1>Forbidden</h1>')) return null;

        // 0. Try Citation Metadata (Standard in many journals/OJS)
        const citMatch = html.match(/<meta[^>]+(?:name|property)\s*=\s*["'](?:citation_abstract|DCTERMS\.abstract|DC\.abstract|DC\.description\.abstract|DC\.Description\.Abstract|description)["'][^>]+content\s*=\s*(["'])([\s\S]*?)\1/i) ||
            html.match(/<meta[^>]+content\s*=\s*(["'])([\s\S]*?)\1[^>]+(?:name|property)\s*=\s*["'](?:citation_abstract|DCTERMS\.abstract|DC\.abstract|DC\.description\.abstract|DC\.Description\.Abstract|description)["']/i);

        if (citMatch && (citMatch[2] || citMatch[1])) {
            const found = (citMatch[2] || citMatch[1]).trim();
            const lower = found.toLowerCase();
            if (!lower.includes('bienvenidos') &&
                !lower.includes('alberga colecciones') &&
                !lower.includes('repositorio institucional') &&
                found.length > 50) {
                console.log(`[ALICIA-DME] Success via Citation/DC Match (${found.substring(0, 30)}...)`);
                return found;
            }
        }

        // 1. Try regular description meta tag (often used as fallback)
        const dMatch = html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]+content\s*=\s*(["'])([\s\S]*?)\1/i);
        if (dMatch && dMatch[2]) {
            const found = dMatch[2].trim();
            if (found.length > 80 && !found.toLowerCase().includes('bienvenidos')) {
                console.log(`[ALICIA-DME] Success via Meta-Description (${found.substring(0, 30)}...)`);
                return found;
            }
        }

        // 2. Try regular description meta tag
        const metaMatch = html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]+content\s*=\s*(["'])([\s\S]*?)\1/i) ||
            html.match(/<meta[^>]+content\s*=\s*(["'])([\s\S]*?)\1[^>]+name\s*=\s*["']description["']/i);
        if (metaMatch && (metaMatch[2] || metaMatch[1])) {
            const found = (metaMatch[2] || metaMatch[1]).trim();
            const lower = found.toLowerCase();
            if (!lower.includes('bienvenidos') &&
                !lower.includes('repositorio institucional') &&
                found.length > 80) {
                console.log(`[ALICIA-DME] Success via Meta Match (${found.substring(0, 30)}...)`);
                return found;
            }
        }

        // 3. Try div with abstract class or specific DSpace view classes
        const divMatch = html.match(/<div[^>]+class\s*=\s*["'][^"']*(?:abstract|simple-item-view-description|item-page-field-wrapper)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        if (divMatch && divMatch[1]) {
            const found = divMatch[1].replace(/<[^>]+>/g, '').replace(/Resumen:?/i, '').replace(/Abstract:?/i, '').trim();
            if (found.length > 50) {
                console.log(`[ALICIA-DME] Success via Div Match (${found.substring(0, 30)}...)`);
                return found;
            }
        }

        // 4. Try table cells (Common in "Simple Item Record" view)
        const tdMatch = html.match(/<td[^>]+class\s*=\s*["'](?:standard|metadataFieldLabel)["'][^>]*>(?:Resumen|Abstract|Abstract:?|Resumen:?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
            html.match(/<div[^>]+class\s*=\s*["'](?:abstract-text|item-page-field-wrapper|simple-item-view-description)["'][^>]*>([\s\S]*?)<\/div>/i);

        if (tdMatch && tdMatch[1]) {
            const found = tdMatch[1].replace(/<[^>]+>/g, '').replace(/Resumen:?/i, '').replace(/Abstract:?/i, '').trim();
            if (found.length > 50) {
                console.log(`[ALICIA-DME] Success via DOM-Selector Match (${found.substring(0, 30)}...)`);
                return found;
            }
        }

        console.log(`[ALICIA-DME] Failed to find abstract in HTML for ${targetUrl}`);
        return null;
    } catch (e: any) {
        console.warn(`[ALICIA-DME] Exception scraping ${url}: ${e.message}`);
        return null;
    }
}

interface AliciaDetailsMetadata {
    abstract: string | null;
    university: string | null;
    authors: string[];
    title: string | null;
    doi: string | null;
    publisher: string | null;
    year: number | null;
    sourceJournal: string | null;
    pdfUrl?: string | null;
}

async function parseAliciaDetailsTable(html: string): Promise<AliciaDetailsMetadata> {
    const result: AliciaDetailsMetadata = {
        abstract: null, university: null, authors: [], title: null,
        doi: null, publisher: null, year: null, sourceJournal: null
    };

    const getCellValue = (key: string): string | null => {
        const escaped = key.replace(/[.*+?${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(
            '<(?:th|td|rowheader)[^>]*>\\s*' + escaped + '\\s*<\\/(?:th|td|rowheader)>\\s*<(?:td|dd|cell)[^>]*>([\\s\\S]*?)<\\/(?:td|dd|cell)>',
            'i'
        );
        const m = html.match(re);
        if (!m) return null;
        return m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    };

    const getMultiValue = (key: string): string[] => {
        const escaped = key.replace(/[.*+?${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(
            '<(?:th|td|rowheader)[^>]*>\\s*' + escaped + '\\s*<\\/(?:th|td|rowheader)>\\s*<(?:td|dd|cell)[^>]*>([\\s\\S]*?)<\\/(?:td|dd|cell)>',
            'i'
        );
        const m = html.match(re);
        if (!m) return [];
        const raw = m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '\n');
        return raw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    };

    const desc = getCellValue('description');
    if (desc && desc.length > 50) result.abstract = desc;

    const instname = getCellValue('instname_str');
    if (instname) result.university = instname;

    if (!result.university) {
        const instMatch = html.match(/Instituci[o\u00f3]n:?\s*<\/(?:th|td|rowheader)>\s*<(?:td|dd|cell)[^>]*>\s*([\s\S]*?)\s*<\/(?:td|dd|cell)>/i);
        if (instMatch) result.university = instMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const creators = getMultiValue('dc.creator.none.fl_str_mv');
    if (creators.length > 0) {
        result.authors = Array.from(new Set(creators));
    }
    if (result.authors.length === 0) {
        const authorVal = getMultiValue('author');
        if (authorVal.length > 0) result.authors = Array.from(new Set(authorVal.filter(s => s.length > 2)));
    }

    const titleFull = getCellValue('title_full') || getCellValue('title');
    if (titleFull) result.title = titleFull;

    const identifiers = getMultiValue('dc.identifier.none.fl_str_mv');
    for (const id of identifiers) {
        if (id.match(/^10\.\d{4,}/)) { result.doi = id; break; }
    }

    const publisher = getCellValue('dc.publisher.none.fl_str_mv');
    if (publisher) result.publisher = publisher;

    const pubDate = getCellValue('dc.date.none.fl_str_mv') || getCellValue('publishDate');
    if (pubDate) {
        const ym = pubDate.match(/(\d{4})/);
        if (ym) result.year = parseInt(ym[1]);
    }

    const source = getCellValue('dc.source.none.fl_str_mv');
    if (source) {
        const firstLine = source.split('\n')[0]?.trim();
        if (firstLine && firstLine.length > 3) result.sourceJournal = firstLine;
    }

    // Novedad: Extraer URL directa al Bitstream
    const foundUrlsRaw = html.match(/(https?:\/\/[^\s<"'&]+(?:bitstream|download|\.pdf)[^\s<"']*)/gi);
    if (foundUrlsRaw && foundUrlsRaw.length > 0) {
        // Unique URLs to avoid duplicate HEAD requests
        const uniqueUrls = Array.from(new Set(foundUrlsRaw));
        
        // Exclude obvious non-document files
        const candidateUrls = uniqueUrls.filter(u => {
            const lowerU = u.toLowerCase();
            return !lowerU.match(/\.(jpg|jpeg|png|gif|svg|xml|docx|doc|ppt|pptx|xls|xlsx)$/) &&
                   !lowerU.includes('thumbnail') &&
                   !lowerU.includes('preview');
        });

        const pdfLinks = candidateUrls.filter(u => u.toLowerCase().endsWith('.pdf'));
        const txtLinks = candidateUrls.filter(u => u.toLowerCase().endsWith('.txt'));

        if (pdfLinks.length > 0) {
            result.pdfUrl = pdfLinks[0];
        } else if (txtLinks.length > 0) {
            result.pdfUrl = txtLinks[0];
        } else if (candidateUrls.length > 0) {
            // No explicit .pdf/.txt extension (e.g., standard DSpace /download links).
            // We must verify via HEAD request to avoid passing images to the AI.
            let verifiedPdfUrl = null;
            let verifiedTxtUrl = null;
            
            // Try up to 10 candidates sequentially to avoid missing PDFs hidden behind many images
            // Example: La Molina repository puts the PDF at the end of many image bitstreams.
            for (const candidate of candidateUrls.slice(0, 10)) {
                try {
                    // Use GET instead of HEAD. Some repositories (like La Molina) return text/html for HEAD.
                    // We only read headers, so the body isn't downloaded until res.blob() or res.text() is called.
                    const checkRes = await fetchWithTimeout(candidate, { 
                        method: 'GET', 
                        headers: { 'Accept': '*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
                    }, 5000);
                    const contentType = checkRes.headers.get('content-type') || '';
                    
                    // We can immediately abort or just let it GC since we don't await the body
                    if (contentType.includes('application/pdf')) {
                        verifiedPdfUrl = candidate;
                        break;
                    } else if (contentType.includes('text/plain') && !verifiedTxtUrl) {
                        verifiedTxtUrl = candidate;
                    }
                } catch (e) {
                    console.log(`[ALICIA-DME] GET check failed for ${candidate}`);
                }
            }
            
            if (verifiedPdfUrl) {
                result.pdfUrl = verifiedPdfUrl;
            } else if (verifiedTxtUrl) {
                result.pdfUrl = verifiedTxtUrl;
            } else {
                console.log(`[ALICIA-DME] Warning: Could not verify any candidate as PDF/TXT. Avoid returning image to AI.`);
            }
        }
    }

    return result;
}

export async function fetchAliciaFullMetadata(recordId: string): Promise<AliciaDetailsMetadata | null> {
    const url = `https://alicia.concytec.gob.pe/vufind/Record/${encodeURIComponent(recordId)}/Details`;
    try {
        const res = await fetchWithTimeout(url, {
            headers: {
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, 10000);
        if (!res.ok) return null;
        const text = await res.text();

        if (text.includes('bot detection') || text.includes('id="anubis_challenge"')) return null;

        const details = await parseAliciaDetailsTable(text);

        if (!details.abstract) {
            const descUrl = `https://alicia.concytec.gob.pe/vufind/Record/${encodeURIComponent(recordId)}/Description`;
            try {
                const descRes = await fetchWithTimeout(descUrl, {
                    headers: {
                        'Accept': 'text/html',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }, 8000);
                if (descRes.ok) {
                    const descHtml = await descRes.text();
                    const match = descHtml.match(/Descripci[o\u00f3]n\s+del\s+Art[i\u00ed]culo\s*([\s\S]*?)(?:<\/div>|<h[2-5]|Texto\s+completo|<\/section|Descripci[o\u00f3]n\s+completa)/i);
                    if (match) {
                        const raw = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        if (raw.length > 50) details.abstract = raw;
                    }
                }
            } catch { /* ignore */ }
        }

        const hasUsefulData = details.abstract || details.university || details.authors.length > 0;
        if (!hasUsefulData) return null;

        console.log(`[ALICIA-DETAILS] Success for ${recordId}: abstract=${details.abstract?.length || 0}ch, univ=${details.university?.substring(0, 30)}, authors=${details.authors.length}`);
        return details;
    } catch (e) {
        return null;
    }
}

// =============================================================================
// ALICIA (Peru - CONCYTEC)
// =============================================================================

export async function searchAlicia(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    let resultsWasFallback = false;
    let records: any[] = [];
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        // IMPROVEMENT: Simplify query to max 6 keywords + use boolean structure
        const shortQuery = simplifyQuery(sanitizedQuery, 6);
        let cleanQuery = shortQuery
            .replace(/\b(investiga|investigación|estudio|busca|encuentra|analiza|revisión|acerca|sobre|el|la|los|las|un|una|de|del|y|o|con|para)\b/gi, '')
            .replace(/["()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Use boolean structure for better precision
        const booleanQuery = constructBooleanQuery(cleanQuery);
        const effectiveQuery = booleanQuery.length > 3 ? booleanQuery : cleanQuery;

        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.ALICIA);
        let url = `https://alicia.concytec.gob.pe/vufind/api/v1/search?lookfor=${encodeURIComponent(effectiveQuery)}&type=AllFields&limit=${limit}`;

        if (options?.yearStart && options?.yearEnd) {
            url += `&filter[]=publishDate:[${options.yearStart} TO ${options.yearEnd}]`;
        }

        console.log(`[ALICIA] Searching: "${effectiveQuery.substring(0, 60)}..."`);

        const res = await fetchWithTimeout(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LaTeX-Editor-Academic-Search/1.0'
            }
        }, SEARCH_LIMITS.TIMEOUT_LONG);

        if (!res.ok) return { results: [] };

        const text = await res.text();
        let data;
        try {
            // DME ROBUST PARSING: ALICIA sometimes prepends session errors ("Cannot write session to /tmp...")
            // We search for the first '{' to ignore any prepended text.
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const cleanedJson = text.substring(jsonStart, jsonEnd + 1);
                data = JSON.parse(cleanedJson);
            } else {
                data = JSON.parse(text);
            }
        } catch (e) {
            console.warn(`[ALICIA] JSON Parse Error. Response starts with: "${text.substring(0, 50)}"`);
            return { results: [] };
        }

        let records = data.records || [];

        // FALLBACK 1: Try simplified query without boolean operators
        if (records.length === 0 && effectiveQuery !== cleanQuery) {
            console.log(`[ALICIA] Fallback 1: Trying simplified query...`);
            const fallbackUrl = `https://alicia.concytec.gob.pe/vufind/api/v1/search?lookfor=${encodeURIComponent(simplifyQuery(cleanQuery, 4))}&type=AllFields&limit=${limit}`;
            try {
                const fallbackRes = await fetchWithTimeout(fallbackUrl, { headers: { 'Accept': 'application/json' } }, 25000);
                if (fallbackRes.ok) {
                    const fallbackText = await fallbackRes.text();
                    const fStart = fallbackText.indexOf('{');
                    if (fStart !== -1) {
                        const fallbackData = JSON.parse(fallbackText.substring(fStart, fallbackText.lastIndexOf('}') + 1));
                        if (fallbackData.records?.length > 0) {
                            records = fallbackData.records;
                            resultsWasFallback = true;
                        }
                    }
                }
            } catch { /* ignore fallback failures */ }
        }

        // FALLBACK 2: Try with just 2 core keywords
        if (records.length === 0) {
            console.log(`[ALICIA] Fallback 2: Trying minimal query...`);
            const minimalQuery = simplifyQuery(cleanQuery, 2);
            if (minimalQuery.length > 3) {
                const minimalUrl = `https://alicia.concytec.gob.pe/vufind/api/v1/search?lookfor=${encodeURIComponent(minimalQuery)}&type=AllFields&limit=${limit}`;
                try {
                    const minRes = await fetchWithTimeout(minimalUrl, { headers: { 'Accept': 'application/json' } }, 20000);
                    if (minRes.ok) {
                        const minText = await minRes.text();
                        const mStart = minText.indexOf('{');
                        if (mStart !== -1) {
                            const minData = JSON.parse(minText.substring(mStart, minText.lastIndexOf('}') + 1));
                            if (minData.records?.length > 0) {
                                records = minData.records;
                                resultsWasFallback = true;
                            }
                        }
                    }
                } catch { /* ignore minimal fallback failures */ }
            }
        }

        console.log(`[ALICIA] Found=${records.length} | Query="${effectiveQuery.substring(0, 50)}..."`);

        const mappedResults = records.map((record: any) => {
            let authors: string[] = [];
            if (record.authors?.primary && typeof record.authors.primary === 'object') {
                authors = Object.keys(record.authors.primary);
            }
            if (authors.length === 0 && Array.isArray(record.dcContributorAuthor) && record.dcContributorAuthor.length > 0) {
                authors = record.dcContributorAuthor;
            }
            if (authors.length === 0 && Array.isArray(record.authors)) {
                authors = record.authors.map((a: any) => typeof a === 'string' ? a : a?.name || String(a));
            }

            let pdfUrl: string | null = null;
            let enrichmentUrl: string | null = null;
            if (Array.isArray(record.urls)) {
                const pdfEntry = record.urls.find((u: any) => (typeof u === 'string' ? u : u?.url)?.toLowerCase().endsWith('.pdf'));
                if (pdfEntry) pdfUrl = typeof pdfEntry === 'string' ? pdfEntry : pdfEntry.url;

                const handleEntry = record.urls.find((u: any) => (typeof u === 'string' ? u : u?.url)?.includes('handle'));
                if (handleEntry) enrichmentUrl = typeof handleEntry === 'string' ? handleEntry : handleEntry.url;

                if (!pdfUrl) pdfUrl = enrichmentUrl;

                if (!pdfUrl && record.urls[0]) {
                    const first = record.urls[0];
                    pdfUrl = typeof first === 'string' ? first : first.url;
                }
            }

            if (!enrichmentUrl) enrichmentUrl = pdfUrl;

            let year = null;
            const dateFields = [record.dcDateIssued, record.publicationDates];
            for (const dateField of dateFields) {
                if (Array.isArray(dateField) && dateField[0]) {
                    const match = String(dateField[0]).match(/\d{4}/);
                    if (match) { year = parseInt(match[0]); break; }
                }
            }

            let university = record.institutions?.[0] || '';
            if (!university || university === 'Universidad Peruana' || university === 'Universidad') {
                if (Array.isArray(record.dcPublisher) && record.dcPublisher[0]) {
                    university = record.dcPublisher[0];
                } else if (Array.isArray(record.thesisDegreeGrantor) && record.thesisDegreeGrantor[0]) {
                    university = record.thesisDegreeGrantor[0];
                }
            }
            if (!university) university = 'Universidad Peruana';
            university = resolveUniversity(record.id, pdfUrl || '', university);

            let doi: string | null = null;
            if (Array.isArray(record.dcIdentifierDoi) && record.dcIdentifierDoi[0]) {
                doi = record.dcIdentifierDoi[0].replace(/^https?:\/\/doi\.org\//i, '');
            }

            const abstract = record.summary?.[0] || (Array.isArray(record.dcDescriptionAbstract) && record.dcDescriptionAbstract[0]) || null;

            return {
                id: record.id || generateRecordId(pdfUrl || '', record.title || ''),
                title: record.title || 'Sin t\u00edtulo',
                authors: authors.length > 0 ? authors : ['Autor Desconocido'],
                year,
                abstract,
                pdfUrl,
                handleUrl: record.id ? `https://alicia.concytec.gob.pe/vufind/Record/${record.id}` : pdfUrl,
                source: 'ALICIA (CONCYTEC)',
                type: record.formats?.[0] || 'Tesis',
                university,
                citationCount: null,
                doi,
                metadata: { enrichmentUrl }
            };
        });

        const isTruncated = (t: string | null) => !!t && (/\.{3}\s*Descripci[o\u00f3]n\s+completa\s*$/i.test(t) || /\.{3}\s*$/.test(t) || /\u2026\s*$/.test(t) || /colo\.\.\.\s*$/i.test(t));
        const needsEnhancement = (r: SearchResult) =>
            !r.abstract || r.abstract.length < 80 || isTruncated(r.abstract) ||
            r.university === 'Universidad Peruana' || r.authors[0] === 'Autor Desconocido' || !r.pdfUrl;

        const resultsToEnhance = mappedResults.filter((r: SearchResult) => needsEnhancement(r));
        if (resultsToEnhance.length > 0) {
            console.log(`[ALICIA] DME: Enhancing ${resultsToEnhance.length}/${mappedResults.length} records via Details page...`);

            let enhancedCount = 0;
            const totalToEnhance = Math.min(resultsToEnhance.length, 30);

            await Promise.all(resultsToEnhance.slice(0, 30).map(async (res: SearchResult) => {
                if (!res.id) return;

                try {
                    const details = await fetchAliciaFullMetadata(res.id);
                    if (details) {
                        if (details.abstract && details.abstract.length > (res.abstract?.length || 0)) {
                            res.abstract = details.abstract;
                        }
                        if (details.university && (!res.university || res.university === 'Universidad Peruana' || res.university === 'Universidad' || res.university === 'Universidad Nacional')) {
                            res.university = details.university;
                        }
                        if (details.authors.length > 0 && res.authors[0] === 'Autor Desconocido') {
                            res.authors = details.authors;
                        }
                        if (details.doi && !res.doi) {
                            res.doi = details.doi;
                        }
                        if (details.year && !res.year) {
                            res.year = details.year;
                        }
                        if (details.title && (!res.title || res.title === 'Sin t\u00edtulo')) {
                            res.title = details.title;
                        }
                        // Novedad: Combinación híbrida del PDF
                        if (details.pdfUrl) {
                            if (!res.metadata) res.metadata = {};
                            // Si ya había un handle, lo preservamos como enrichmentUrl/handleUrl
                            if (res.pdfUrl && !res.metadata.enrichmentUrl) {
                                res.metadata.enrichmentUrl = res.pdfUrl;
                            }
                            // Sobrescribimos el pdfUrl principal con el enlace directo
                            res.pdfUrl = details.pdfUrl;
                            res.handleUrl = res.handleUrl || (res.metadata.enrichmentUrl as string);
                        }
                    }

                    if ((!res.abstract || isTruncated(res.abstract)) && res.metadata?.enrichmentUrl) {
                        const enhanced = await enhanceAbstractFromSource(res.metadata.enrichmentUrl as string);
                        if (enhanced && enhanced.length > (res.abstract?.length || 0)) {
                            res.abstract = enhanced;
                        }
                    }
                } catch (e) {
                    console.warn(`[ALICIA] DME individual error for ${res.id}:`, e);
                } finally {
                    enhancedCount++;
                    if (options?.onProgress) {
                        const percent = Math.round((enhancedCount / totalToEnhance) * 100);
                        options.onProgress({
                            message: `ALICIA: Mejorando metadatos ${enhancedCount}/${totalToEnhance} (${percent}%)...`
                        });
                    }
                }
            }));
        }

        const filteredResults = options?.university
            ? mappedResults.filter((result: SearchResult) => {
                const needle = options.university!.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const haystack = `${result.university || ''} ${result.title || ''} ${result.abstract || ''}`
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
                return haystack.includes(needle);
            })
            : mappedResults;

        return { results: filteredResults, metadata: { isFallback: resultsWasFallback } };
    } catch (e: any) {
        console.warn(`[ALICIA] Master Exception: ${e.message}`);
        return { results: [], metadata: { isFallback: false } };
    }
}

/**
 * RENATI (Peru - SUNEDU) - Uses ALICIA with independent fallback
 * CRITICAL: This is the primary source for national thesis antecedents
 */
export async function searchRenati(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        if (options?.onProgress) options.onProgress({ message: 'Consultando RENATI (SUNEDU)...' });
        console.log(`[RENATI] Searching: "${query.substring(0, 50)}..."`);
        // First attempt: Use ALICIA with original query
        let { results, metadata: aliciaMetadata } = await searchAlicia(query, { ...options, limit: options?.limit || SEARCH_LIMITS.RENATI });
        let isFallback = aliciaMetadata?.isFallback || false;

        // FALLBACK: If no results, try with simplified query directly
        if (results.length === 0) {
            console.log(`[RENATI] No results from ALICIA, trying direct simplified search...`);
            const simplifiedQuery = simplifyQuery(sanitizeQueryForSearch(query), 3);
            if (simplifiedQuery.length > 5) {
                const retry = await searchAlicia(simplifiedQuery, { ...options, limit: options?.limit || SEARCH_LIMITS.RENATI });
                results = retry.results;
                if (results.length > 0) isFallback = true;
            }
        }

        // FALLBACK 2: Try with just the first 2 meaningful words
        if (results.length === 0) {
            console.log(`[RENATI] Fallback 2: Trying minimal 2-word query...`);
            const minimalQuery = simplifyQuery(sanitizeQueryForSearch(query), 2);
            if (minimalQuery.length > 4) {
                const retry = await searchAlicia(minimalQuery, { ...options, limit: options?.limit || SEARCH_LIMITS.RENATI });
                results = retry.results;
            }
        }

        console.log(`[RENATI] Final results: ${results.length} documents`);
        return {
            results: results.map(r => ({ ...r, source: 'RENATI (SUNEDU)', type: r.type || 'Tesis' })),
            metadata: { isFallback }
        };
    } catch (e: any) {
        console.error(`[RENATI] Exception: ${e.message}, attempting Fallback...`);
        const fallbackRes = await executeFallback(query, options, 'Renati');
        if (fallbackRes) return fallbackRes;
        return { results: [] };
    }
}

// =============================================================================
// LA REFERENCIA (LatAm Aggregator)
// =============================================================================

export async function searchLaReferencia(query: string, options?: SearchOptions & { countryFilter?: string }): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = normalizeAccents(query).replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.LA_REFERENCIA);
        const countryFilter = options?.countryFilter || options?.countryCode;
        const countryLabel = countryFilter ? ` [${countryFilter}]` : '';
        if (options?.onProgress) options.onProgress({ message: `Consultando LA REFERENCIA${countryLabel}...` });
        console.log(`[LA REFERENCIA${countryLabel}] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const fields = ['id', 'title', 'authors', 'publicationDates', 'summary', 'urls', 'formats', 'institutions', 'country', 'doi']
            .map(f => `&field[]=${f}`).join('');

        let url = `https://www.lareferencia.info/vufind/api/v1/search?lookfor=${encodeURIComponent(cleanQuery)}&type=AllFields&limit=${limit}&format=json${fields}`;

        if (options?.yearStart && options?.yearEnd) {
            url += `&filter[]=publishDate:[${options.yearStart} TO ${options.yearEnd}]`;
        }

        if (countryFilter) {
            url += `&filter[]=network_acronym_str:${encodeURIComponent(countryFilter)}`;
        }

        const res = await fetchWithTimeout(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.lareferencia.info/'
            }
        }, SEARCH_LIMITS.TIMEOUT_LONG);

        let records: VuFindRecord[] = [];

        if (!res.ok) {
            console.warn(`[LA REFERENCIA${countryLabel}] Status ${res.status}, using Fallback Strategy`);
            const fallbackRes = await executeFallback(query, options, 'La Referencia');
            if (fallbackRes) return fallbackRes;

            const defaultFallback = await centralizedOpenAlexFallback(query, options, 'La Referencia');
            return { ...defaultFallback, metadata: { ...defaultFallback.metadata, isFallback: true } };
        }

        const data = await safeJson(res, 'LA REFERENCIA');
        records = data.records || [];

        return {
            results: records.map((record: any) => {
                let authors: string[] = [];
                if (record.authors?.primary) authors = Object.keys(record.authors.primary);
                else if (Array.isArray(record.authors)) authors = record.authors.map((a: any) => typeof a === 'string' ? a : a?.name);
                if (authors.length === 0) authors = ['Autor Desconocido'];

                let pdfUrl: string | null = null;
                if (Array.isArray(record.urls) && record.urls[0]) {
                    const first = record.urls[0];
                    pdfUrl = typeof first === 'string' ? first : first.url;
                }

                let year = null;
                if (record.publicationDates?.[0]) {
                    const match = String(record.publicationDates[0]).match(/\d{4}/);
                    if (match) year = parseInt(match[0]);
                }

                return {
                    id: record.id || generateRecordId(pdfUrl || '', record.title || ''),
                    title: record.title || 'Sin título',
                    authors,
                    year,
                    abstract: record.summary?.[0] || null,
                    pdfUrl,
                    source: 'La Referencia',
                    type: record.formats?.[0] || 'Tesis',
                    university: record.institutions?.[0] || record.country || 'Latinoamérica',
                    citationCount: null,
                    doi: record.doi || null
                };
            }),
            metadata: { isFallback: false }
        };
    } catch (e: any) {
        console.warn(`[LA REFERENCIA] Exception: ${e.message}. Using fallback.`);
        const fallbackRes = await executeFallback(query, options, 'La Referencia');
        if (fallbackRes) return fallbackRes;

        const defaultFallback = await centralizedOpenAlexFallback(query, options);
        return {
            ...defaultFallback,
            metadata: { ...defaultFallback.metadata, isFallback: true }
        };
    }
}

// =============================================================================
// NATIONAL REPOSITORIES
// =============================================================================

/**
 * MEXICO: CONAHCyT
 */
export async function searchConacyt(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const cleanQuery = sanitizedQuery.replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.CONACYT);
        if (options?.onProgress) options.onProgress({ message: 'Consultando CONAHCyT (M\u00e9xico)...' });
        console.log(`[CONACYT] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://repositorio.conacyt.mx/rest/items/find-by-metadata-field?query=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);

        if (!res.ok) {
            const { results: laRefResults, metadata } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' México', { ...options, countryCode: 'MX' });
            return {
                results: laRefResults.map((r: any) => ({
                    ...r,
                    // If fallback, keep original source (e.g. OpenAlex). If not, map to Conacyt.
                    source: metadata?.isFallback ? r.source : 'CONAHCyT (México)'
                })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        const data = await safeJson(res, 'CONAHCyT');
        const records = Array.isArray(data) ? data : (data.items || []);

        console.log(`[CONACYT] Found=${records.length} | Query="${cleanQuery.substring(0, 50)}..."`);

        return {
            results: records.map((record: any) => ({
                id: record.uuid || generateRecordId('', record.name || ''),
                title: record.name || record.title || 'Sin título',
                authors: record.metadata?.find((m: any) => m.key === 'dc.contributor.author')?.value
                    ? [record.metadata.find((m: any) => m.key === 'dc.contributor.author').value]
                    : ['Autor Desconocido'],
                year: record.metadata?.find((m: any) => m.key === 'dc.date.issued')?.value
                    ? parseInt(record.metadata.find((m: any) => m.key === 'dc.date.issued').value.substring(0, 4))
                    : null,
                abstract: record.metadata?.find((m: any) => m.key === 'dc.description.abstract')?.value || '',
                pdfUrl: record.link || null,
                handleUrl: record.link || undefined,
                source: 'CONAHCyT (México)',
                type: 'Tesis',
                university: record.metadata?.find((m: any) => m.key === 'dc.publisher')?.value || 'México',
                citationCount: null,
                doi: null
            }))
        };
    } catch (e: any) {
        const { results: laRefResults, metadata } = await searchLaReferencia(query + ' México', { ...options, countryCode: 'MX' });
        return {
            results: laRefResults.map((r: any) => ({
                ...r,
                source: metadata?.isFallback ? r.source : 'CONAHCyT (México)'
            })),
            metadata: { ...metadata, isFallback: true }
        };
    }
}

/**
 * MEXICO: UNAM
 */
export async function searchUnam(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const cleanQuery = sanitizedQuery.replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.UNAM);
        if (options?.onProgress) options.onProgress({ message: 'Consultando UNAM (M\u00e9xico)...' });
        console.log(`[UNAM] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://repositorio.unam.mx/oaipmh-rest/search?query=${encodeURIComponent(cleanQuery)}&rows=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);

        if (!res.ok) {
            const { results: laRefResults, metadata } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' UNAM', { ...options, countryCode: 'MX' });
            return {
                results: laRefResults.map((r: any) => ({
                    ...r,
                    source: metadata?.isFallback ? r.source : 'UNAM (México)',

                })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        const data = await safeJson(res, 'UNAM');
        const records = data.response?.docs || data.records || [];

        console.log(`[UNAM] Found=${records.length} | Query="${cleanQuery.substring(0, 50)}..."`);

        return {
            results: records.map((record: any) => ({
                id: record.id || generateRecordId('', record.title || ''),
                title: record.title || 'Sin título',
                authors: record.author ? [record.author] : ['Autor Desconocido'],
                year: record.date ? parseInt(String(record.date).substring(0, 4)) : null,
                abstract: record.description || '',
                pdfUrl: record.url || null,
                handleUrl: record.url || undefined,
                source: 'UNAM (México)',
                type: 'Tesis',
                university: 'Universidad Nacional Autónoma de México',
                citationCount: null,
                doi: null
            }))
        };
    } catch {
        const { results: laRefResults, metadata } = await searchLaReferencia(query + ' UNAM', { ...options, countryCode: 'MX' });
        return {
            results: laRefResults.map((r: any) => ({
                ...r,
                source: metadata?.isFallback ? r.source : 'UNAM (México)',

            })),
            metadata: { ...metadata, isFallback: true }
        };
    }
}

/**
 * CHILE: ANID
 */
export async function searchAnid(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.ANID);
        if (options?.onProgress) options.onProgress({ message: 'Consultando ANID (Chile)...' });
        console.log(`[ANID] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://repositorio.anid.cl/rest/items/find-by-metadata-field?query=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);

        if (!res.ok) {
            const { results: laRefResults, metadata } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' Chile', options);
            return {
                results: laRefResults.map((r: any) => ({
                    ...r,
                    source: metadata?.isFallback ? r.source : 'ANID (Chile)'
                })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        const data = await safeJson(res, 'ANID');
        const records = Array.isArray(data) ? data : (data.items || []);

        console.log(`[ANID] Found=${records.length} | Query="${cleanQuery.substring(0, 50)}..."`);

        return {
            results: records.map((record: any) => ({
                id: record.uuid || generateRecordId('', record.name || ''),
                title: record.name || 'Sin título',
                authors: record.metadata?.find((m: any) => m.key === 'dc.contributor.author')?.value
                    ? [record.metadata.find((m: any) => m.key === 'dc.contributor.author').value]
                    : ['Autor Desconocido'],
                year: record.metadata?.find((m: any) => m.key === 'dc.date.issued')?.value
                    ? parseInt(record.metadata.find((m: any) => m.key === 'dc.date.issued').value.substring(0, 4))
                    : null,
                abstract: record.metadata?.find((m: any) => m.key === 'dc.description.abstract')?.value || '',
                pdfUrl: record.link || null,
                handleUrl: record.link || undefined,
                source: 'ANID (Chile)',
                type: 'Tesis',
                university: record.metadata?.find((m: any) => m.key === 'dc.publisher')?.value || 'Chile',
                citationCount: null,
                doi: null
            }))
        };
    } catch {
        const { results: laRefResults, metadata } = await searchLaReferencia(query + ' Chile', { ...options, countryCode: 'CL' });
        return {
            results: laRefResults.map((r: any) => ({
                ...r,
                source: metadata?.isFallback ? r.source : 'ANID (Chile)'
            })),
            metadata: { isFallback: metadata?.isFallback || true }
        };
    }
}

/**
 * BRAZIL: Oasisbr
 * IMPORTANT: Brazilian repository - searches in Portuguese too!
 */
export async function searchOasisbr(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        // Clean and simplify query for better compatibility
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const shortQuery = simplifyQuery(sanitizedQuery, 5);
        const cleanQuery = shortQuery.replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.OASISBR);

        if (options?.onProgress) options.onProgress({ message: 'Consultando Oasisbr (Brasil)...' });
        console.log(`[OASISBR] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://oasisbr.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(cleanQuery)}&type=AllFields&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);

        let records: any[] = [];

        if (res.ok) {
            const data = await safeJson(res, 'OASISBR');
            records = data.records || [];
        }

        // PORTUGUESE FALLBACK: Generate Portuguese query and search again
        if (records.length < 5) {
            console.log(`[OASISBR] Trying Portuguese query fallback...`);
            const portugueseQuery = convertToPortuguese(cleanQuery);
            if (portugueseQuery !== cleanQuery) {
                const ptUrl = `https://oasisbr.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(portugueseQuery)}&type=AllFields&limit=${limit}`;
                try {
                    const ptRes = await fetchWithTimeout(ptUrl, { headers: { 'Accept': 'application/json' } }, 25000);
                    if (ptRes.ok) {
                        const ptData = await safeJson(ptRes, 'OASISBR-PT');
                        const ptRecords = ptData.records || [];
                        // Merge results, avoiding duplicates by ID
                        const existingIds = new Set(records.map((r: any) => r.id));
                        for (const rec of ptRecords) {
                            if (!existingIds.has(rec.id)) {
                                records.push(rec);
                                existingIds.add(rec.id);
                            }
                        }
                        console.log(`[OASISBR] Portuguese search added ${ptRecords.length} results`);
                    }
                } catch { /* ignore PT fallback failures */ }
            }
        }

        // LA REFERENCIA FALLBACK: If still no results
        if (records.length === 0) {
            console.log(`[OASISBR] No results, falling back to La Referencia...`);
            const { results: laRefResults, metadata } = await searchLaReferencia(cleanQuery + ' Brasil', options);
            return {
                results: laRefResults.map((r: any) => ({
                    ...r,
                    source: metadata?.isFallback ? r.source : 'Oasisbr (Brasil)'
                })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        console.log(`[OASISBR] Found=${records.length} | Query="${cleanQuery.substring(0, 50)}..."`);

        return {
            results: records.map((record: any) => {
                let authors: string[] = [];
                if (record.authors?.primary) authors = Object.keys(record.authors.primary);
                else if (Array.isArray(record.authors)) authors = record.authors.map((a: any) => typeof a === 'string' ? a : a?.name);
                if (authors.length === 0) authors = ['Autor Desconocido'];

                let pdfUrl: string | null = null;
                if (Array.isArray(record.urls) && record.urls[0]) {
                    const first = record.urls[0];
                    pdfUrl = typeof first === 'string' ? first : first.url;
                }

                return {
                    id: record.id || generateRecordId(pdfUrl || '', record.title || ''),
                    title: record.title || 'Sin título',
                    authors,
                    year: record.publicationDates?.[0] ? parseInt(record.publicationDates[0]) : null,
                    abstract: record.summary?.[0] || '',
                    pdfUrl,
                    handleUrl: record.id ? `https://oasisbr.ibict.br/vufind/Record/${record.id}` : (pdfUrl || undefined),
                    source: 'Oasisbr (Brasil)',
                    type: record.formats?.[0] || 'Tesis',
                    university: record.institutions?.[0] || 'Brasil',
                    citationCount: null,
                    doi: null
                };
            })
        };
    } catch (e: any) {
        console.warn(`[OASISBR] Exception: ${e.message}`);
        const { results: laRefResults, metadata } = await searchLaReferencia(query + ' Brasil', { ...options, countryCode: 'BR' });
        return {
            results: laRefResults.map((r: any) => ({ ...r, source: 'Oasisbr (Brasil)' })),
            metadata: { ...metadata, isFallback: true }
        };
    }
}

/**
 * Helper: Convert Spanish keywords to Portuguese equivalents
 */
function convertToPortuguese(spanishQuery: string): string {
    const translations: Record<string, string> = {
        // Common academic terms
        'investigación': 'pesquisa',
        'investigacion': 'pesquisa',
        'estudio': 'estudo',
        'análisis': 'análise',
        'analisis': 'analise',
        'desarrollo': 'desenvolvimento',
        'evaluación': 'avaliação',
        'evaluacion': 'avaliacao',
        'optimización': 'otimização',
        'optimizacion': 'otimizacao',
        'mejora': 'melhoria',
        'sistema': 'sistema',
        'proceso': 'processo',
        'producción': 'produção',
        'produccion': 'producao',
        'calidad': 'qualidade',
        'efecto': 'efeito',
        'impacto': 'impacto',
        'aplicación': 'aplicação',
        'aplicacion': 'aplicacao',
        'universidad': 'universidade',
        'tesis': 'tese',
        'maestría': 'mestrado',
        'maestria': 'mestrado',
        'doctorado': 'doutorado',
        // Agriculture/Environment
        'suelo': 'solo',
        'agua': 'água',
        'planta': 'planta',
        'cultivo': 'cultivo',
        'fertilizante': 'fertilizante',
        'rendimiento': 'rendimento',
        'crecimiento': 'crescimento',
        // Engineering
        'diseño': 'design',
        'construcción': 'construção',
        'construccion': 'construcao',
        'material': 'material',
        'estructura': 'estrutura',
        // Health
        'salud': 'saúde',
        'enfermedad': 'doença',
        'tratamiento': 'tratamento',
        'paciente': 'paciente'
    };

    let portuguese = spanishQuery.toLowerCase();
    for (const [es, pt] of Object.entries(translations)) {
        portuguese = portuguese.replace(new RegExp(`\\b${es}\\b`, 'gi'), pt);
    }
    return portuguese;
}

/**
 * ARGENTINA: SNRD
 */
export async function searchSnrd(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.SNRD);
        if (options?.onProgress) options.onProgress({ message: 'Consultando SNRD (Argentina)...' });
        console.log(`[SNRD] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://bdu.siu.edu.ar/api/v1/search?q=${encodeURIComponent(cleanQuery)}&rows=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);

        if (!res.ok) {
            const { results: laRefResults, metadata } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' Argentina', options);
            return {
                results: laRefResults.map((r: any) => ({
                    ...r,
                    source: metadata?.isFallback ? r.source : 'SNRD (Argentina)'
                })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        const data = await safeJson(res, 'SNRD');
        const records = data.response?.docs || data.records || [];

        console.log(`[SNRD] Found=${records.length} | Query="${cleanQuery.substring(0, 50)}..."`);

        return {
            results: records.map((record: any) => ({
                id: record.id || generateRecordId('', record.title || ''),
                title: record.title || 'Sin título',
                authors: record.author ? [record.author] : ['Autor Desconocido'],
                year: record.date ? parseInt(String(record.date).substring(0, 4)) : null,
                abstract: record.description || '',
                pdfUrl: record.url || null,
                handleUrl: record.url || undefined,
                source: 'SNRD (Argentina)',
                type: 'Tesis',
                university: record.institution || 'Argentina',
                citationCount: null,
                doi: null
            }))
        };
    } catch {
        const { results: laRefResults, metadata } = await searchLaReferencia(query + ' Argentina', { ...options, countryCode: 'AR' });
        return {
            results: laRefResults.map((r: any) => ({
                ...r,
                source: metadata?.isFallback ? r.source : 'SNRD (Argentina)'
            })),
            metadata: { ...metadata, isFallback: true }
        };
    }
}

/**
 * COLOMBIA: MinCiencias
 */
export async function searchMinciencias(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.MINCIENCIAS);
        if (options?.onProgress) options.onProgress({ message: 'Consultando MinCiencias (Colombia)...' });
        console.log(`[MINCIENCIAS] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://repositorionacional.gov.co/rest/items/find-by-metadata-field?query=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
        const res = await fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);

        if (!res.ok) {
            const { results: laRefResults, metadata } = await searchLaReferencia(simplifyQuery(cleanQuery) + ' Colombia', options);
            return {
                results: laRefResults.map((r: any) => ({
                    ...r,
                    source: metadata?.isFallback ? r.source : 'MinCiencias (Colombia)'
                })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        const data = await safeJson(res, 'MINCIENCIAS');
        const records = Array.isArray(data) ? data : (data.items || []);

        console.log(`[MINCIENCIAS] Found=${records.length} | Query="${cleanQuery.substring(0, 50)}..."`);

        return {
            results: records.map((record: any) => ({
                id: record.uuid || generateRecordId('', record.name || ''),
                title: record.name || 'Sin título',
                authors: record.metadata?.find((m: any) => m.key === 'dc.contributor.author')?.value
                    ? [record.metadata.find((m: any) => m.key === 'dc.contributor.author').value]
                    : ['Autor Desconocido'],
                year: record.metadata?.find((m: any) => m.key === 'dc.date.issued')?.value
                    ? parseInt(record.metadata.find((m: any) => m.key === 'dc.date.issued').value.substring(0, 4))
                    : null,
                abstract: record.metadata?.find((m: any) => m.key === 'dc.description.abstract')?.value || '',
                pdfUrl: record.link || null,
                handleUrl: record.link || undefined,
                source: 'MinCiencias (Colombia)',
                type: 'Tesis',
                university: record.metadata?.find((m: any) => m.key === 'dc.publisher')?.value || 'Colombia',
                citationCount: null,
                doi: null
            }))
        };
    } catch {
        const { results: laRefResults, metadata } = await searchLaReferencia(query + ' Colombia', { ...options, countryCode: 'CO' });
        return {
            results: laRefResults.map((r: any) => ({
                ...r,
                source: metadata?.isFallback ? r.source : 'MinCiencias (Colombia)'
            })),
            metadata: { ...metadata, isFallback: true }
        };
    }
}

// =============================================================================
// SHARED HELPERS FOR BATCH-FIRST LATAM EXPANSION
// =============================================================================

function mapVuFindRecords(records: any[], source: string, defaultUniversity: string): SearchResult[] {
    return records.map((record: any) => {
        let authors: string[] = [];
        if (record.authors?.primary) {
            authors = Object.keys(record.authors.primary);
        } else if (Array.isArray(record.authors)) {
            authors = record.authors
                .map((a: any) => typeof a === 'string' ? a : a?.name)
                .filter((a: string | undefined): a is string => Boolean(a));
        }
        if (authors.length === 0) authors = ['Autor Desconocido'];

        let pdfUrl: string | null = null;
        if (Array.isArray(record.urls) && record.urls[0]) {
            const first = record.urls[0];
            pdfUrl = typeof first === 'string' ? first : first.url;
        }

        let year: number | null = null;
        if (record.publicationDates?.[0]) {
            const match = String(record.publicationDates[0]).match(/\d{4}/);
            if (match) year = parseInt(match[0], 10);
        }

        return {
            id: record.id || generateRecordId(pdfUrl || '', record.title || ''),
            title: record.title || 'Sin titulo',
            authors,
            year,
            abstract: record.summary?.[0] || '',
            pdfUrl,
            source,
            type: record.formats?.[0] || 'Tesis',
            university: record.institutions?.[0] || record.country || defaultUniversity,
            citationCount: null,
            doi: record.doi || null
        };
    });
}

function createLaReferenciaCountrySearch(
    countryCode: string,
    sourceName: string,
    logPrefix: string
): (query: string, options?: SearchOptions) => Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    return async (query: string, options?: SearchOptions) => {
        try {
            const cleanQuery = sanitizeQueryForSearch(query).replace(/["()]/g, ' ').trim();
            const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.LA_REFERENCIA);
            if (options?.onProgress) options.onProgress({ message: `Consultando ${sourceName}...` });
            console.log(`${logPrefix} Searching via La Referencia [${countryCode}]: "${cleanQuery.substring(0, 50)}..."`);

            const firstAttempt = await searchLaReferencia(cleanQuery, { ...options, limit, countryFilter: countryCode });
            if (firstAttempt.results.length > 0) {
                return {
                    results: firstAttempt.results.map(r => ({ ...r, source: sourceName })),
                    metadata: { isFallback: false }
                };
            }

            const simplifiedQuery = simplifyQuery(cleanQuery, 3);
            if (simplifiedQuery.length > 3 && simplifiedQuery !== cleanQuery) {
                const retry = await searchLaReferencia(simplifiedQuery, { ...options, limit, countryFilter: countryCode });
                if (retry.results.length > 0) {
                    return {
                        results: retry.results.map(r => ({ ...r, source: sourceName })),
                        metadata: { isFallback: true }
                    };
                }
            }

            const minimalQuery = simplifyQuery(cleanQuery, 2);
            if (minimalQuery.length > 3) {
                const minimal = await searchLaReferencia(minimalQuery, { ...options, limit, countryFilter: countryCode });
                if (minimal.results.length > 0) {
                    return {
                        results: minimal.results.map(r => ({ ...r, source: sourceName })),
                        metadata: { isFallback: true }
                    };
                }
            }

            return { results: [], metadata: { isFallback: false } };
        } catch (e: any) {
            console.warn(`${logPrefix} Exception: ${e.message}`);
            return { results: [], metadata: { isFallback: false } };
        }
    };
}

// =============================================================================
// BRAZIL: BDTD (Biblioteca Digital Brasileira de Teses e Dissertacoes)
// =============================================================================

export async function searchBdtd(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const shortQuery = simplifyQuery(sanitizedQuery, 5);
        const cleanQuery = shortQuery.replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.BDTD);

        if (options?.onProgress) options.onProgress({ message: 'Consultando BDTD (Brasil)...' });
        console.log(`[BDTD] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(cleanQuery)}&type=AllFields&limit=${limit}`;
        const res = await fetchWithTimeout(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LetXipu-Search-MCP/5.0'
            }
        }, SEARCH_LIMITS.TIMEOUT_LONG);

        let records: any[] = [];
        if (res.ok) {
            const data = await safeJson(res, 'BDTD');
            records = data.records || [];
        }

        if (records.length < 5) {
            const portugueseQuery = convertToPortuguese(cleanQuery);
            if (portugueseQuery !== cleanQuery) {
                try {
                    const ptUrl = `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(portugueseQuery)}&type=AllFields&limit=${limit}`;
                    const ptRes = await fetchWithTimeout(ptUrl, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_LONG);
                    if (ptRes.ok) {
                        const ptData = await safeJson(ptRes, 'BDTD-PT');
                        const ptRecords = ptData.records || [];
                        const existingIds = new Set(records.map((r: any) => r.id));
                        for (const rec of ptRecords) {
                            if (!existingIds.has(rec.id)) {
                                records.push(rec);
                                existingIds.add(rec.id);
                            }
                        }
                    }
                } catch {
                    // Portuguese fallback is best-effort.
                }
            }
        }

        if (records.length === 0) {
            const { results: laRefResults, metadata } = await searchLaReferencia(cleanQuery, { ...options, countryFilter: 'BR' });
            return {
                results: laRefResults.map((r: any) => ({ ...r, source: 'BDTD (Brasil)' })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        return {
            results: mapVuFindRecords(records, 'BDTD (Brasil)', 'Brasil'),
            metadata: { isFallback: false }
        };
    } catch (e: any) {
        console.warn(`[BDTD] Exception: ${e.message}`);
        const { results: laRefResults, metadata } = await searchLaReferencia(query, { ...options, countryFilter: 'BR' });
        return {
            results: laRefResults.map((r: any) => ({ ...r, source: 'BDTD (Brasil)' })),
            metadata: { ...metadata, isFallback: true }
        };
    }
}

// =============================================================================
// ECUADOR: RRAAE (Red de Repositorios de Acceso Abierto del Ecuador)
// =============================================================================

export async function searchRraae(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        const cleanQuery = sanitizeQueryForSearch(query).replace(/["()]/g, ' ').trim();
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.RRAAE);

        if (options?.onProgress) options.onProgress({ message: 'Consultando RRAAE (Ecuador)...' });
        console.log(`[RRAAE] Searching: "${cleanQuery.substring(0, 50)}..."`);

        const url = `https://rraae.cedia.edu.ec/vufind/api/v1/search?lookfor=${encodeURIComponent(cleanQuery)}&type=AllFields&limit=${limit}`;
        const res = await fetchWithTimeout(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LetXipu-Search-MCP/5.0'
            }
        }, SEARCH_LIMITS.TIMEOUT_LONG);

        if (!res.ok) {
            const { results: laRefResults, metadata } = await searchLaReferencia(cleanQuery, { ...options, countryFilter: 'EC' });
            return {
                results: laRefResults.map((r: any) => ({ ...r, source: 'RRAAE (Ecuador)' })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        const data = await safeJson(res, 'RRAAE');
        const records = data.records || [];

        if (records.length === 0) {
            const simplifiedQuery = simplifyQuery(cleanQuery, 3);
            if (simplifiedQuery.length > 3 && simplifiedQuery !== cleanQuery) {
                try {
                    const retryUrl = `https://rraae.cedia.edu.ec/vufind/api/v1/search?lookfor=${encodeURIComponent(simplifiedQuery)}&type=AllFields&limit=${limit}`;
                    const retryRes = await fetchWithTimeout(retryUrl, { headers: { 'Accept': 'application/json' } }, SEARCH_LIMITS.TIMEOUT_STANDARD);
                    if (retryRes.ok) {
                        const retryData = await safeJson(retryRes, 'RRAAE-retry');
                        if (retryData.records?.length > 0) {
                            return {
                                results: mapVuFindRecords(retryData.records, 'RRAAE (Ecuador)', 'Ecuador'),
                                metadata: { isFallback: true }
                            };
                        }
                    }
                } catch {
                    // Simplified retry is best-effort.
                }
            }

            const { results: laRefResults, metadata } = await searchLaReferencia(cleanQuery, { ...options, countryFilter: 'EC' });
            return {
                results: laRefResults.map((r: any) => ({ ...r, source: 'RRAAE (Ecuador)' })),
                metadata: { ...metadata, isFallback: true }
            };
        }

        return {
            results: mapVuFindRecords(records, 'RRAAE (Ecuador)', 'Ecuador'),
            metadata: { isFallback: false }
        };
    } catch (e: any) {
        console.warn(`[RRAAE] Exception: ${e.message}`);
        const { results: laRefResults, metadata } = await searchLaReferencia(query, { ...options, countryFilter: 'EC' });
        return {
            results: laRefResults.map((r: any) => ({ ...r, source: 'RRAAE (Ecuador)' })),
            metadata: { ...metadata, isFallback: true }
        };
    }
}

export const searchEspana = createLaReferenciaCountrySearch('ES', 'Recolecta (Espana)', '[ESPANA]');
export const searchCostaRica = createLaReferenciaCountrySearch('CR', 'KIMUK (Costa Rica)', '[COSTA_RICA]');
export const searchUruguay = createLaReferenciaCountrySearch('UY', 'Timbo (Uruguay)', '[URUGUAY]');
export const searchElSalvador = createLaReferenciaCountrySearch('SV', 'REDICCES (El Salvador)', '[EL_SALVADOR]');

// V5: Country-filtered La Referencia providers for country groups
export const searchLaReferenciaPeru = createLaReferenciaCountrySearch('PE', 'La Referencia (Perú)', '[LAREF_PE]');
export const searchLaReferenciaBrasil = createLaReferenciaCountrySearch('BR', 'La Referencia (Brasil)', '[LAREF_BR]');
export const searchLaReferenciaEcuador = createLaReferenciaCountrySearch('EC', 'La Referencia (Ecuador)', '[LAREF_EC]');
export const searchLaReferenciaMexico = createLaReferenciaCountrySearch('MX', 'La Referencia (México)', '[LAREF_MX]');
export const searchLaReferenciaArgentina = createLaReferenciaCountrySearch('AR', 'La Referencia (Argentina)', '[LAREF_AR]');
export const searchLaReferenciaColombia = createLaReferenciaCountrySearch('CO', 'La Referencia (Colombia)', '[LAREF_CO]');
export const searchLaReferenciaChile = createLaReferenciaCountrySearch('CL', 'La Referencia (Chile)', '[LAREF_CL]');
