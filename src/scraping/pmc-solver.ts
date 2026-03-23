/**
 * PubMed Central (PMC) PDF Solver
 * Handles PoW challenges to download PMC PDFs
 */

import { createHash } from 'crypto';

export function isPmcPowChallenge(html: string): boolean {
    return (html.includes('POW_CHALLENGE') && html.includes('ncbi.pmc.pow')) ||
        html.includes('cloudpmc-viewer-pow') ||
        (html.includes('Preparing to download') && html.includes('POW_DIFFICULTY'));
}

interface PmcPowParams {
    challenge: string;
    difficulty: number;
    cookieName: string;
    cookiePath: string;
}

function extractPmcPowParams(html: string): PmcPowParams | null {
    const challengeMatch = html.match(/POW_CHALLENGE\s*=\s*"([^"]+)"/);
    if (!challengeMatch) return null;
    const difficultyMatch = html.match(/POW_DIFFICULTY\s*=\s*"(\d+)"/);
    const cookieNameMatch = html.match(/POW_COOKIE_NAME\s*=\s*"([^"]+)"/);
    const cookiePathMatch = html.match(/POW_COOKIE_PATH\s*=\s*"([^"]+)"/);
    return {
        challenge: challengeMatch[1],
        difficulty: parseInt(difficultyMatch?.[1] || '4', 10),
        cookieName: cookieNameMatch?.[1] || 'cloudpmc-viewer-pow',
        cookiePath: cookiePathMatch?.[1] || '/'
    };
}

function solvePow(challenge: string, difficulty: number): { nonce: number; hash: string } {
    const prefix = '0'.repeat(difficulty);
    let nonce = 0;
    const maxIterations = 5_000_000;
    while (nonce < maxIterations) {
        const input = challenge + nonce.toString();
        const hash = createHash('sha256').update(input).digest('hex');
        if (hash.startsWith(prefix)) return { nonce, hash };
        nonce++;
    }
    throw new Error(`PMC PoW: exceeded ${maxIterations} iterations`);
}

export function extractPmcId(url: string): string | null {
    const match = url.match(/\/(?:articles|pmc\/articles)\/(PMC\d+)/i);
    return match ? match[1] : null;
}

export function buildPmcPdfUrl(pmcId: string): string {
    return `https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}/pdf/`;
}

const PMC_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
};

export async function fetchPmcPdfWithPow(pdfUrl: string): Promise<{ buffer: ArrayBuffer; finalUrl: string } | null> {
    try {
        console.log(`[PMC-PoW] Fetching: ${pdfUrl}`);
        const res = await fetch(pdfUrl, {
            headers: PMC_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) return null;

        const buf = await res.arrayBuffer();
        const header = new Uint8Array(buf.slice(0, 5));
        if (String.fromCharCode(...header).startsWith('%PDF-')) {
            return { buffer: buf, finalUrl: res.url };
        }

        const html = Buffer.from(buf).toString('utf-8');
        if (!isPmcPowChallenge(html)) return null;

        const params = extractPmcPowParams(html);
        if (!params) return null;

        const { nonce } = solvePow(params.challenge, params.difficulty);
        const cookie = `${params.cookieName}=${params.challenge},${nonce}`;

        const pdfRes = await fetch(pdfUrl, {
            headers: { ...PMC_HEADERS, 'Cookie': cookie }, redirect: 'follow', signal: AbortSignal.timeout(20000)
        });
        if (!pdfRes.ok) return null;

        const pdfBuf = await pdfRes.arrayBuffer();
        const pdfHeader = new Uint8Array(pdfBuf.slice(0, 5));
        if (String.fromCharCode(...pdfHeader).startsWith('%PDF-')) {
            return { buffer: pdfBuf, finalUrl: pdfRes.url };
        }

        // Retry once more if PoW challenge again
        const retryHtml = Buffer.from(pdfBuf).toString('utf-8');
        if (isPmcPowChallenge(retryHtml)) {
            const retryParams = extractPmcPowParams(retryHtml);
            if (retryParams) {
                const retry = solvePow(retryParams.challenge, retryParams.difficulty);
                const retryCookie = `${retryParams.cookieName}=${retryParams.challenge},${retry.nonce}`;
                const finalRes = await fetch(pdfUrl, {
                    headers: { ...PMC_HEADERS, 'Cookie': retryCookie }, redirect: 'follow', signal: AbortSignal.timeout(20000)
                });
                if (finalRes.ok) {
                    const finalBuf = await finalRes.arrayBuffer();
                    const finalHeader = new Uint8Array(finalBuf.slice(0, 5));
                    if (String.fromCharCode(...finalHeader).startsWith('%PDF-')) {
                        return { buffer: finalBuf, finalUrl: finalRes.url };
                    }
                }
            }
        }
        return null;
    } catch (e: any) {
        console.error(`[PMC-PoW] Error: ${e.message}`);
        return null;
    }
}

export async function resolvePmcPdf(url: string): Promise<{ buffer: ArrayBuffer; finalUrl: string } | null> {
    const pmcId = extractPmcId(url);
    if (url.includes('/pdf/')) {
        const result = await fetchPmcPdfWithPow(url);
        if (result) return result;
    }
    if (pmcId) {
        const pdfDirUrl = buildPmcPdfUrl(pmcId);
        if (pdfDirUrl !== url) {
            const result = await fetchPmcPdfWithPow(pdfDirUrl);
            if (result) return result;
        }
        const articleUrl = `https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}/`;
        try {
            const artRes = await fetch(articleUrl, {
                headers: PMC_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(15000)
            });
            if (artRes.ok) {
                let artHtml = await artRes.text();
                if (isPmcPowChallenge(artHtml)) {
                    const params = extractPmcPowParams(artHtml);
                    if (params) {
                        const { nonce } = solvePow(params.challenge, params.difficulty);
                        const cookie = `${params.cookieName}=${params.challenge},${nonce}`;
                        const retryArt = await fetch(articleUrl, {
                            headers: { ...PMC_HEADERS, 'Cookie': cookie }, redirect: 'follow', signal: AbortSignal.timeout(15000)
                        });
                        if (retryArt.ok) artHtml = await retryArt.text();
                    }
                }
                const pdfMeta = artHtml.match(/<meta[^>]+name="citation_pdf_url"[^>]+content="([^"]+)"/i) ||
                    artHtml.match(/<meta[^>]+content="([^"]+)"[^>]+name="citation_pdf_url"/i);
                if (pdfMeta?.[1]) {
                    const pdfResult = await fetchPmcPdfWithPow(pdfMeta[1]);
                    if (pdfResult) return pdfResult;
                }
                const pdfLinkMatch = artHtml.match(/href="([^"]*\/pdf\/[^"]+\.pdf)"/i);
                if (pdfLinkMatch?.[1]) {
                    let pdfLink = pdfLinkMatch[1];
                    if (pdfLink.startsWith('/')) pdfLink = `https://pmc.ncbi.nlm.nih.gov${pdfLink}`;
                    return await fetchPmcPdfWithPow(pdfLink);
                }
            }
        } catch (e: any) {
            console.log(`[PMC-PoW] Article page fetch failed: ${e.message}`);
        }
    }
    return null;
}

export function isPmcUrl(url: string): boolean {
    return /pmc\.ncbi\.nlm\.nih\.gov\/articles\//i.test(url) ||
        /ncbi\.nlm\.nih\.gov\/pmc\/articles\//i.test(url) ||
        /pubmed\.ncbi\.nlm\.nih\.gov\//i.test(url);
}
