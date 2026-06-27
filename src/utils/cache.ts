/**
 * In-memory cache with TTL — V5
 * Used to avoid redundant API calls for repeated searches.
 * Default TTL: 5 minutes.
 */

interface CacheEntry {
    data: any;
    expires: number;
}

const cache = new Map<string, CacheEntry>();

const MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a cached value by key. Returns null if expired or not found.
 */
export function getCached(key: string): any | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

/**
 * Set a value in cache with optional TTL.
 */
export function setCache(key: string, data: any, ttlMs: number = DEFAULT_TTL_MS): void {
    // Evict expired entries if cache is getting large
    if (cache.size >= MAX_ENTRIES) {
        const now = Date.now();
        for (const [k, v] of cache) {
            if (now > v.expires) cache.delete(k);
        }
        // If still too large, remove oldest 25%
        if (cache.size >= MAX_ENTRIES) {
            const entries = Array.from(cache.keys());
            const toRemove = Math.ceil(entries.length * 0.25);
            for (let i = 0; i < toRemove; i++) {
                cache.delete(entries[i]);
            }
        }
    }

    cache.set(key, { data, expires: Date.now() + ttlMs });
}

/**
 * Generate a deterministic cache key from tool name and arguments.
 */
export function cacheKey(tool: string, args: any): string {
    // Sort keys for deterministic serialization
    const normalized = JSON.stringify(args, Object.keys(args || {}).sort());
    return `${tool}:${normalized}`;
}

/**
 * Get cache statistics.
 */
export function cacheStats(): { size: number; maxEntries: number; defaultTtlMs: number } {
    return { size: cache.size, maxEntries: MAX_ENTRIES, defaultTtlMs: DEFAULT_TTL_MS };
}
