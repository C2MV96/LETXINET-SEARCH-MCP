/**
 * HTML Metadata Extraction Utilities
 * Extract academic metadata from HTML meta tags
 */

export interface ScrapedMetadata {
    authors: string[];
    date: number | null;
    pdfUrl: string | null;
    title: string | null;
    university: string | null;
    abstract: string | null;
}

/**
 * Clean HTML entities and normalize whitespace
 */
export function cleanText(text: string | null): string | null {
    if (!text) return null;
    return text
        .replace(/&#x?[0-9a-fA-F]+;/g, (m) =>
            m.startsWith('&#x')
                ? String.fromCharCode(parseInt(m.slice(3, -1), 16))
                : String.fromCharCode(parseInt(m.slice(2, -1), 10))
        )
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\.{2,3}\s*Descripci[oó]n completa\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract metadata from HTML content using meta tags
 */
export function extractMetadataFromHtml(html: string): ScrapedMetadata {
    const metadata: ScrapedMetadata = {
        authors: [],
        date: null,
        pdfUrl: null,
        title: null,
        university: null,
        abstract: null
    };

    const metaTagRegex = /<meta\s+[^>]*>/gi;
    let match;

    while ((match = metaTagRegex.exec(html)) !== null) {
        const tag = match[0];
        const nameMatch = tag.match(/(?:name|property|itemprop|id)=["']([^"']+)["']/i);
        const contentMatch = tag.match(/content=["']([^"']+)["']/i);

        if (nameMatch && contentMatch) {
            const name = nameMatch[1].toLowerCase();
            const content = contentMatch[1].trim();

            // Authors
            if (['citation_author', 'dc.contributor.author', 'dc.creator', 'author'].includes(name)) {
                const isInvalid = name.includes('advisor') || name.includes('director') ||
                    name.includes('asesor') || name.includes('coordinador');
                if (!isInvalid && !metadata.authors.includes(content) && content.length > 2 && !content.includes('@')) {
                    metadata.authors.push(content);
                }
            }

            // Date
            if (['citation_date', 'dc.date.issued', 'citation_publication_date', 'date', 'dc.date'].includes(name) && !metadata.date) {
                const yearMatch = content.match(/(\d{4})/);
                if (yearMatch) metadata.date = parseInt(yearMatch[1]);
            }

            // PDF URL
            if (!metadata.pdfUrl && (
                ['citation_pdf_url', 'eprints.document_url'].includes(name) ||
                (['og:url', 'og:description'].includes(name) && (content.endsWith('.pdf') || content.includes('view/pdf')))
            )) {
                metadata.pdfUrl = content;
            }

            // Title
            if (!metadata.title && ['citation_title', 'dc.title', 'title', 'og:title'].includes(name)) {
                metadata.title = content;
            }

            // University
            if (!metadata.university && ['citation_dissertation_institution', 'dc.publisher', 'publisher', 'institution'].includes(name)) {
                metadata.university = content;
            }

            // Abstract
            if (!metadata.abstract && [
                'citation_abstract', 'dc.description.abstract', 'description',
                'og:description', 'dcterms.abstract', 'dcterms.description.abstract', 'dc.description'
            ].includes(name)) {
                if (content.length > 50) metadata.abstract = content;
            }
        }
    }

    // Fallback: Extract title from <title> tag
    if (!metadata.title) {
        const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleTagMatch) {
            const rawTitle = titleTagMatch[1].split('|')[0].trim();
            if (!['DSpace', 'Cybertesis', 'Repositorio'].includes(rawTitle)) {
                metadata.title = rawTitle;
            }
        }
    }

    // Clean all text fields
    if (metadata.abstract) metadata.abstract = cleanText(metadata.abstract);
    if (metadata.title) metadata.title = cleanText(metadata.title);
    if (metadata.university) metadata.university = cleanText(metadata.university);
    metadata.authors = metadata.authors.map(a => cleanText(a)).filter(Boolean) as string[];

    return metadata;
}

/**
 * Check if HTML is a DSpace 7 SPA (empty shell)
 */
export function isDSpace7Spa(html: string): boolean {
    return html.includes('<div id="root"></div>') || html.includes('dspace-angular') || html.includes('<ds-app>') || html.includes('<ds-app></ds-app>');
}

/**
 * Standard DSpace 7 API base paths to try when auto-discovering
 */
