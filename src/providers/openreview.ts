/**
 * OpenReview Provider
 * API: https://api2.openreview.net
 * No auth required for public venues. Optional username/password for full access.
 */

import { fetchWithTimeout, sanitizeQueryForSearch } from './base';
import { PaperResult, SearchOptions } from '../types/search';

const OPENREVIEW_API = 'https://api2.openreview.net';

interface OpenReviewNote {
    id?: string;
    forum?: string;
    content?: {
        title?: { value?: string };
        abstract?: { value?: string };
        authors?: { value?: string[] };
        keywords?: { value?: string[] };
        venue?: { value?: string };
        venueid?: { value?: string };
        pdf?: { value?: string };
        _bibtex?: { value?: string };
    };
    cdate?: number;
    tcdate?: number;
    pdate?: number;
}

interface OpenReviewResponse {
    notes?: OpenReviewNote[];
    count?: number;
}

function extractYear(note: OpenReviewNote): number | null {
    // Try to get year from creation date or publication date
    const timestamp = note.pdate || note.cdate || note.tcdate;
    if (timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date.getFullYear();
    }
    // Try to extract from venue string (e.g. "ICLR 2024")
    const venue = note.content?.venue?.value || note.content?.venueid?.value || '';
    const match = venue.match(/(\d{4})/);
    if (match) return parseInt(match[1], 10);
    return null;
}

export async function searchOpenReview(
    query: string,
    options?: SearchOptions
): Promise<{ results: PaperResult[] }> {
    const cleanQuery = sanitizeQueryForSearch(query);
    const limit = options?.limit || 25;

    try {
        console.log(`[OpenReview] Searching: "${cleanQuery.substring(0, 60)}..."`);

        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };

        // Optional authentication
        const username = process.env.OPENREVIEW_USERNAME;
        const password = process.env.OPENREVIEW_PASSWORD;
        if (username && password) {
            try {
                const loginRes = await fetchWithTimeout(`${OPENREVIEW_API}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: username, password }),
                }, 10000);
                if (loginRes.ok) {
                    const loginData = await loginRes.json() as { token?: string };
                    if (loginData.token) {
                        headers['Authorization'] = `Bearer ${loginData.token}`;
                        console.log('[OpenReview] Authenticated successfully');
                    }
                }
            } catch (e: any) {
                console.warn(`[OpenReview] Auth failed (proceeding without): ${e.message}`);
            }
        }

        // Strategy: Try /notes with well-known venue invitations (public, no auth needed)
        const venues = [
            'ICLR.cc/2024/Conference/-/Submission',
            'ICLR.cc/2025/Conference/-/Submission',
            'NeurIPS.cc/2024/Conference/-/Submission',
            'NeurIPS.cc/2023/Conference/-/Submission',
        ];

        let allNotes: OpenReviewNote[] = [];
        const perVenueLimit = Math.ceil(limit / venues.length);

        for (const invitation of venues) {
            try {
                const params = new URLSearchParams({
                    invitation,
                    limit: String(perVenueLimit),
                    details: 'replyCount',
                });

                const res = await fetchWithTimeout(
                    `${OPENREVIEW_API}/notes?${params.toString()}`,
                    { headers },
                    15000
                );

                if (res.ok) {
                    const data = await res.json() as OpenReviewResponse;
                    const notes = data?.notes || [];
                    // Filter by query match in title or abstract
                    const queryTerms = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
                    const matched = notes.filter(note => {
                        const title = (note.content?.title?.value || '').toLowerCase();
                        const abstract = (note.content?.abstract?.value || '').toLowerCase();
                        const haystack = `${title} ${abstract}`;
                        return queryTerms.some(term => haystack.includes(term));
                    });
                    allNotes.push(...matched);
                    console.log(`[OpenReview] ${invitation.split('/')[0]}: ${matched.length}/${notes.length} matched`);
                } else {
                    console.warn(`[OpenReview] ${invitation.split('/')[0]}: HTTP ${res.status}`);
                }
            } catch (e: any) {
                console.warn(`[OpenReview] ${invitation.split('/')[0]}: ${e.message}`);
            }

            if (allNotes.length >= limit) break;
        }

        // Deduplicate by ID
        const seen = new Set<string>();
        const notes = allNotes.filter(n => {
            const id = n.id || '';
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        }).slice(0, limit);


        const results: PaperResult[] = notes.map((note, idx) => {
            const content = note.content || {};
            const title = content.title?.value || 'Untitled';
            const abstract = content.abstract?.value || '';
            const authors = content.authors?.value || [];
            const year = extractYear(note);
            const venue = content.venue?.value || content.venueid?.value || '';
            const keywords = content.keywords?.value || [];

            // Year filtering
            if (options?.yearStart && year && year < parseInt(options.yearStart)) return null;
            if (options?.yearEnd && year && year > parseInt(options.yearEnd)) return null;

            // Build PDF URL
            let pdfUrl: string | null = null;
            if (content.pdf?.value) {
                pdfUrl = content.pdf.value.startsWith('http')
                    ? content.pdf.value
                    : `${OPENREVIEW_API}${content.pdf.value}`;
            }

            // Forum URL
            const forumUrl = note.forum
                ? `https://openreview.net/forum?id=${note.forum}`
                : undefined;

            return {
                id: `openreview_${note.id || idx}`,
                title,
                authors,
                year,
                abstract,
                pdfUrl,
                source: 'openreview',
                doi: null,
                citationCount: null,
                url: forumUrl,
                snippet: [
                    venue ? `Venue: ${venue}` : null,
                    keywords.length > 0 ? `Keywords: ${keywords.slice(0, 5).join(', ')}` : null,
                ].filter(Boolean).join(' | ') || undefined,
            } as PaperResult;
        }).filter(Boolean) as PaperResult[];

        console.log(`[OpenReview] Found ${results.length} results`);
        return { results };
    } catch (e: any) {
        console.error(`[OpenReview] Error: ${e.message}`);
        return { results: [] };
    }
}
