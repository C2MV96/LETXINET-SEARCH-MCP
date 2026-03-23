/**
 * LETXIPU SEARCH MCP — Standalone Server v3.0.0
 * Academic search + MCP connector + metadata enrichment + PDF reader/analyzer
 * No AI dependencies. Pure script execution.
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
        version: '3.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Root
app.get('/', (_req, res) => {
    res.json({
        name: 'LetXipu Search MCP',
        version: '3.0.0',
        description: 'Academic search + MCP connector + PDF reader/analyzer',
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
╔══════════════════════════════════════════════════════╗
║  🔬 LETXIPU SEARCH MCP — v3.0.0                     ║
║  Running on http://0.0.0.0:${PORT}                     ║
║                                                      ║
║  Endpoints:                                          ║
║    POST /api/search          — Multi-source search   ║
║    POST /api/metadata/enrich — Batch enrichment      ║
║    POST /api/metadata/fetch  — Single paper fetch    ║
║    POST /api/pdf/download    — PDF download          ║
║    POST /api/pdf/read        — PDF text extraction   ║
║    POST /api/pdf/metadata    — PDF metadata          ║
║    POST /api/pdf/sections    — Academic sections     ║
║    POST /api/pdf/citations   — Citation extraction   ║
║    GET  /api/sources         — Source catalog         ║
║    POST /api/mcp             — MCP JSON-RPC 2.0      ║
║    GET  /health              — Health check           ║
╚══════════════════════════════════════════════════════╝
    `);
});

export default app;
