/**
 * DSpace Repository PDF Extractor
 * Extracts PDF download URLs from DSpace-based institutional repositories.
 * Supports Peruvian universities and any standard DSpace installation.
 * 
 * Flow: handle URL â†’ fetch HTML â†’ parse bitstream link â†’ download PDF
 */

import { resilientFetch } from '../scraping/resilient-fetch';
import { fetchWithTimeout } from '../providers/base';

// â”€â”€â”€ Known DSpace Repositories (PerÃº) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DSpaceRepo {
    name: string;
    domain: string;
    handlePrefix: string;   // e.g., '20.500.12404' for PUCP
    bitstreamPattern: 'standard' | 'bitstream-id';
}

const PERU_DSPACE_REPOS: DSpaceRepo[] = [
    // â”€â”€ Original (13) â”€â”€
    { name: 'PUCP', domain: 'tesis.pucp.edu.pe', handlePrefix: '20.500.12404', bitstreamPattern: 'standard' },
    { name: 'UNMSM', domain: 'cybertesis.unmsm.edu.pe', handlePrefix: '20.500.12672', bitstreamPattern: 'standard' },
    { name: 'UNSA', domain: 'repositorio.unsa.edu.pe', handlePrefix: '20.500.12773', bitstreamPattern: 'standard' },
    { name: 'UNSAAC', domain: 'repositorio.unsaac.edu.pe', handlePrefix: '20.500.12918', bitstreamPattern: 'standard' },
    { name: 'USMP', domain: 'repositorio.usmp.edu.pe', handlePrefix: '20.500.12727', bitstreamPattern: 'standard' },
    { name: 'UContinental', domain: 'repositorio.continental.edu.pe', handlePrefix: '20.500.12394', bitstreamPattern: 'standard' },
    { name: 'UNAC', domain: 'repositorio.unac.edu.pe', handlePrefix: '20.500.12952', bitstreamPattern: 'standard' },
    { name: 'UNCP', domain: 'repositorio.uncp.edu.pe', handlePrefix: '20.500.12894', bitstreamPattern: 'standard' },
    { name: 'UNPRG', domain: 'repositorio.unprg.edu.pe', handlePrefix: '20.500.12893', bitstreamPattern: 'standard' },
    { name: 'USIL', domain: 'repositorio.usil.edu.pe', handlePrefix: 'usil', bitstreamPattern: 'standard' },
    { name: 'UPC', domain: 'repositorioacademico.upc.edu.pe', handlePrefix: '10757', bitstreamPattern: 'standard' },
    { name: 'ULIMA', domain: 'repositorio.ulima.edu.pe', handlePrefix: '20.500.12724', bitstreamPattern: 'standard' },
    { name: 'RENATI', domain: 'renati.sunedu.gob.pe', handlePrefix: 'sunedu', bitstreamPattern: 'standard' },
    // â”€â”€ Auto-discovered batch 1 (8 repos, Jun 2026) â”€â”€
    { name: 'UPN', domain: 'repositorio.upn.edu.pe', handlePrefix: '11537', bitstreamPattern: 'standard' },
    { name: 'UNAS', domain: 'repositorio.unas.edu.pe', handlePrefix: 'UNAS', bitstreamPattern: 'standard' },
    { name: 'UNAMBA', domain: 'repositorio.unamba.edu.pe', handlePrefix: 'UNAMBA', bitstreamPattern: 'standard' },
    { name: 'ESAN', domain: 'repositorio.esan.edu.pe', handlePrefix: '20.500.12640', bitstreamPattern: 'standard' },
    { name: 'UP', domain: 'repositorio.up.edu.pe', handlePrefix: '11354', bitstreamPattern: 'standard' },
    { name: 'UTEC', domain: 'repositorio.utec.edu.pe', handlePrefix: '20.500.12816', bitstreamPattern: 'standard' },
    { name: 'UARM', domain: 'repositorio.uarm.edu.pe', handlePrefix: '20.500.12833', bitstreamPattern: 'standard' },
    { name: 'UCSP', domain: 'repositorio.ucsp.edu.pe', handlePrefix: '20.500.12590', bitstreamPattern: 'standard' },
    // â”€â”€ Auto-discovered batch 2 â€” Nacionales (49 repos, Jun 2026) â”€â”€
    { name: 'UNFV', domain: 'repositorio.unfv.edu.pe', handlePrefix: 'UNFV', bitstreamPattern: 'standard' },
    { name: 'UNALM', domain: 'repositorio.lamolina.edu.pe', handlePrefix: 'UNALM', bitstreamPattern: 'standard' },
    { name: 'UNDAC', domain: 'repositorio.undac.edu.pe', handlePrefix: 'UNDAC', bitstreamPattern: 'standard' },
    { name: 'UNCajamarca', domain: 'repositorio.unc.edu.pe', handlePrefix: 'UNC', bitstreamPattern: 'standard' },
    { name: 'UNHEVAL', domain: 'repositorio.unheval.edu.pe', handlePrefix: 'UNHEVAL', bitstreamPattern: 'standard' },
    { name: 'UNJFSC', domain: 'repositorio.unjfsc.edu.pe', handlePrefix: 'UNJFSC', bitstreamPattern: 'standard' },
    { name: 'UNTRM', domain: 'repositorio.untrm.edu.pe', handlePrefix: 'UNTRM', bitstreamPattern: 'standard' },
    { name: 'UNIA', domain: 'repositorio.unia.edu.pe', handlePrefix: 'UNIA', bitstreamPattern: 'standard' },
    { name: 'UNICA', domain: 'repositorio.unica.edu.pe', handlePrefix: 'UNICA', bitstreamPattern: 'standard' },
    { name: 'UNBarranca', domain: 'repositorio.unab.edu.pe', handlePrefix: 'UNAB', bitstreamPattern: 'standard' },
    { name: 'UNCanete', domain: 'repositorio.undc.edu.pe', handlePrefix: 'UNDC', bitstreamPattern: 'standard' },
    { name: 'UNFrontera', domain: 'repositorio.unf.edu.pe', handlePrefix: 'UNF', bitstreamPattern: 'standard' },
    { name: 'UNJuliaca', domain: 'repositorio.unaj.edu.pe', handlePrefix: 'UNAJ', bitstreamPattern: 'standard' },
    { name: 'UNChota', domain: 'repositorio.unach.edu.pe', handlePrefix: 'UNACH', bitstreamPattern: 'standard' },
    { name: 'UNHuanta', domain: 'repositorio.unah.edu.pe', handlePrefix: 'UNAH', bitstreamPattern: 'standard' },
    { name: 'UNMusica', domain: 'repositorio.unm.edu.pe', handlePrefix: 'UNM', bitstreamPattern: 'standard' },
    { name: 'UNAMAD', domain: 'repositorio.unamad.edu.pe', handlePrefix: 'UNAMAD', bitstreamPattern: 'standard' },
    { name: 'UNSM', domain: 'repositorio.unsm.edu.pe', handlePrefix: 'UNSM', bitstreamPattern: 'standard' },
    { name: 'UNSanta', domain: 'repositorio.uns.edu.pe', handlePrefix: 'UNS', bitstreamPattern: 'standard' },
    { name: 'UNPiura', domain: 'repositorio.unp.edu.pe', handlePrefix: 'UNP', bitstreamPattern: 'standard' },
    // â”€â”€ Auto-discovered batch 2 â€” Privadas â”€â”€
    { name: 'UCSM', domain: 'repositorio.ucsm.edu.pe', handlePrefix: '20.500.12920', bitstreamPattern: 'standard' },
    { name: 'UCV', domain: 'repositorio.ucv.edu.pe', handlePrefix: 'UCV', bitstreamPattern: 'standard' },
    { name: 'UPAO', domain: 'repositorio.upao.edu.pe', handlePrefix: 'UPAO', bitstreamPattern: 'standard' },
    { name: 'ULADECH', domain: 'repositorio.uladech.edu.pe', handlePrefix: 'ULADECH', bitstreamPattern: 'standard' },
    { name: 'UPLA', domain: 'repositorio.upla.edu.pe', handlePrefix: 'UPLA', bitstreamPattern: 'standard' },
    { name: 'USS', domain: 'repositorio.uss.edu.pe', handlePrefix: 'USS', bitstreamPattern: 'standard' },
    { name: 'URP', domain: 'repositorio.urp.edu.pe', handlePrefix: 'URP', bitstreamPattern: 'standard' },
    { name: 'UAP', domain: 'repositorio.uap.edu.pe', handlePrefix: 'UAP', bitstreamPattern: 'standard' },
    { name: 'USAT', domain: 'repositorio.usat.edu.pe', handlePrefix: 'USAT', bitstreamPattern: 'standard' },
    { name: 'UAndina', domain: 'repositorio.uandina.edu.pe', handlePrefix: 'UAndina', bitstreamPattern: 'standard' },
    { name: 'UCSS', domain: 'repositorio.ucss.edu.pe', handlePrefix: 'UCSS', bitstreamPattern: 'standard' },
    { name: 'USanPedro', domain: 'repositorio.usanpedro.edu.pe', handlePrefix: 'USanPedro', bitstreamPattern: 'standard' },
    { name: 'UCientifica', domain: 'repositorio.cientifica.edu.pe', handlePrefix: 'UCientifica', bitstreamPattern: 'standard' },
    { name: 'UPeU', domain: 'repositorio.upeu.edu.pe', handlePrefix: 'UPeU', bitstreamPattern: 'standard' },
    { name: 'UNIFE', domain: 'repositorio.unife.edu.pe', handlePrefix: 'UNIFE', bitstreamPattern: 'standard' },
    { name: 'UIGV', domain: 'repositorio.uigv.edu.pe', handlePrefix: 'UIGV', bitstreamPattern: 'standard' },
    { name: 'NorbertWiener', domain: 'repositorio.uwiener.edu.pe', handlePrefix: 'UWiener', bitstreamPattern: 'standard' },
    { name: 'UPSJB', domain: 'repositorio.upsjb.edu.pe', handlePrefix: 'UPSJB', bitstreamPattern: 'standard' },
    { name: 'UDH', domain: 'repositorio.udh.edu.pe', handlePrefix: 'UDH', bitstreamPattern: 'standard' },
    { name: 'UTEA', domain: 'repositorio.utea.edu.pe', handlePrefix: 'UTEA', bitstreamPattern: 'standard' },
    { name: 'UAustral', domain: 'repositorio.uaustral.edu.pe', handlePrefix: 'UAustral', bitstreamPattern: 'standard' },
    { name: 'UPCH', domain: 'repositorio.upch.edu.pe', handlePrefix: '20.500.12866', bitstreamPattern: 'standard' },
    { name: 'UCH', domain: 'repositorio.uch.edu.pe', handlePrefix: 'UCH', bitstreamPattern: 'standard' },
    { name: 'LeCordonBleu', domain: 'repositorio.ulcb.edu.pe', handlePrefix: 'ULCB', bitstreamPattern: 'standard' },
    { name: 'Champagnat', domain: 'repositorio.umch.edu.pe', handlePrefix: 'UMCH', bitstreamPattern: 'standard' },
    { name: 'MariaAuxiliadora', domain: 'repositorio.uma.edu.pe', handlePrefix: 'UMA', bitstreamPattern: 'standard' },
    { name: 'UDesarrolloAndino', domain: 'repositorio.udea.edu.pe', handlePrefix: 'UDEA', bitstreamPattern: 'standard' },
    { name: 'PeruanoCentro', domain: 'repositorio.upecen.edu.pe', handlePrefix: 'UPECEN', bitstreamPattern: 'standard' },
    { name: 'LaSalle', domain: 'repositorio.ulasalle.edu.pe', handlePrefix: 'ULaSalle', bitstreamPattern: 'standard' },
    { name: 'UPrivadaTrujillo', domain: 'repositorio.uprit.edu.pe', handlePrefix: 'UPRIT', bitstreamPattern: 'standard' },
    // â”€â”€ Government / Institutes â”€â”€
    { name: 'IMARPE', domain: 'repositorio.imarpe.gob.pe', handlePrefix: 'IMARPE', bitstreamPattern: 'standard' },
    { name: 'INGEMMET', domain: 'repositorio.ingemmet.gob.pe', handlePrefix: 'INGEMMET', bitstreamPattern: 'standard' },
    { name: 'IEP', domain: 'repositorio.iep.org.pe', handlePrefix: 'IEP', bitstreamPattern: 'standard' },
    { name: 'IIAP', domain: 'repositorio.iiap.gob.pe', handlePrefix: 'IIAP', bitstreamPattern: 'standard' },
    { name: 'IPEN', domain: 'repositorio.ipen.gob.pe', handlePrefix: 'IPEN', bitstreamPattern: 'standard' },
    { name: 'INDECOPI', domain: 'repositorio.indecopi.gob.pe', handlePrefix: 'INDECOPI', bitstreamPattern: 'standard' },
    { name: 'MINEDU', domain: 'repositorio.minedu.gob.pe', handlePrefix: 'MINEDU', bitstreamPattern: 'standard' },
    { name: 'MINCULTURA', domain: 'repositorio.cultura.gob.pe', handlePrefix: 'CULTURA', bitstreamPattern: 'standard' },
    { name: 'Toulouse', domain: 'repositorio.tls.edu.pe', handlePrefix: 'TLS', bitstreamPattern: 'standard' },
    // -- ARGENTINA (auto-discovered Jun. 2026) --
    { name: 'UBA-SISBI', domain: 'repositoriouba.sisbi.uba.ar', handlePrefix: 'UBA-SISBI', bitstreamPattern: 'standard' },
    { name: 'CLACSO', domain: 'biblioteca-repositorio.clacso.edu.ar', handlePrefix: 'CLACSO', bitstreamPattern: 'standard' },
    { name: 'SciELO-Argentina', domain: 'www.scielo.org.ar', handlePrefix: 'SCIELO-ARGENTINA', bitstreamPattern: 'standard' },
    { name: 'UNC-Cordoba', domain: 'rdu.unc.edu.ar', handlePrefix: 'UNC-CORDOBA', bitstreamPattern: 'standard' },
    { name: 'UNLP-LaPlata', domain: 'sedici.unlp.edu.ar', handlePrefix: 'UNLP-LAPLATA', bitstreamPattern: 'standard' },
    { name: 'UNL-SantaFe', domain: 'bibliotecavirtual.unl.edu.ar', handlePrefix: 'UNL-SANTAFE', bitstreamPattern: 'standard' },
    { name: 'UNCuyo', domain: 'bdigital.uncu.edu.ar', handlePrefix: 'UNCUYO', bitstreamPattern: 'standard' },
    { name: 'UTN', domain: 'ria.utn.edu.ar', handlePrefix: 'UTN', bitstreamPattern: 'standard' },
    { name: 'UNS-BahiaBlanca', domain: 'repositoriodigital.uns.edu.ar', handlePrefix: 'UNS-BAHIABLANCA', bitstreamPattern: 'standard' },
    { name: 'INTA', domain: 'repositorio.inta.gob.ar', handlePrefix: 'INTA', bitstreamPattern: 'standard' },
    // -- CHILE (auto-discovered Jun. 2026) --
    { name: 'UChile', domain: 'repositorio.uchile.cl', handlePrefix: 'UCHILE', bitstreamPattern: 'standard' },
    { name: 'USACH', domain: 'repositorio.usach.cl', handlePrefix: 'USACH', bitstreamPattern: 'standard' },
    { name: 'UdeC', domain: 'repositorio.udec.cl', handlePrefix: 'UDEC', bitstreamPattern: 'standard' },
    { name: 'UAI', domain: 'repositorio.uai.cl', handlePrefix: 'UAI', bitstreamPattern: 'standard' },
    { name: 'UDP', domain: 'repositorio.udp.cl', handlePrefix: 'UDP', bitstreamPattern: 'standard' },
    { name: 'UCN', domain: 'repositorio.ucn.cl', handlePrefix: 'UCN', bitstreamPattern: 'standard' },
    { name: 'UBB', domain: 'repositorio.ubiobio.cl', handlePrefix: 'UBB', bitstreamPattern: 'standard' },
    { name: 'UTEM', domain: 'repositorio.utem.cl', handlePrefix: 'UTEM', bitstreamPattern: 'standard' },
    // -- COLOMBIA (auto-discovered Jun. 2026) --
    { name: 'UNAL', domain: 'repositorio.unal.edu.co', handlePrefix: 'UNAL', bitstreamPattern: 'standard' },
    { name: 'UniAndes', domain: 'repositorio.uniandes.edu.co', handlePrefix: 'UNIANDES', bitstreamPattern: 'standard' },
    { name: 'UdeA', domain: 'bibliotecadigital.udea.edu.co', handlePrefix: 'UDEA', bitstreamPattern: 'standard' },
    { name: 'UIS', domain: 'noesis.uis.edu.co', handlePrefix: 'UIS', bitstreamPattern: 'standard' },
    { name: 'UniValle', domain: 'bibliotecadigital.univalle.edu.co', handlePrefix: 'UNIVALLE', bitstreamPattern: 'standard' },
    { name: 'UPB', domain: 'repository.upb.edu.co', handlePrefix: 'UPB', bitstreamPattern: 'standard' },
    { name: 'EAFIT', domain: 'repository.eafit.edu.co', handlePrefix: 'EAFIT', bitstreamPattern: 'standard' },
    { name: 'UniNorte', domain: 'manglar.uninorte.edu.co', handlePrefix: 'UNINORTE', bitstreamPattern: 'standard' },
    { name: 'UTP', domain: 'repositorio.utp.edu.co', handlePrefix: 'UTP', bitstreamPattern: 'standard' },
    { name: 'UniCartagena', domain: 'repositorio.unicartagena.edu.co', handlePrefix: 'UNICARTAGENA', bitstreamPattern: 'standard' },
    { name: 'USabana', domain: 'intellectum.unisabana.edu.co', handlePrefix: 'USABANA', bitstreamPattern: 'standard' },
    { name: 'MinCiencias', domain: 'repositorio.minciencias.gov.co', handlePrefix: 'MINCIENCIAS', bitstreamPattern: 'standard' },
    // -- ECUADOR (auto-discovered Jun. 2026) --
    { name: 'RRAAE', domain: 'rraae.cedia.edu.ec', handlePrefix: 'RRAAE', bitstreamPattern: 'standard' },
    { name: 'ESPOL', domain: 'www.dspace.espol.edu.ec', handlePrefix: 'ESPOL', bitstreamPattern: 'standard' },
    { name: 'UCE', domain: 'www.dspace.uce.edu.ec', handlePrefix: 'UCE', bitstreamPattern: 'standard' },
    { name: 'UTPL', domain: 'dspace.utpl.edu.ec', handlePrefix: 'UTPL', bitstreamPattern: 'standard' },
    { name: 'USFQ', domain: 'repositorio.usfq.edu.ec', handlePrefix: 'USFQ', bitstreamPattern: 'standard' },
    { name: 'UTN', domain: 'repositorio.utn.edu.ec', handlePrefix: 'UTN', bitstreamPattern: 'standard' },
    { name: 'UCSG', domain: 'repositorio.ucsg.edu.ec', handlePrefix: 'UCSG', bitstreamPattern: 'standard' },
    { name: 'UNACH', domain: 'dspace.unach.edu.ec', handlePrefix: 'UNACH', bitstreamPattern: 'standard' },
    // -- MEXICO (auto-discovered Jun. 2026) --
    { name: 'UNAM', domain: 'repositorio.unam.mx', handlePrefix: 'UNAM', bitstreamPattern: 'standard' },
    { name: 'SciELO-Mexico', domain: 'www.scielo.org.mx', handlePrefix: 'SCIELO-MEXICO', bitstreamPattern: 'standard' },
    { name: 'Redalyc', domain: 'www.redalyc.org', handlePrefix: 'REDALYC', bitstreamPattern: 'standard' },
    { name: 'UAM', domain: 'zaloamati.azc.uam.mx', handlePrefix: 'UAM', bitstreamPattern: 'standard' },
    { name: 'COLMEX', domain: 'repositorio.colmex.mx', handlePrefix: 'COLMEX', bitstreamPattern: 'standard' },
    { name: 'UV', domain: 'cdigital.uv.mx', handlePrefix: 'UV', bitstreamPattern: 'standard' },
    { name: 'UADY', domain: 'repositorio.uady.mx', handlePrefix: 'UADY', bitstreamPattern: 'standard' },
    { name: 'UIA', domain: 'repositorio.uia.mx', handlePrefix: 'UIA', bitstreamPattern: 'standard' },
    { name: 'CIESAS', domain: 'repositorio.ciesas.edu.mx', handlePrefix: 'CIESAS', bitstreamPattern: 'standard' },
    { name: 'COLEF', domain: 'www.colef.mx', handlePrefix: 'COLEF', bitstreamPattern: 'standard' },
    // -- PERU (auto-discovered Jun. 2026) --
    { name: 'UANCV', domain: 'repositorio.uancv.edu.pe', handlePrefix: 'UANCV', bitstreamPattern: 'standard' },
    { name: 'UNSCH', domain: 'repositorio.unsch.edu.pe', handlePrefix: 'UNSCH', bitstreamPattern: 'standard' },
    { name: 'UNJBG-Tacna', domain: 'repositorio.unjbg.edu.pe', handlePrefix: 'UNJBG-TACNA', bitstreamPattern: 'standard' },
    { name: 'UNASAM', domain: 'repositorio.unasam.edu.pe', handlePrefix: 'UNASAM', bitstreamPattern: 'standard' },
];

