#!/usr/bin/env node
/**
 * MCP Bridge — stdio <-> HTTP
 * Connects Claude Desktop / Cursor / Antigravity to the LetXipu Search MCP v3 server
 * on HuggingFace Spaces or localhost.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const API_URL = process.env.LETXIPU_URL || process.env.MCP_API_URL || 'http://localhost:4000/api/mcp';
const LOG_FILE = path.join(os.tmpdir(), 'letxipu-mcp-v3-debug.log');

function log(msg) {
    const ts = new Date().toISOString();
    try { fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`); } catch { }
}

log(`Bridge v3 started. API: ${API_URL}`);

// ─── HTTP caller ────────────────────────────────────────────────
function callMcpApi(request) {
    const parsed = new URL(API_URL);
    const body = JSON.stringify(request);

    return new Promise((resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };
        if (process.env.HF_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.HF_TOKEN}`;
        }

        const opts = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers,
            timeout: 180000
        };

        const lib = parsed.protocol === 'https:' ? require('https') : require('http');

        const req = lib.request(opts, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    log(`Parse error (${data.length}B): ${data.substring(0, 300)}`);
                    reject(new Error(`JSON parse error`));
                }
            });
        });

        req.on('error', (e) => { log(`HTTP error: ${e.message}`); reject(e); });
        req.on('timeout', () => { log('HTTP timeout (180s)'); req.destroy(new Error('Timeout')); });
        req.write(body);
        req.end();
    });
}

// ─── Send a JSON-RPC response to stdout ─────────────────────────
function respond(obj) {
    const out = JSON.stringify(obj);
    log(`STDOUT>> ${out.substring(0, 300)}`);
    process.stdout.write(out + '\n');
}

// ─── Handle a single incoming JSON-RPC message ──────────────────
async function handleMessage(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    let msg;
    try {
        msg = JSON.parse(trimmed);
    } catch (e) {
        log(`Bad JSON: ${trimmed.substring(0, 100)}`);
        return;
    }

    const method = msg.method;
    const id = msg.id;

    if (method && (id === undefined || id === null)) {
        log(`-> ${method} [notification, ignored]`);
        return;
    }

    if (method === 'ping') {
        log(`-> ping (id=${id}) [local]`);
        respond({ jsonrpc: '2.0', id, result: {} });
        return;
    }

    log(`-> ${method} (id=${id})`);

    try {
        const response = await callMcpApi(msg);
        log(`<- id=${id} ${response.error ? 'ERR' : 'OK'} (${JSON.stringify(response).length}B)`);
        respond(response);
    } catch (e) {
        log(`!! ${method} error: ${e.message}`);
        respond({
            jsonrpc: '2.0',
            id: id != null ? id : null,
            error: { code: -32603, message: `Bridge error: ${e.message}` }
        });
    }
}

// ─── Read stdin line-by-line ────────────────────────────────────
let buffer = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
        if (line.trim()) {
            handleMessage(line).catch(e => log(`Uncaught in handler: ${e.message}`));
        }
    }
});

process.stdin.on('end', () => {
    log('stdin closed');
    if (buffer.trim()) {
        handleMessage(buffer).catch(() => {});
    }
});

process.on('uncaughtException', (e) => {
    log(`UNCAUGHT: ${e.message}\n${e.stack}`);
    process.exit(1);
});