const DSPACE7_API_PATHS = ['/server/api', '/backend/api', '/api'];

/**
 * Try to resolve an item from a handle via DSpace 7 REST API.
 * Tries findHandle first, then pid/find as fallback.
 */
async function resolveItemFromHandle(apiBase: string, handleSuffix: string): Promise<any | null> {
    // Strategy 1: findHandle (used by most DSpace 7 instances)
    try {
        const findUrl = `${apiBase}/core/items/findHandle?handle=${handleSuffix}`;
        const res = await fetch(findUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
        if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('json')) {
                const item = await res.json() as any;
                if (item?.uuid) return item;
            }
        }
    } catch { }

    // Strategy 2: pid/find (used by La Molina and newer DSpace 7 instances)
    try {
        const pidUrl = `${apiBase}/pid/find?id=${handleSuffix}`;
        const res = await fetch(pidUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000), redirect: 'manual' });
        
        if (res.status === 302) {
            const location = res.headers.get('location');
            if (location) {
                const uuidMatch = location.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i);
                if (uuidMatch) {
                    // Follow the redirect to get the full item JSON
                    try {
                        const itemRes = await fetch(location, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
                        if (itemRes.ok) return await itemRes.json();
                    } catch { }
                    // If that fails, return a minimal object with UUID
                    return { uuid: uuidMatch[1] };
                }
            }
        }
        
        if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('json')) {
                const item = await res.json() as any;
                if (item?.uuid) return item;
            }
        }
    } catch { }

    return null;
}

/**
 * Extract PDF URL from an item's bundles via DSpace 7 REST API
 */
