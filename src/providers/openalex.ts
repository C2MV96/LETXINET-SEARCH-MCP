/**
 * OpenAlex Search Provider
 * Free academic metadata API
 */

import { fetchWithTimeout, safeJson, sanitizeQueryForSearch, SearchResult, SearchOptions, decodeInvertedIndex } from './base';
import { OpenAlexWork, OpenAlexResponse } from '../types/search';
import { SEARCH_LIMITS } from '../utils/search-limits';

export async function searchOpenAlex(query: string, options?: SearchOptions): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    try {
        let filterStr = 'has_abstract:true';
        if (options?.yearStart) filterStr += `,publication_year:>${parseInt(options.yearStart) - 1}`;
        if (options?.yearEnd) filterStr += `,publication_year:<${parseInt(options.yearEnd) + 1}`;
        if (options?.university) filterStr += `,authorships.institutions.display_name.search:${encodeURIComponent(options.university)}`;

        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.OPENALEX);
        const sanitizedQuery = sanitizeQueryForSearch(query);
        if (options?.onProgress) options.onProgress({ message: 'Consultando OPENALEX...' });
        console.log(`[OPENALEX] Searching: "${sanitizedQuery.substring(0, 50)}..."`);
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(sanitizedQuery)}&filter=${filterStr}&per-page=${limit}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) return { results: [] };

        const data = (await safeJson(res, 'OPENALEX')) as OpenAlexResponse;
        const results = (data.results || []).map((w: OpenAlexWork): SearchResult => ({
            id: w.id,
            title: w.title || 'Sin título',
            abstract: decodeInvertedIndex(w.abstract_inverted_index),
            pdfUrl: w.ids?.doi ? `https://doi.org/${w.ids.doi.replace(/^https?:\/\/doi\.org\//i, '')}` : (w.primary_location?.landing_page_url || null),
            year: w.publication_year || null,
            authors: w.authorships?.map(a => a.author.display_name) || [],
            source: 'OpenAlex',
            type: w.type || 'Work',
            university: w.authorships?.[0]?.institutions?.[0]?.display_name || undefined,
            citationCount: w.cited_by_count || null,
            doi: w.doi ? w.doi.replace('https://doi.org/', '') : null
        }));

        console.log(`[OPENALEX] Found=${results.length} | Query="${sanitizedQuery.substring(0, 50)}..."`);
        return { results };
    } catch {
        return { results: [] };
    }
}

/**
 * Robust fallback for regional sources when they are down.
 * Uses OpenAlex with country-specific filtering.
 */
export async function centralizedOpenAlexFallback(
    query: string,
    options?: SearchOptions,
    sourceLabel: string = 'La Referencia'
): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } }> {
    console.log(`[${sourceLabel}] Source appears down. Falling back to OpenAlex...`);
    try {
        const limit = Math.min(options?.limit || 25, SEARCH_LIMITS.FALLBACK_DEFAULT);
        const sanitizedQuery = sanitizeQueryForSearch(query);
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(sanitizedQuery)}&filter=has_abstract:true&per-page=${limit}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) return { results: [] };

        const data = (await safeJson(res, `OPENALEX (Fallback for ${sourceLabel})`)) as OpenAlexResponse;
        const results = (data.results || []).map((w: OpenAlexWork): SearchResult => ({
            id: w.id,
            title: w.title || 'Sin título',
            abstract: decodeInvertedIndex(w.abstract_inverted_index),
            pdfUrl: w.ids?.doi ? `https://doi.org/${w.ids.doi.replace(/^https?:\/\/doi\.org\//i, '')}` : null,
            year: w.publication_year || null,
            authors: w.authorships?.map(a => a.author.display_name) || [],
            source: `${sourceLabel} (via OpenAlex)`,
            type: w.type || 'Work',
            university: w.authorships?.[0]?.institutions?.[0]?.display_name || undefined,
            citationCount: w.cited_by_count || null,
            doi: w.doi ? w.doi.replace('https://doi.org/', '') : null
        }));

        return {
            results,
            metadata: { isFallback: true }
        };
    } catch {
        return { results: [] };
    }
}
