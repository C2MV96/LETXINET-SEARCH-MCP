export interface PaperResult {
    id: string;
    title: string;
    authors: string[];
    year: number | string | null;
    abstract: string;
    pdfUrl: string | null;
    source: string;
    doi: string | null;
    citationCount: number | null;
    university?: string;
    type?: string;
    handleUrl?: string;
    url?: string;
    isUsed?: boolean;
    isEnriched?: boolean;
    enrichedFields?: string[];
    bibtex?: string;
    snippet?: string;
    fullText?: string;
    evidenceLevel?: string;
    completenessScore?: number;
    smartFusionScore?: number;
    metadata?: PaperMetadata;
}

export interface PaperMetadata {
    authors?: string[];
    year?: string | number | null;
    title?: string;
    university?: string;
    pdfUrl?: string | null;
    abstract?: string | null;
    doi?: string | null;
    queries?: string[];
    url?: string;
    [key: string]: unknown;
}

export interface SearchOptions {
    yearStart?: string;
    yearEnd?: string;
    university?: string;
    limit?: number;
    scopusKey?: string;
    semanticKey?: string;
    serpApiKey?: string;
    countryCode?: string;
    coreKey?: string;
    redalycToken?: string;
    fallbackStrategy?: FallbackStrategy;
    model?: string;
    abstractCharLimit?: number;
    onProgress?: (data: { progress?: number; message?: string }) => void;
}

export interface SearchFilters {
    semantic?: boolean;
    openalex?: boolean;
    alicia?: boolean;
    renati?: boolean;
    scopus?: boolean;
    pubmed?: boolean;
    arxiv?: boolean;
    lareferencia?: boolean;
    conacyt?: boolean;
    unam?: boolean;
    anid?: boolean;
    oasisbr?: boolean;
    snrd?: boolean;
    minciencias?: boolean;
    zenodo?: boolean;
    openaire?: boolean;
    doaj?: boolean;
    crossref?: boolean;
    scielo?: boolean;
    core?: boolean;
    redalyc?: boolean;
    // v2: New sources
    dblp?: boolean;
    paperswithcode?: boolean;
    huggingface?: boolean;
    openreview?: boolean;
    [key: string]: boolean | undefined;
}

export interface FallbackStrategy {
    primary: string;
    secondary: string;
}

export interface EnrichmentReport {
    totalAttempted: number;
    recoveredAbstract: number;
    recoveredYear: number;
    recoveredDoi: number;
    recoveredPdf: number;
    recoveredUniversity: number;
    recoveredAuthors: number;
    skipped: number;
    fullyFailed: number;
}

export interface VuFindRecord {
    id?: string;
    title?: string;
    authors?: Record<string, string> | string[] | { primary?: Record<string, string> };
    publicationDates?: string[];
    summary?: string[];
    urls?: Array<string | { url: string; desc?: string }>;
    formats?: string[];
    institutions?: string[];
    country?: string;
    doi?: string;
    dcContributorAuthor?: string[];
    dcContributor?: string[];
    contributor?: string[];
    dcDateIssued?: string[];
    date?: string;
    publisher?: string;
    eu_institution?: string;
}

export interface VuFindResponse {
    resultCount?: number;
    records?: VuFindRecord[];
    status?: string;
}

export interface ScopusEntry {
    'dc:identifier'?: string;
    'dc:title'?: string;
    'dc:creator'?: string;
    'prism:coverDate'?: string;
    'dc:description'?: string;
    'prism:doi'?: string;
    affilname?: string;
}

export interface ScopusResponse {
    'search-results'?: {
        'opensearch:totalResults'?: string;
        entry?: ScopusEntry[];
    };
}

export interface SemanticPaper {
    paperId: string;
    title: string;
    authors?: { name: string }[];
    year?: number;
    abstract?: string;
    openAccessPdf?: { url: string };
    url?: string;
    venue?: string;
    externalIds?: { DOI?: string };
    citationCount?: number;
}

export interface SemanticResponse {
    data?: SemanticPaper[];
    total?: number;
}

export interface OpenAlexWork {
    id: string;
    title: string;
    abstract_inverted_index?: Record<string, number[]>;
    ids?: { doi?: string };
    primary_location?: { landing_page_url?: string };
    publication_year?: number;
    authorships?: { author: { display_name: string }; institutions?: { display_name: string; country_code?: string; type?: string }[] }[];
    type?: string;
    doi?: string;
    cited_by_count?: number;
    open_access?: { is_oa?: boolean; oa_url?: string };
}

export interface OpenAlexResponse {
    results?: OpenAlexWork[];
    meta?: { count?: number };
}

export type SearchResult = PaperResult;
export type HealthStatus = Record<string, { status: 'ONLINE' | 'OFFLINE'; latency: number; error?: string }>;