async function extractPdfFromBundles(item: any, apiBase: string): Promise<string | null> {
    try {
        const bundlesLink = item._links?.bundles?.href;
        if (!bundlesLink) {
            // Try constructing it manually
            const constructed = `${apiBase}/core/items/${item.uuid}/bundles`;
            const bRes = await fetch(constructed, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
            if (!bRes.ok) return null;
            const bData = await bRes.json() as any;
            return await findPdfInBundles(bData, apiBase);
        }
        
        const bRes = await fetch(bundlesLink, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
        if (!bRes.ok) return null;
        const bData = await bRes.json() as any;
        return await findPdfInBundles(bData, apiBase);
    } catch (e) {
        console.warn("Failed to fetch DSpace 7 bundles for PDF URL:", e);
        return null;
    }
}

async function findPdfInBundles(bundlesData: any, apiBase: string): Promise<string | null> {
    const bundles = bundlesData._embedded?.bundles || [];
    const originalBundle = bundles.find((b: any) => b.name === 'ORIGINAL');
    if (!originalBundle) return null;

    const bitstreamsLink = originalBundle._links?.bitstreams?.href;
    if (!bitstreamsLink) return null;

    // We need to fetch bitstreams synchronously-ish, so we return a promise
    // This is called from an async context so it's fine
    return await fetchBitstreamsForPdf(bitstreamsLink, apiBase);
}

async function fetchBitstreamsForPdf(bitstreamsLink: string, apiBase: string): Promise<string | null> {
    try {
        const bsRes = await fetch(bitstreamsLink, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
        if (!bsRes.ok) return null;
        const bsData = await bsRes.json() as any;
        const bitstreams = bsData._embedded?.bitstreams || [];
        
        // Skip purely administrative files
        const skipNames = /turnitin|autoriza|licen|acta|declaraci|formulario|constancia|similitud|originalidad|conformidad/i;
        
        // Filter only PDFs
        const pdfs = bitstreams.filter((bs: any) => {
            const mime = bs.metadata?.['dc.format.mimetype']?.[0]?.value || '';
            return mime.includes('pdf') || (bs.name && bs.name.toLowerCase().endsWith('.pdf'));
        });

        if (pdfs.length === 0) return null;
        if (pdfs.length === 1) {
            const pdfBs = pdfs[0];
            const origin = apiBase.replace(/\/(?:server|backend)\/api$/, '').replace(/\/api$/, '');
            return pdfBs._links?.content?.href || `${origin}/bitstreams/${pdfBs.uuid}/download`;
        }

        // If multiple PDFs exist, score them to find the main document
        // Positive points for "tesis", "trabajo", "completo". Negative for "resumen", "anexo", etc.
        let bestPdf = pdfs[0];
        let bestScore = -999;

        for (const pdf of pdfs) {
            let score = 0;
            const name = (pdf.name || '').toLowerCase();
            const desc = (pdf.metadata?.['dc.description']?.[0]?.value || '').toLowerCase();
            const searchStr = `${name} ${desc}`;

            if (skipNames.test(searchStr)) score -= 100;
            if (/resumen|abstract|portada|indice|anexo|apendice/i.test(searchStr)) score -= 50;
            if (/tesis|trabajo_de_grado|proyecto|investigacion|completo|main/i.test(searchStr)) score += 50;
            
            // Prefer larger files (often full text vs 2-page summary)
            const sizeMB = (pdf.sizeBytes || 0) / (1024 * 1024);
            if (sizeMB > 1) score += 10;
            if (sizeMB > 5) score += 20;

            if (score > bestScore) {
                bestScore = score;
                bestPdf = pdf;
            }
        }
        
        if (bestPdf) {
            const origin = apiBase.replace(/\/(?:server|backend)\/api$/, '').replace(/\/api$/, '');
            return bestPdf._links?.content?.href || `${origin}/bitstreams/${bestPdf.uuid}/download`;
        }
    } catch { }
    return null;
}

/**
 * Fetch metadata from DSpace 7 REST API (with explicit apiBase)
 */
export async function fetchDSpace7Metadata(
    apiBase: string,
    handleSuffix: string,
    universityName: string
): Promise<ScrapedMetadata | null> {
    console.log(`DSpace 7 Detected. Attempting API: ${apiBase} for handle ${handleSuffix}`);

    try {
        const item = await resolveItemFromHandle(apiBase, handleSuffix);
        if (!item) return null;

        const findMeta = (key: string) => item.metadata?.[key]?.map((m: any) => m.value) || [];

        const metadata: ScrapedMetadata = {
            authors: findMeta('dc.contributor.author').concat(findMeta('dc.creator')),
            title: item.name || findMeta('dc.title')[0] || null,
            abstract: findMeta('dc.description.abstract')[0] || findMeta('dc.description')[0] || null,
            university: findMeta('dc.publisher')[0] || universityName,
            pdfUrl: null,
            date: null
        };

        const dateStr = findMeta('dc.date.issued')[0] || findMeta('citation_date')[0];
        if (dateStr) {
            const yMatch = dateStr.match(/(\d{4})/);
            if (yMatch) metadata.date = parseInt(yMatch[1]);
        }

        // Fetch PDF bitstream via bundles
        metadata.pdfUrl = await extractPdfFromBundles(item, apiBase);

        console.log(`Successfully extracted DSpace 7 metadata via API (abstract: ${metadata.abstract ? 'yes' : 'no'}, pdf: ${metadata.pdfUrl ? 'yes' : 'no'})`);
        return metadata;
    } catch (e) {
        console.error("DSpace 7 API failed", e);
        return null;
    }
}

/**
 * AUTO-DETECT DSpace 7 and fetch metadata dynamically.
 * Given a repository URL and its HTML, detects if it's DSpace 7,
 * auto-discovers the API base, and fetches metadata + PDF URL.
 * No static config flags needed.
 */
export async function detectAndFetchDSpace7(
    repoUrl: string,
    html: string,
    universityName?: string
): Promise<ScrapedMetadata | null> {
    // Only activate for DSpace 7 SPA pages
    if (!isDSpace7Spa(html)) return null;

    // Extract handle from URL
    const handleMatch = repoUrl.match(/\/handle\/([\w.]+\/\w+)/);
    if (!handleMatch) return null;
    const handleSuffix = handleMatch[1];

    // Extract origin
    const origin = new URL(repoUrl).origin;
    
    console.log(`[DSpace7-AutoDetect] SPA detected at ${origin}, trying API discovery for handle ${handleSuffix}`);

    // Try each standard API path
    for (const apiPath of DSPACE7_API_PATHS) {
        const apiBase = `${origin}${apiPath}`;
        try {
            const item = await resolveItemFromHandle(apiBase, handleSuffix);
            if (item) {
                console.log(`[DSpace7-AutoDetect] API discovered at ${apiBase} (item UUID: ${item.uuid})`);
                
                const findMeta = (key: string) => item.metadata?.[key]?.map((m: any) => m.value) || [];
                
                const metadata: ScrapedMetadata = {
                    authors: findMeta('dc.contributor.author').concat(findMeta('dc.creator')),
                    title: item.name || findMeta('dc.title')[0] || null,
                    abstract: findMeta('dc.description.abstract')[0] || findMeta('dc.description')[0] || null,
                    university: findMeta('dc.publisher')[0] || universityName || null,
                    pdfUrl: null,
                    date: null
                };

                const dateStr = findMeta('dc.date.issued')[0] || findMeta('citation_date')[0];
                if (dateStr) {
                    const yMatch = dateStr.match(/(\d{4})/);
                    if (yMatch) metadata.date = parseInt(yMatch[1]);
                }

                // Fetch PDF
                metadata.pdfUrl = await extractPdfFromBundles(item, apiBase);

                console.log(`[DSpace7-AutoDetect] Success: abstract=${metadata.abstract ? 'yes' : 'no'}, pdf=${metadata.pdfUrl ? 'yes' : 'no'}`);
                return metadata;
            }
        } catch (e) {
            console.log(`[DSpace7-AutoDetect] API path ${apiPath} failed, trying next...`);
            continue;
        }
    }

    console.log(`[DSpace7-AutoDetect] All API paths exhausted for ${origin}`);
    return null;
}

/**
 * Extract metadata from ALICIA (VuFind) page HTML
 * ALICIA doesn't expose abstracts in meta tags — only in body text
 */
export function extractAliciaMetadata(html: string): ScrapedMetadata & { repoHandleUrl?: string } {
    // Start with standard meta tag extraction (gets authors, title, date)
    const metadata = extractMetadataFromHtml(html);

    // ALICIA-specific: extract abstract from body text
    // Pattern: "Descripción del Articulo" followed by the abstract text in VuFind record sections
    if (!metadata.abstract || metadata.abstract.length < 50) {
        // Try to extract from the record body section
        const descPatterns = [
            // VuFind pattern: "Descripción del Articulo" section
            /Descripci[oó]n\s+del\s+Art[ií]culo\s*([\s\S]*?)(?:<\/div>|<h[2-5]|<dt|<\/td|Texto\s+completo|<\/section)/i,
            // Alternative VuFind pattern: record body
            /class="record\s+sourceSolr"[^>]*>[\s\S]*?<\/h[1-3]>\s*([\s\S]*?)(?:<\/div>\s*<div\s+class="record-|<h[2-5]|Texto\s+completo)/i,
            // "Resumen" section
            /(?:Resumen|Abstract)\s*[:.]?\s*<\/(?:th|dt|h[2-5]|strong|b|label)>\s*<(?:td|dd|div|p|span)[^>]*>\s*([\s\S]*?)\s*<\//i,
        ];

        for (const pattern of descPatterns) {
            const match = html.match(pattern);
            if (match) {
                const raw = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (raw.length > 50 && !raw.includes('Repositorio Institucional') && !raw.includes('Saltar al contenido')) {
                    metadata.abstract = raw;
                    break;
                }
            }
        }
    }

    // Extract handle URL from ALICIA page (link to university repository)
    let repoHandleUrl: string | undefined;
    const handleMatch = html.match(/href="(https?:\/\/hdl\.handle\.net\/[^"]+)"/i) ||
        html.match(/href="(https?&#x3A;&#x2F;&#x2F;hdl\.handle\.net[^"]+)"/i);
    if (handleMatch) {
        repoHandleUrl = handleMatch[1]
            .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    }

    // Also find repo link via handle prefix in embedded URLs
    if (!repoHandleUrl) {
        const repoLink = html.match(/href="(https?:\/\/[^"]*repositori[oa][^"]*\/handle\/[^"]+)"/i);
        if (repoLink) repoHandleUrl = repoLink[1];
    }

    // Extract actual PDF URL (bitstream link from ALICIA page)
    if (!metadata.pdfUrl) {
        const pdfLink = html.match(/href="([^"]*\/bitstream\/[^"]+\.pdf[^"]*)"/i) ||
            html.match(/href="([^"]*\.pdf(?:\?[^"]*)?)"/i);
        if (pdfLink) metadata.pdfUrl = pdfLink[1];
    }

    // Clean abstract
    if (metadata.abstract) metadata.abstract = cleanText(metadata.abstract);

    return { ...metadata, repoHandleUrl };
}