// â”€â”€â”€ URL Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Check if a URL is from a known DSpace repository
 */
export function isDSpaceUrl(url: string): DSpaceRepo | null {
    try {
        const parsed = new URL(url);
        const domain = parsed.hostname;
        
        // Check known repos
        const known = PERU_DSPACE_REPOS.find(r => domain.includes(r.domain));
        if (known) return known;
        
        // Generic DSpace detection: URL contains /handle/ or /bitstream/
        if (url.includes('/handle/') || url.includes('/bitstream/')) {
            return {
                name: domain.split('.')[0],
                domain,
                handlePrefix: '',
                bitstreamPattern: 'standard',
            };
        }
        
        return null;
    } catch {
        return null;
    }
}

// â”€â”€â”€ PDF Link Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Extract PDF bitstream URL from a DSpace handle page HTML
 * 
 * DSpace pages typically contain links like:
 * - /bitstream/handle/20.500.12404/17080/filename.pdf
 * - /bitstream/20.500.12404/17080/1/filename.pdf
 * - /bitstream/handle/20.500.12404/17080/filename.pdf?sequence=1
 */
function extractBitstreamUrls(html: string, baseUrl: string): string[] {
    const urls: string[] = [];
    
    // Pattern 1: Standard DSpace bitstream links
    const bitstreamRegex = /href\s*=\s*["']([^"']*bitstream[^"']*\.pdf[^"']*)["']/gi;
    let match;
    while ((match = bitstreamRegex.exec(html)) !== null) {
        let href = match[1];
        // Make absolute URL
        if (href.startsWith('/')) {
            const parsed = new URL(baseUrl);
            href = `${parsed.protocol}//${parsed.host}${href}`;
        } else if (!href.startsWith('http')) {
            href = new URL(href, baseUrl).href;
        }
        urls.push(href);
    }
    
    // Pattern 2: Generic PDF links on the page
    const pdfRegex = /href\s*=\s*["']([^"']*\.pdf[^"']*)["']/gi;
    while ((match = pdfRegex.exec(html)) !== null) {
        let href = match[1];
        if (href.startsWith('/')) {
            const parsed = new URL(baseUrl);
            href = `${parsed.protocol}//${parsed.host}${href}`;
        } else if (!href.startsWith('http')) {
            href = new URL(href, baseUrl).href;
        }
        // Avoid duplicates
        if (!urls.includes(href)) {
            urls.push(href);
        }
    }
    
    // Pattern 3: DSpace REST API bitstream links (newer DSpace versions)
    const restRegex = /href\s*=\s*["']([^"']*\/api\/core\/bitstreams\/[^"']*content[^"']*)["']/gi;
    while ((match = restRegex.exec(html)) !== null) {
        let href = match[1];
        if (href.startsWith('/')) {
            const parsed = new URL(baseUrl);
            href = `${parsed.protocol}//${parsed.host}${href}`;
        }
        if (!urls.includes(href)) {
            urls.push(href);
        }
    }
    
    return urls;
}

// â”€â”€â”€ PDF Download â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Attempt to download a PDF from a bitstream URL
 * Returns the PDF buffer if successful, null otherwise
 */
async function downloadBitstream(url: string): Promise<Buffer | null> {
    try {
        console.log(`[DSpace] Downloading: ${url.substring(0, 80)}...`);
        const response = await fetchWithTimeout(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Accept': 'application/pdf,*/*',
                'Referer': new URL(url).origin,
            },
            redirect: 'follow',
        }, 20000);
        
        if (!response.ok) {
            console.warn(`[DSpace] HTTP ${response.status} for ${url.substring(0, 60)}`);
            return null;
        }
        
        const contentType = response.headers.get('content-type') || '';
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Verify it's actually a PDF
        if (buffer.length < 100) {
            console.warn(`[DSpace] Response too small (${buffer.length} bytes)`);
            return null;
        }
        
        // Check PDF magic bytes
        const header = buffer.subarray(0, 5).toString('ascii');
        if (header === '%PDF-') {
            console.log(`[DSpace] âœ… PDF downloaded: ${(buffer.length / 1024).toFixed(0)}KB`);
            return buffer;
        }
        
        // Some servers return PDF with wrong Content-Type
        if (buffer.length > 10000 && contentType.includes('pdf')) {
            console.log(`[DSpace] âœ… PDF (by content-type): ${(buffer.length / 1024).toFixed(0)}KB`);
            return buffer;
        }
        
        console.warn(`[DSpace] Not a PDF: ${contentType}, header=${header}`);
        return null;
    } catch (e: any) {
        console.warn(`[DSpace] Download error: ${e.message}`);
        return null;
    }
}

// â”€â”€â”€ Main Resolver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Resolve a DSpace handle URL to a downloadable PDF buffer
 * 
 * Steps:
 * 1. Fetch the handle page HTML
 * 2. Parse out bitstream/PDF links
 * 3. Try downloading each PDF link
 * 4. Return first successful download
 */
export async function resolveDSpacePdf(url: string): Promise<{ buffer: Buffer; repo: string } | null> {
    const repo = isDSpaceUrl(url);
    if (!repo) return null;
    
    console.log(`[DSpace] Resolving ${repo.name}: ${url.substring(0, 80)}`);
    
    try {
        // Step 1: Fetch the handle page
        const { html } = await resilientFetch(url, 2, 12000);
        
        if (!html || html.length < 500) {
            console.warn(`[DSpace] Empty or too short response from ${repo.name}`);
            return null;
        }
        
        // Step 2: Extract bitstream URLs
        const bitstreamUrls = extractBitstreamUrls(html, url);
        
        if (bitstreamUrls.length === 0) {
            console.warn(`[DSpace] No PDF links found on ${repo.name} page`);
            
            // Try constructing bitstream URL from handle
            const handleMatch = url.match(/handle\/([^/?]+\/[^/?]+)/);
            if (handleMatch) {
                const handleId = handleMatch[1];
                const parsed = new URL(url);
                const constructedUrl = `${parsed.protocol}//${parsed.host}/bitstream/handle/${handleId}/1/Tesis.pdf`;
                console.log(`[DSpace] Trying constructed URL: ${constructedUrl}`);
                bitstreamUrls.push(constructedUrl);
            }
        }
        
        console.log(`[DSpace] Found ${bitstreamUrls.length} potential PDF links from ${repo.name}`);
        
        // Step 3: Try downloading each PDF
        for (const pdfUrl of bitstreamUrls.slice(0, 5)) { // Limit to 5 attempts
            const buffer = await downloadBitstream(pdfUrl);
            if (buffer) {
                return { buffer, repo: repo.name };
            }
        }
        
        console.warn(`[DSpace] No downloadable PDF found from ${repo.name}`);
        return null;
    } catch (e: any) {
        console.warn(`[DSpace] Error resolving ${repo.name}: ${e.message}`);
        return null;
    }
}

/**
 * Check if a URL matches any known Peruvian DSpace repository
 */
export function isPeruDSpaceUrl(url: string): boolean {
    return PERU_DSPACE_REPOS.some(r => url.includes(r.domain));
}

/**
 * List all known Peruvian DSpace repositories
 */
export function listPeruRepos(): { name: string; domain: string }[] {
    return PERU_DSPACE_REPOS.map(r => ({ name: r.name, domain: r.domain }));
}
