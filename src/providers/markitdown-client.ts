/**
 * MarkItDown Client — PDF to Markdown conversion via pymupdf4llm
 * Calls embedded Python script for structured markdown extraction.
 * Falls back gracefully if Python/pymupdf4llm is not available.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

export interface MarkdownResult {
    markdown: string;
    chars: number;
    lines: number;
    pages: number;
    source: 'markitdown' | 'pdf-parse';
}

/** Cache of markdown conversions (source → result, 15min TTL) */
const markdownCache: Map<string, { result: MarkdownResult; timestamp: number }> = new Map();
const MARKDOWN_CACHE_TTL = 15 * 60 * 1000;

/** Track Python availability to avoid repeated failed attempts */
let pythonAvailable: boolean | null = null;
let pythonCheckTimestamp = 0;
const PYTHON_CHECK_TTL = 60 * 1000; // Re-check every 60s

/**
 * Find the Python executable (python3 or python)
 */
async function findPython(): Promise<string> {
    for (const cmd of ['python', 'python3']) {
        try {
            const { stdout } = await execFileAsync(cmd, ['-c', 'import pymupdf4llm; print("ok")'], { timeout: 5000 });
            if (stdout.includes('ok')) return cmd;
        } catch { /* skip */ }
    }
    throw new Error('Python 3 with pymupdf4llm not found. Install Python 3.9+ and pip install pymupdf4llm.');
}

/**
 * Check if Python + pymupdf4llm are available
 */
export async function isPythonAvailable(): Promise<boolean> {
    if (pythonAvailable !== null && Date.now() - pythonCheckTimestamp < PYTHON_CHECK_TTL) {
        return pythonAvailable;
    }

    try {
        const pythonCmd = await findPython();
        pythonAvailable = true;
        console.log(`[MarkItDown] ✅ Python + pymupdf4llm available via '${pythonCmd}'`);
    } catch (e: any) {
        pythonAvailable = false;
        console.warn(`[MarkItDown] ⚠️ Python/pymupdf4llm not available: ${e.message}`);
    }

    pythonCheckTimestamp = Date.now();
    return pythonAvailable;
}

/**
 * Convert PDF buffer to structured Markdown via pymupdf4llm
 * @param pdfBuffer - Raw PDF file buffer
 * @param cacheKey - Optional cache key (typically the source URL/path)
 * @param pages - Optional array of 0-indexed page numbers to extract
 */
