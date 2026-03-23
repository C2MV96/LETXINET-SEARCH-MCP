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

export function extractMetadataFromHtml(html: string): ScrapedMetadata {
    const metadata: ScrapedMetadata = {
        authors: [], date: null, pdfUrl: null, title: null, university: null, abstract: null
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

            if (['citation_author', 'dc.contributor.author', 'dc.creator', 'author'].includes(name)) {
                const isInvalid = name.includes('advisor') || name.includes('director') ||
                    name.includes('asesor') || name.includes('coordinador');
                if (!isInvalid && !metadata.authors.includes(content) && content.length > 2 && !content.includes('@')) {
                    metadata.authors.push(content);
                }
            }
            if (['citation_date', 'dc.date.issued', 'citation_publication_date', 'date', 'dc.date'].includes(name) && !metadata.date) {
                const yearMatch = content.match(/(\d{4})/);
                if (yearMatch) metadata.date = parseInt(yearMatch[1]);
            }
            if (!metadata.pdfUrl && (
                ['citation_pdf_url', 'eprints.document_url'].includes(name) ||
                (['og:url', 'og:description'].includes(name) && (content.endsWith('.pdf') || content.includes('view/pdf')))
            )) {
                metadata.pdfUrl = content;
            }
            if (!metadata.title && ['citation_title', 'dc.title', 'title', 'og:title'].includes(name)) {
                metadata.title = content;
            }
            if (!metadata.university && ['citation_dissertation_institution', 'dc.publisher', 'publisher', 'institution'].includes(name)) {
                metadata.university = content;
            }
            if (!metadata.abstract && [
                'citation_abstract', 'dc.description.abstract', 'description',
                'og:description', 'dcterms.abstract', 'dcterms.description.abstract', 'dc.description'
            ].includes(name)) {
                if (content.length > 50) metadata.abstract = content;
            }
        }
    }

    if (!metadata.title) {
        const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleTagMatch) {
            const rawTitle = titleTagMatch[1].split('|')[0].trim();
            if (!['DSpace', 'Cybertesis', 'Repositorio'].includes(rawTitle)) {
                metadata.title = rawTitle;
            }
        }
    }

    if (metadata.abstract) metadata.abstract = cleanText(metadata.abstract);
    if (metadata.title) metadata.title = cleanText(metadata.title);
    if (metadata.university) metadata.university = cleanText(metadata.university);
    metadata.authors = metadata.authors.map(a => cleanText(a)).filter(Boolean) as string[];

    return metadata;
}

export async function fetchDSpace7Metadata(
    apiBase: string, handleSuffix: string, universityName: string
): Promise<ScrapedMetadata | null> {
    const apiUrl = `${apiBase}/core/items/findHandle?handle=${handleSuffix}`;
    console.log(`DSpace 7 Detected. Attempting API: ${apiUrl}`);

    try {
        const apiRes = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
        if (!apiRes.ok) return null;

        const item = await apiRes.json() as any;
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

        return metadata;
    } catch (e) {
        console.error("DSpace 7 API failed", e);
        return null;
    }
}

export function extractAliciaMetadata(html: string): ScrapedMetadata & { repoHandleUrl?: string } {
    const metadata = extractMetadataFromHtml(html);

    if (!metadata.abstract || metadata.abstract.length < 50) {
        const descPatterns = [
            /Descripci[oó]n\s+del\s+Art[ií]culo\s*([\s\S]*?)(?:<\/div>|<h[2-5]|<dt|<\/td|Texto\s+completo|<\/section)/i,
            /class="record\s+sourceSolr"[^>]*>[\s\S]*?<\/h[1-3]>\s*([\s\S]*?)(?:<\/div>\s*<div\s+class="record-|<h[2-5]|Texto\s+completo)/i,
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

    let repoHandleUrl: string | undefined;
    const handleMatch = html.match(/href="(https?:\/\/hdl\.handle\.net\/[^"]+)"/i) ||
        html.match(/href="(https?&#x3A;&#x2F;&#x2F;hdl\.handle\.net[^"]+)"/i);
    if (handleMatch) {
        repoHandleUrl = handleMatch[1]
            .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    }
    if (!repoHandleUrl) {
        const repoLink = html.match(/href="(https?:\/\/[^"]*repositori[oa][^"]*\/handle\/[^"]+)"/i);
        if (repoLink) repoHandleUrl = repoLink[1];
    }
    if (!metadata.pdfUrl) {
        const pdfLink = html.match(/href="([^"]*\/bitstream\/[^"]+\.pdf[^"]*)"/i) ||
            html.match(/href="([^"]*\.pdf(?:\?[^"]*)?)"/i);
        if (pdfLink) metadata.pdfUrl = pdfLink[1];
    }
    if (metadata.abstract) metadata.abstract = cleanText(metadata.abstract);

    return { ...metadata, repoHandleUrl };
}
