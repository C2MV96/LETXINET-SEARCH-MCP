/**
 * Fallback Manager
 */

import { SearchOptions, SearchResult } from '../types/search';
import { searchOpenAlex } from './openalex';

// Forward declaration to avoid circular dependency
let _searchSciELO: ((q: string, o?: SearchOptions) => Promise<{ results: SearchResult[] }>) | null = null;

export function registerSciELOFallback(fn: (q: string, o?: SearchOptions) => Promise<{ results: SearchResult[] }>) {
    _searchSciELO = fn;
}

export async function executeFallback(
    query: string, options: SearchOptions | undefined, sourceLabel: string, originalResultsCount: number = 0
): Promise<{ results: SearchResult[], metadata?: { isFallback: boolean } } | null> {
    if (originalResultsCount > 0) return null;
    const strategy = options?.fallbackStrategy;
    if (!strategy) return null;

    console.log(`[${sourceLabel}] Fallback: Primary=${strategy.primary}, Secondary=${strategy.secondary}`);

    // Level 1
    let primaryResults: SearchResult[] = [];
    try {
        if (strategy.primary === 'openalex') {
            primaryResults = (await searchOpenAlex(query, options)).results;
        } else if (strategy.primary === 'scielo' && _searchSciELO) {
            primaryResults = (await _searchSciELO(query, options)).results;
        }
    } catch (e) { console.warn(`[${sourceLabel}] Level 1 Fallback Failed:`, e); }

    if (primaryResults.length > 0) {
        return { results: primaryResults.map(r => ({ ...r, source: `${sourceLabel} (via ${strategy.primary})` })), metadata: { isFallback: true } };
    }

    // Level 2
    let secondaryResults: SearchResult[] = [];
    try {
        if (strategy.secondary === 'scielo' && strategy.primary !== 'scielo' && _searchSciELO) {
            secondaryResults = (await _searchSciELO(query, options)).results;
        } else if (strategy.secondary === 'openalex' && strategy.primary !== 'openalex') {
            secondaryResults = (await searchOpenAlex(query, options)).results;
        }
    } catch (e) { console.warn(`[${sourceLabel}] Level 2 Fallback Failed:`, e); }

    if (secondaryResults.length > 0) {
        return { results: secondaryResults.map(r => ({ ...r, source: `${sourceLabel} (via ${strategy.secondary})` })), metadata: { isFallback: true } };
    }

    console.log(`[${sourceLabel}] All fallback levels exhausted.`);
    return null;
}
