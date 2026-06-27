/**
 * LETXIPU SEARCH MCP - Standalone Server v7.0.0
 * Batch-first academic search + MCP connector + metadata enrichment + multi-format document converter
 * MinerU AI integration (PDF/DOCX/PPTX/XLSX/IMG → Markdown), OCR 109 languages, 27 tools
 * No Python/GPU dependencies. Cloud API via mineru.net.
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import searchRouter from './routes/search';
import metadataRouter from './routes/metadata';
import pdfDownloadRouter from './routes/pdf';
import pdfReaderRouter from './routes/pdf-reader';
import sourcesRouter from './routes/sources';
import mcpRouter from './routes/mcp';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/search', searchRouter);
app.use('/api/metadata', metadataRouter);
app.use('/api/pdf/download', pdfDownloadRouter);
app.use('/api/pdf', pdfReaderRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/mcp', mcpRouter);

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'letxipu-search-mcp',
        version: '7.0.0',
        tools: 27,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Root
app.get('/', (_req, res) => {
    res.json({
        name: 'LetXipu Search MCP',
        version: '7.0.0',
        description: 'Batch-first academic search + MCP connector + MinerU AI multi-format document converter + 27 tools',
        tools: 27,
        documentFormats: ['pdf', 'docx', 'pptx', 'xlsx', 'png', 'jpg', 'tiff'],
        endpoints: {
            search: 'POST /api/search',
            enrich: 'POST /api/metadata/enrich',
            fetch: 'POST /api/metadata/fetch',
            pdfDownload: 'POST /api/pdf/download',
            pdfRead: 'POST /api/pdf/read',
            pdfMetadata: 'POST /api/pdf/metadata',
            pdfSections: 'POST /api/pdf/sections',
            pdfCitations: 'POST /api/pdf/citations',
            sources: 'GET /api/sources',
            mcp: 'POST /api/mcp',
            health: 'GET /health'
        }
    });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔬 LETXIPU SEARCH MCP — v7.0.0                            ║
║  Running on http://0.0.0.0:${PORT}                            ║
║  27 MCP tools · 32+ sources · MinerU AI · multi-format      ║
║                                                              ║
║  NEW in v7:                                                  ║
║    🧠 MinerU AI — PDF/DOCX/PPTX/XLSX/IMG → Markdown         ║
║    📊 Table extraction (ML-based)                            ║
║    📐 Formula → LaTeX extraction                             ║
║    🔤 OCR 109 languages                                      ║
║    🚫 No Python/GPU required (cloud API)                     ║
║                                                              ║
║  Endpoints:                                                  ║
║    POST /api/search          — Multi-source search           ║
║    POST /api/metadata/enrich — Batch enrichment              ║
║    POST /api/metadata/fetch  — Single paper fetch            ║
║    POST /api/pdf/download    — PDF download                  ║
║    POST /api/pdf/read        — PDF text extraction           ║
║    POST /api/pdf/metadata    — PDF metadata                  ║
║    POST /api/pdf/sections    — Academic sections             ║
║    POST /api/pdf/citations   — Citation extraction           ║
║    GET  /api/sources         — Source catalog                ║
║    POST /api/mcp             — MCP JSON-RPC 2.0             ║
║    GET  /health              — Health check                  ║
╚══════════════════════════════════════════════════════════════╝
    `);

    // V7: Check document conversion availability
    import('./providers/mineru-client').then(async (mc) => {
        const health = await mc.checkMineruHealth();
        if (process.env.MINERU_API_KEY) {
            console.log(`🧠 MinerU API: ${health.available ? '✅' : '⚠️'} ${health.mode} mode`);
            console.log(`   URL: ${health.apiUrl}`);
            console.log(`   Formats: ${health.supportedFormats.join(', ')}`);
        } else {
            console.log(`🧠 MinerU API: ⚠️ No MINERU_API_KEY configured`);
        }
        // Check MarkItDown fallback
        try {
            const mdc = require('./providers/markitdown-client');
            const pyAvail = await mdc.isPythonAvailable();
            console.log(`📄 MarkItDown (pymupdf4llm): ${pyAvail ? '✅ Available (PDF fallback)' : '⚠️ Python not found'}`);
            if (!pyAvail && !process.env.MINERU_API_KEY) {
                console.log(`   💡 Set MINERU_API_KEY for multi-format support, or install Python + pymupdf4llm for PDF fallback`);
                console.log(`   📦 Last resort: pdf-parse (basic text extraction)`);
            }
        } catch {
            console.log(`📄 MarkItDown: ⚠️ Module not loaded`);
        }
    }).catch(() => {
        console.log('🧠 MinerU: ⚠️ Module not loaded');
    });
});

export default app;
