/**
 * PapersWithCode Provider
 * API: https://paperswithcode.com/api/v1/
 * No API key required.
 */

import { fetchWithTimeout, sanitizeQueryForSearch } from './base';
import { PaperResult, SearchOptions } from '../types/search';

const PWC_API_BASE = 'https://paperswithcode.com/api/v1';

interface PwcPaper {
    id?: string;
    title?: string;
    abstract?: string;
    url_abs?: string;
    url_pdf?: string;
    arxiv_id?: string;
    authors?: string[];
    published?: string;
    conference?: string;
    proceeding?: string;
}

interface PwcResponse {
    count?: number;
    next?: string;
    results?: PwcPaper[];
}

export async function searchPapersWithCode(
    query: string,
    options?: SearchOptions
): Promise<{ results: PaperResult[] }> {
    const cleanQuery = sanitizeQueryForSearch(query);
    const limit = options?.limit || 25;

    const params = new URLSearchParams({
        q: cleanQuery,
        page: '1',
        items_per_page: String(Math.min(limit, 50)),
    });

    try {
        console.log(`[PapersWithCode] Searching: "${cleanQuery.substring(0, 60)}..."`);
        const res = await fetchWithTimeout(
            `${PWC_API_BASE}/papers/?${params.toString()}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://paperswithcode.com/',
                }
            },
            20000
        );

        if (!res.ok) {
            console.error(`[PapersWithCode] HTTP ${res.status}`);
            return { results: [] };
        }

        const data = await res.json() as PwcResponse;
        const papers = data?.results || [];

        const results: PaperResult[] = papers.map((paper, idx) => {
            // Extract year from published date
            let year: number | null = null;
            if (paper.published) {
                const match = paper.published.match(/(\d{4})/);
                if (match) year = parseInt(match[1], 10);
            }

            // Year filtering
            if (options?.yearStart && year && year < parseInt(options.yearStart)) return null;
            if (options?.yearEnd && year && year > parseInt(options.yearEnd)) return null;

            const doi = paper.arxiv_id ? null : null; // PwC doesn't provide DOIs directly
            const pdfUrl = paper.url_pdf || null;
            const url = paper.url_abs || (paper.id ? `https://paperswithcode.com/paper/${paper.id}` : undefined);

            return {
                id: `pwc_${paper.id || idx}`,
                title: paper.title || 'Untitled',
                authors: paper.authors || [],
                year,
                abstract: paper.abstract || '',
                pdfUrl,
                source: 'paperswithcode',
                doi,
                citationCount: null,
                url,
                snippet: [
                    paper.conference ? `Conference: ${paper.conference}` : null,
                    paper.arxiv_id ? `arXiv: ${paper.arxiv_id}` : null,
                ].filter(Boolean).join(' | ') || undefined,
            } as PaperResult;
        }).filter(Boolean) as PaperResult[];

        console.log(`[PapersWithCode] Found ${results.length} results`);
        return { results };
    } catch (e: any) {
        console.error(`[PapersWithCode] Error: ${e.message}`);
        return { results: [] };
    }
}

/**
 * Get repositories associated with a paper
 */
export async function getPaperRepositories(paperId: string): Promise<any[]> {
    try {
        const res = await fetchWithTimeout(
            `${PWC_API_BASE}/papers/${paperId}/repositories/`,
            { headers: { 'Accept': 'application/json' } },
            10000
        );
        if (!res.ok) return [];
        const data = await res.json() as { results?: any[] };
        return data?.results || [];
    } catch {
        return [];
    }
}
