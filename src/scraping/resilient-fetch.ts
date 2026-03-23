/**
 * Resilient HTTP Fetching Utilities
 * SSL bypass, retry logic, bot detection handling
 */

import https from 'node:https';
import http from 'node:http';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

export interface FetchResult {
    html: string;
    status: number;
    headers: Record<string, string>;
}

export function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function insecureFetch(url: string, headers: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const agent = url.startsWith('https') ? new https.Agent({ rejectUnauthorized: false }) : undefined;
        const req = protocol.get(url, { headers, agent }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(new Error('ETIMEDOUT')); });
    });
}

const _failedDomains = new Map<string, number>();
const CIRCUIT_BREAKER_THRESHOLD = 3;

function getDomain(url: string): string {
    try { return new URL(url).hostname; } catch { return url; }
}

export function isDomainBlocked(url: string): boolean {
    const domain = getDomain(url);
    return (_failedDomains.get(domain) || 0) >= CIRCUIT_BREAKER_THRESHOLD;
}

function recordDomainFailure(url: string) {
    const domain = getDomain(url);
    _failedDomains.set(domain, (_failedDomains.get(domain) || 0) + 1);
}

function clearDomainFailure(url: string) {
    const domain = getDomain(url);
    _failedDomains.delete(domain);
}

export async function resilientFetch(url: string, maxRetries = 3, timeoutMs = 15000): Promise<FetchResult> {
    if (isDomainBlocked(url)) {
        throw new Error(`Domain ${getDomain(url)} blocked by circuit breaker after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures`);
    }

    let lastError: any = null;
    const randomUA = getRandomUserAgent();
    const headers: Record<string, string> = {
        'User-Agent': randomUA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`[SCRAPE] Attempt ${attempt + 1} for: ${url}`);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(url, {
                redirect: 'follow',
                headers,
                signal: controller.signal,
            });
            clearTimeout(timer);

            if (response.status === 429 || response.status === 503) {
                const delay = Math.pow(3, attempt + 1) * 1000;
                console.warn(`[SCRAPE] Status ${response.status}. Waiting ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            if (response.status === 403) {
                console.warn(`[SCRAPE] 403 Forbidden on ${url}. Attempting header rotation...`);
                headers['User-Agent'] = USER_AGENTS[(attempt + 1) % USER_AGENTS.length];
                headers['Referer'] = 'https://www.google.com/';
                if (attempt === maxRetries - 1) {
                    const html = await insecureFetch(url, headers);
                    clearDomainFailure(url);
                    return { html, status: 200, headers };
                }
                continue;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            clearDomainFailure(url);
            return { html: await response.text(), status: response.status, headers };
        } catch (e: any) {
            lastError = e;
            const msg = e.message || '';
            console.warn(`[SCRAPE] ${msg} on ${url}.`);

            if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || e.name === 'AbortError') {
                recordDomainFailure(url);
                if (isDomainBlocked(url)) {
                    throw new Error(`Domain ${getDomain(url)} unreachable (circuit breaker after ${CIRCUIT_BREAKER_THRESHOLD} failures)`);
                }
            }

            if (msg.includes('fetch failed') || msg.includes('SSL') || msg.includes('CERT') || msg.includes('ECONNRESET')) {
                try {
                    const html = await insecureFetch(url, headers);
                    clearDomainFailure(url);
                    return { html, status: 200, headers };
                } catch (inner: any) {
                    lastError = inner;
                }
            }
            await new Promise(r => setTimeout(r, Math.min(Math.pow(2, attempt) * 1000, 5000)));
        }
    }
    recordDomainFailure(url);
    throw lastError;
}

const BOT_KEYWORDS = [
    "Making sure you're not a bot",
    'Cloudflare',
    'security challenge',
    'automated access',
    'blocked for security'
];

export function detectBotChallenge(html: string): boolean {
    return BOT_KEYWORDS.some(key => html.includes(key));
}
