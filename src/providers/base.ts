/**
 * Base utilities for search providers
 */

import { generateRecordId } from '../utils/data-mining-config';
import { SearchResult, SearchOptions } from '../types/search';

export { generateRecordId };
export type { SearchResult, SearchOptions };

export const DEFAULT_TIMEOUT = 25000;

export async function fetchWithTimeout(url: string, options: any = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

export async function safeJson(res: Response, sourceLabel: string): Promise<any> {
    const text = await res.text();
    try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const arrayStart = text.indexOf('[');
        const arrayEnd = text.lastIndexOf(']');
        let start = -1, end = -1;
        if (jsonStart !== -1 && (arrayStart === -1 || jsonStart < arrayStart)) {
            start = jsonStart; end = jsonEnd;
        } else if (arrayStart !== -1) {
            start = arrayStart; end = arrayEnd;
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

export function sanitizeQueryForSearch(query: string): string {
    if (!query) return '';
    let cleaned = query.replace(/```(?:[a-z]+)?([\s\S]*?)```/g, '$1');
    cleaned = cleaned.replace(/`/g, ' ');
    cleaned = cleaned
        .replace(/\\documentclass[\s\S]*?\\begin\{document\}/gi, '')
        .replace(/\\begin\{[a-z*]+\}[\s\S]*?\\end\{[a-z*]+\}/gi, ' ')
        .replace(/\\[a-z*]+\s*(?:\[[^\]]*\])?\s*\{([^\}]*)\}/gi, '$1')
        .replace(/\\[a-z*]+/gi, ' ')
        .replace(/[\{\}\$\\\^\_%]/g, ' ')
        .replace(/["()]/g, ' ')
        .replace(/\s+/g, ' ');
    const preambles = [
        /^(?:the user|i will|here is|certainly|sure|assistant|of course|claro|seguro):?\s*/gi,
        /^["']|["']$/g
    ];
    preambles.forEach(p => { cleaned = cleaned.replace(p, ''); });
    return cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function constructBooleanQuery(query: string): string {
    const stopwords = new Set(['de', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'o', 'en', 'para', 'con', 'del', 'al', 'como', 'que', 'por', 'sobre', 'se', 'su', 'es', 'son', 'ser', 'si', 'the', 'and', 'of', 'to', 'in', 'on', 'with', 'for', 'at', 'by', 'from']);
    const words = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
        .filter(word => word.length >= 3 && !stopwords.has(word));
    const uniqueWords = Array.from(new Set(words));
    return uniqueWords.slice(0, 5).join(' ') || query;
}

export function simplifyQuery(query: string, maxWords: number = 6): string {
    return query.split(/\s+/).filter(w => w.length > 2).slice(0, maxWords).join(' ');
}

export function constructSimpleQuery(query: string): string {
    return query.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function decodeInvertedIndex(invertedIndex: Record<string, number[]> | null | undefined): string {
    if (!invertedIndex || typeof invertedIndex !== 'object') return '';
    try {
        let maxIndex = -1;
        Object.values(invertedIndex).forEach(indices => {
            indices.forEach(idx => { if (idx > maxIndex) maxIndex = idx; });
        });
        if (maxIndex === -1) return '';
        const words: string[] = new Array(maxIndex + 1);
        Object.entries(invertedIndex).forEach(([word, indices]) => {
            indices.forEach(idx => { words[idx] = word; });
        });
        return words.join(' ').trim();
    } catch (e) {
        return '';
    }
}
