/**
 * Base utilities for search providers
 * Shared functions used by all academic search providers
 */

import { generateRecordId } from '../utils/data-mining-config';
import { SearchResult, SearchOptions } from '../types/search';

export { generateRecordId };
export type { SearchResult, SearchOptions };

export const DEFAULT_TIMEOUT = 25000;

/**
 * Enhanced fetch with explicit timeout support for academic providers
 */
export async function fetchWithTimeout(url: string, options: any = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

/**
 * Safe JSON parsing that handles potential HTML/PHP garbage at the start/end
 * of an API response (common with legacy academic portals).
 */
export async function safeJson(res: Response, sourceLabel: string): Promise<any> {
    const text = await res.text();
    try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const arrayStart = text.indexOf('[');
        const arrayEnd = text.lastIndexOf(']');

        let start = -1;
        let end = -1;

        if (jsonStart !== -1 && (arrayStart === -1 || jsonStart < arrayStart)) {
            start = jsonStart;
            end = jsonEnd;
        } else if (arrayStart !== -1) {
            start = arrayStart;
            end = arrayEnd;
        }

        if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(text.substring(start, end + 1));
        }
        return JSON.parse(text);
    } catch (err: any) {
        console.error(`[${sourceLabel}] JSON Parse Failure: ${err.message}. Raw snippet: ${text.substring(0, 200)}`);
        throw new Error(`Invalid JSON response from ${sourceLabel}`);
    }
}

/**
 * Normalize Spanish/Portuguese accents to ASCII equivalents for API compatibility
 */
export function normalizeAccents(text: string): string {
    const accentMap: Record<string, string> = {
        'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ñ': 'n', 'ç': 'c',
        'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ñ': 'N', 'Ç': 'C'
    };
    return text.split('').map(char => accentMap[char] || char).join('');
}

/**
 * Utility to strip LaTeX and other artifacts from a search query before hitting APIs.
 * Enhanced in V4 with broader LLM preamble detection.
 */
export function sanitizeQueryForSearch(query: string): string {
    if (!query) return '';

    // 0. Aggressive: Remove markdown blocks (```latex ... ```)
    let cleaned = query.replace(/```(?:[a-z]+)?([\s\S]*?)```/g, '$1');

    // 0b. Remove single backticks
    cleaned = cleaned.replace(/`/g, ' ');

    // 1. Strip LaTeX and specific artifacts
    cleaned = cleaned
        .replace(/\\documentclass[\s\S]*?\\begin\{document\}/gi, '')
        .replace(/\\begin\{[a-z*]+\}[\s\S]*?\\end\{[a-z*]+\}/gi, ' ')
        .replace(/\\[a-z*]+\s*(?:\[[^\]]*\])?\s*\{([^\}]*)\}/gi, '$1')
        .replace(/\\[a-z*]+/gi, ' ')
        .replace(/[\{\}\$\\\^\_%]/g, ' ')
        .replace(/["()]/g, ' ')
        .replace(/\s+/g, ' ');

    // 2. Remove common LLM conversational preambles (enhanced for V4)
    const preambles = [
        /^(?:the user|i will|here is|certainly|sure|assistant|of course|claro|seguro|tengo entendido|aquí tienes|consulta\s+de\s+b[uú]squeda|possible\s+query|search\s+query|recommended\s+search),?\s+(?:is asking|has requested|wants|translate|write|help|is a possible|the translation|the query|que|la consulta|la b[uú]squeda):?\s*/gi,
        /^(?:the user is asking me to translate|here is the translation|aquí está la traducción|consulta\s+de\s+b[uú]squeda|search\s+query|la consulta\s+de\s+b[uú]squeda):?\s*/gi,
        /^(?:queries?\s+(?:de\s+)?b[uú]squedas?|b[uú]squedas?\s+recomendadas?|subqueries?|consultas?|search\s+queries?|possible\s+queries?):?\s*/gi,
        /^["']|["']$/g // Remove surrounding quotes
    ];

    preambles.forEach(p => {
        cleaned = cleaned.replace(p, '');
    });

    return cleaned
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Smart Boolean Query Constructor
 * Transforms a long natural language query into a structured boolean query for strict engines.
 */
export function constructBooleanQuery(query: string): string {
    const stopwords = new Set(['de', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'o', 'en', 'para', 'con', 'del', 'al', 'como', 'que', 'por', 'sobre', 'se', 'su', 'es', 'son', 'ser', 'si', 'the', 'and', 'of', 'to', 'in', 'on', 'with', 'for', 'at', 'by', 'from']);
    const minWordLength = 3;
    const maxTerms = 5;

    const words = query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= minWordLength && !stopwords.has(word));

    const uniqueWords = Array.from(new Set(words));
    const topWords = uniqueWords.slice(0, maxTerms);

    if (topWords.length === 0) return query;

    return topWords.join(' ');
}

/**
 * Simplify query to max N words (plain text)
 */
export function simplifyQuery(query: string, maxWords: number = 6): string {
    const words = query.split(/\s+/).filter(w => w.length > 2);
    return words.slice(0, maxWords).join(' ');
}

/**
 * Construct a very clean, simple query for engines that don't like any special chars
 */
export function constructSimpleQuery(query: string): string {
    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Decode OpenAlex's abstract_inverted_index into a readable string.
 */
export function decodeInvertedIndex(invertedIndex: Record<string, number[]> | null | undefined): string {
    if (!invertedIndex || typeof invertedIndex !== 'object') return '';

    try {
        // Find the maximum index to determine the size of the array
        let maxIndex = -1;
        Object.values(invertedIndex).forEach(indices => {
            indices.forEach(idx => {
                if (idx > maxIndex) maxIndex = idx;
            });
        });

        if (maxIndex === -1) return '';

        // Reconstruct the words in their original positions
        const words: string[] = new Array(maxIndex + 1);
        Object.entries(invertedIndex).forEach(([word, indices]) => {
            indices.forEach(idx => {
                words[idx] = word;
            });
        });

        return words.join(' ').trim();
    } catch (e) {
        console.warn('[BASE] Failed to decode inverted index:', e);
        return '';
    }
}