export async function convertToMarkdown(
    pdfBuffer: Buffer,
    cacheKey?: string,
    pages?: number[]
): Promise<MarkdownResult> {
    // Check cache first
    if (cacheKey && !pages) {
        const cached = markdownCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < MARKDOWN_CACHE_TTL) {
            console.log(`[MarkItDown] Cache HIT: ${cacheKey.substring(0, 60)}`);
            return cached.result;
        }
    }

    // Check Python availability
    const available = await isPythonAvailable();
    if (!available) {
        throw new Error('MarkItDown not available: Python 3 + pymupdf4llm required');
    }

    // Write buffer to temp file
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `letxipu_md_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    try {
        const pythonCmd = await findPython();
        const scriptPath = path.resolve(__dirname, '../../scripts/pdf_to_markdown.py');

        const args = [scriptPath, tempPath];
        if (pages && pages.length > 0) {
            args.push(pages.join(','));
        }

        console.log(`[MarkItDown] Converting PDF (${(pdfBuffer.length / 1024).toFixed(0)} KB)...`);

        const { stdout, stderr } = await execFileAsync(pythonCmd, args, {
            timeout: 120000, // 2 min timeout
            maxBuffer: 100 * 1024 * 1024, // 100MB output buffer
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });

        if (stderr) {
            console.warn(`[MarkItDown] stderr: ${stderr.substring(0, 200)}`);
        }

        const parsed = JSON.parse(stdout);

        if (!parsed.success) {
            throw new Error(parsed.error || 'Unknown conversion error');
        }

        const result: MarkdownResult = {
            markdown: parsed.markdown,
            chars: parsed.chars,
            lines: parsed.lines,
            pages: parsed.pages || 0,
            source: 'markitdown',
        };

        // Cache the result
        if (cacheKey && !pages) {
            markdownCache.set(cacheKey, { result, timestamp: Date.now() });
            console.log(`[MarkItDown] ✅ Converted: ${result.chars} chars, ${result.pages} pages (cached)`);
        } else {
            console.log(`[MarkItDown] ✅ Converted: ${result.chars} chars, ${result.pages} pages`);
        }

        return result;
    } catch (e: any) {
        if (e.message.includes('TIMEOUT') || e.killed) {
            throw new Error(`MarkItDown timeout: PDF conversion took longer than 120s`);
        }
        throw e;
    } finally {
        // Cleanup temp file
        try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch { /* ignore cleanup errors */ }
    }
}

/**
 * Parse page range string into array of 0-indexed page numbers
 * Supports: "1-5", "1,3,5", "last3", "first5", "1-3,7,9-11"
 */
export function parsePageRange(range: string, totalPages: number): number[] {
    const pages: Set<number> = new Set();

    // Handle special keywords
    if (range.toLowerCase().startsWith('last')) {
        const n = parseInt(range.slice(4)) || 3;
        for (let i = Math.max(0, totalPages - n); i < totalPages; i++) pages.add(i);
        return [...pages];
    }
    if (range.toLowerCase().startsWith('first')) {
        const n = parseInt(range.slice(5)) || 5;
        for (let i = 0; i < Math.min(n, totalPages); i++) pages.add(i);
        return [...pages];
    }

    // Handle comma-separated ranges: "1-3,5,7-9"
    for (const part of range.split(',')) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                // Convert 1-indexed to 0-indexed
                for (let i = Math.max(0, start - 1); i < Math.min(end, totalPages); i++) {
                    pages.add(i);
                }
            }
        } else {
            const p = parseInt(trimmed);
            if (!isNaN(p) && p >= 1 && p <= totalPages) {
                pages.add(p - 1); // Convert 1-indexed to 0-indexed
            }
        }
    }

    return [...pages].sort((a, b) => a - b);
}

/**
 * Smart truncation: truncate markdown at section boundaries
 * Instead of cutting mid-sentence, cuts at the nearest heading or paragraph break
 */
export function smartTruncate(markdown: string, maxChars: number): string {
    if (markdown.length <= maxChars) return markdown;

    // Find the last good break point before maxChars
    const breakPatterns = [
        /\n#{1,6}\s/g,      // Heading boundary
        /\n---\n/g,          // Horizontal rule
        /\n\n/g,             // Paragraph break
        /\n/g,               // Line break
    ];

    let bestBreak = maxChars;

    for (const pattern of breakPatterns) {
        let match;
        let lastGoodMatch = -1;
        while ((match = pattern.exec(markdown)) !== null) {
            if (match.index <= maxChars && match.index > lastGoodMatch) {
                lastGoodMatch = match.index;
            }
            if (match.index > maxChars) break;
        }
        if (lastGoodMatch > maxChars * 0.7) { // Don't cut too short
            bestBreak = lastGoodMatch;
            break;
        }
    }

    const truncated = markdown.substring(0, bestBreak).trimEnd();
    const remaining = markdown.length - bestBreak;
    return truncated + `\n\n---\n*[Truncado: ${remaining.toLocaleString()} caracteres restantes. Use extract_section o pages para obtener secciones específicas.]*`;
}

/** Clear expired markdown cache entries */
export function clearMarkdownCache(): void {
    const now = Date.now();
    for (const [key, val] of markdownCache.entries()) {
        if (now - val.timestamp > MARKDOWN_CACHE_TTL) {
            markdownCache.delete(key);
        }
    }
}

/** Get markdown cache stats */
export function getMarkdownCacheStats(): { entries: number; oldestAge: number } {
    let oldestAge = 0;
    const now = Date.now();
    for (const val of markdownCache.values()) {
        const age = now - val.timestamp;
        if (age > oldestAge) oldestAge = age;
    }
    return { entries: markdownCache.size, oldestAge };
}
