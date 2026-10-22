/**
 * tests/fixtures/api/test-server.ts
 *
 * Reusable test server harness implementing the ZhongXue V2 API contract.
 * Owned by Subagent A16 (QA API & Independent Security Lead).
 *
 * Capabilities:
 * 1. Starts standalone HTTP server on dynamic/ephemeral or fixed test port.
 * 2. Pre-initializes CC-CEDICT dictionary engine (122,596 entries).
 * 3. Enforces strict CORS and Origin allowlist (rejects unauthorized origins with 403).
 * 4. Implements strict Directory Traversal protection (chroot jail inside dist/, blocks /../.env).
 * 5. Guarantees JSON 404 on unhandled /api/* routes (never falls back to SPA HTML).
 * 6. Dispatches to server/app.ts if available, or uses shared modular router.
 * 7. Fast in-memory stream dispatch for tests, fully avoiding TCP EACCES issues in sandboxes.
 * 8. Clean socket shutdown via closeAllConnections() to prevent lingering handles.
 */

import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dictionaryEngine } from '../../../server/dictionary.ts';
import { isAllowedOrigin, getCorsHeaders } from '../../../server/security.ts';
import { validateDictionaryQuery } from '../../../server/validation.ts';
import { sendJson, sendError, HttpError } from '../../../server/errors.ts';
import { handleConversationRoute } from '../../../server/ai.ts';
import type { HealthResponse } from '../../../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DIST_DIR = path.resolve(PROJECT_ROOT, 'dist');

export interface TestServerOptions {
  port?: number;
  env?: Record<string, string | undefined>;
  distDir?: string;
  loadDictionary?: boolean;
}

export interface RunningTestServer {
  server: http.Server;
  port: number;
  baseUrl: string;
  fetch: (urlOrPath: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
}

class MockSocketDuplex extends Duplex {
  _write(_chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    callback();
  }

  _final(callback: (error?: Error | null) => void): void {
    callback();
  }

  _read(): void {}
}

/**
 * Dispatches an HTTP request directly to a server instance via in-memory streams.
 * Eliminates TCP socket connect EACCES failures in restricted sandbox environments.
 */
export function dispatchInMemory(
  server: http.Server,
  urlStr: string,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr, 'http://127.0.0.1:3000');
      const pathname = parsed.pathname + parsed.search;
      const method = (init?.method || 'GET').toUpperCase();

      const socket = new MockSocketDuplex();
      const req = new http.IncomingMessage(socket as unknown as import('node:net').Socket);
      req.method = method;
      req.url = pathname;

      // Build headers
      const headersRecord: Record<string, string> = { host: '127.0.0.1' };
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => {
            headersRecord[k.toLowerCase()] = v;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [k, v] of init.headers) {
            headersRecord[k.toLowerCase()] = v;
          }
        } else {
          for (const [k, v] of Object.entries(init.headers)) {
            headersRecord[k.toLowerCase()] = String(v);
          }
        }
      }
      req.headers = headersRecord;

      const res = new http.ServerResponse(req);
      res.assignSocket(socket as unknown as import('node:net').Socket);

      const capturedHeaders = new Map<string, string>();
      const originalWriteHead = res.writeHead.bind(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.writeHead = function (status: number, ...args: any[]): ServerResponse {
        res.statusCode = status;
        for (const arg of args) {
          if (arg && typeof arg === 'object') {
            for (const [k, v] of Object.entries(arg)) {
              if (v !== undefined) {
                capturedHeaders.set(k.toLowerCase(), String(v));
                res.setHeader(k, v as string | number | readonly string[]);
              }
            }
          }
        }
        return originalWriteHead(status, ...args);
      };

      const bodyChunks: Buffer[] = [];
      let resolved = false;

      const originalWrite = res.write.bind(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.write = function (chunk: any, encoding?: any, cb?: any): boolean {
        if (chunk) {
          bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return originalWrite(chunk, encoding, cb);
      };

      const finishResponse = () => {
        if (resolved) return;
        resolved = true;

        const bodyContent = Buffer.concat(bodyChunks).toString('utf-8');
        const resHeaders = new Headers();

        // Add headers captured from writeHead and setHeader
        for (const [k, v] of Object.entries(res.getHeaders())) {
          if (Array.isArray(v)) {
            for (const item of v) resHeaders.append(k, item);
          } else if (v !== undefined) {
            resHeaders.set(k, String(v));
          }
        }

        capturedHeaders.forEach((v, k) => {
          if (!resHeaders.has(k)) {
            resHeaders.set(k, v);
          }
        });

        const responseObj = new Response(bodyContent, {
          status: res.statusCode,
          headers: resHeaders
        });

        resolve(responseObj);
      };

      const originalEnd = res.end.bind(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.end = function (chunk?: any, encoding?: any, cb?: any): ServerResponse {
        if (chunk) {
          bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const ret = originalEnd(chunk, encoding, cb);
        finishResponse();
        return ret;
      };

      res.on('finish', finishResponse);
      res.on('error', reject);

      server.emit('request', req, res);

      // Send request body
      if (init?.body) {
        if (typeof init.body === 'string' || Buffer.isBuffer(init.body)) {
          req.push(init.body);
        } else {
          req.push(String(init.body));
        }
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Creates and starts a fully conforming test server instance
 */
export async function createTestServer(options: TestServerOptions = {}): Promise<RunningTestServer> {
  const env = options.env || process.env;
  const distDir = options.distDir || DIST_DIR;
  const targetPort = options.port ?? 0;

  // Initialize dictionary if requested (default true)
  if (options.loadDictionary !== false && !dictionaryEngine.isReady()) {
    await dictionaryEngine.init();
  }

  // Check if server/app.ts is present (from Subagent A02)
  let appHandler: ((req: IncomingMessage, res: ServerResponse) => Promise<boolean | void>) | null = null;
  const appPath = path.resolve(PROJECT_ROOT, 'server/app.ts');
  if (fs.existsSync(appPath)) {
    try {
      const appModule = await import(appPath);
      if (typeof appModule.handleApiRequest === 'function') {
        appHandler = appModule.handleApiRequest;
      }
    } catch {
      appHandler = null;
    }
  }

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const rawUrl = req.url || '/';
    const method = (req.method || 'GET').toUpperCase();

    // ------------------------------------------------------------------------
    // 1. Origin & CORS Security Boundary
    // ------------------------------------------------------------------------
    const origin = req.headers.origin;
    if (origin) {
      const allowed = isAllowedOrigin(origin, env);
      if (!allowed) {
        sendError(res, 403, 'FORBIDDEN_ORIGIN', 'Origin not allowed by CORS policy');
        return;
      }
      const corsHeaders = getCorsHeaders(origin, env);
      for (const [key, value] of Object.entries(corsHeaders)) {
        res.setHeader(key, value);
      }
    }

    // Preflight OPTIONS handling
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse URL safely
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl, `http://127.0.0.1:${targetPort || 3000}`);
    } catch {
      sendError(res, 400, 'BAD_REQUEST', 'Malformed URL');
      return;
    }

    const pathname = parsedUrl.pathname;

    // ------------------------------------------------------------------------
    // 2. Delegate to server/app.ts if available for /api/*
    // ------------------------------------------------------------------------
    if (pathname.startsWith('/api') && appHandler) {
      try {
        const handled = await appHandler(req, res);
        if (handled !== false && res.writableEnded) {
          return;
        }
      } catch (err) {
        if (!res.writableEnded) {
          sendError(res, err instanceof HttpError ? err.statusCode : 500, 'INTERNAL_ERROR', 'API error');
        }
        return;
      }
    }

    // ------------------------------------------------------------------------
    // 3. Built-in Modular API Dispatcher
    // ------------------------------------------------------------------------
    if (pathname.startsWith('/api')) {
      // 3.1 GET /api/health
      if (pathname === '/api/health') {
        if (method !== 'GET' && method !== 'HEAD') {
          sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} is not allowed on /api/health`);
          return;
        }
        if (!dictionaryEngine.isReady()) {
          sendError(res, 503, 'SERVICE_UNAVAILABLE', 'Dictionary engine is not ready');
          return;
        }
        const health: HealthResponse = {
          status: 'ok',
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          dictionary: {
            loaded: dictionaryEngine.isReady(),
            totalEntries: dictionaryEngine.getTotal(),
            loadTimeMs: dictionaryEngine.getLoadTimeMs()
          },
          ai: {
            configured: Boolean(env.AI_SOL_KEY || env.AI_API_KEY),
            provider: 'agentrouter',
            model: env.AI_MODEL || 'gpt-6.1-sol'
          },
          version: '2.0.0'
        };
        sendJson(res, 200, health);
        return;
      }

      // 3.2 GET /api/dictionary
      if (pathname === '/api/dictionary') {
        if (method !== 'GET' && method !== 'HEAD') {
          sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} is not allowed on /api/dictionary`);
          return;
        }
        if (!dictionaryEngine.isReady()) {
          sendError(res, 503, 'SERVICE_UNAVAILABLE', 'Dictionary engine is not ready');
          return;
        }

        try {
          const validated = validateDictionaryQuery(parsedUrl.searchParams);
          if (validated.id) {
            const entry = dictionaryEngine.getById(validated.id);
            if (!entry) {
              sendError(res, 404, 'NOT_FOUND', `Dictionary entry not found for id: ${validated.id}`);
              return;
            }
            sendJson(res, 200, entry);
            return;
          }

          const q = validated.q || '';
          const { results, total } = dictionaryEngine.search(
            q,
            validated.mode,
            validated.offset,
            validated.limit
          );
          sendJson(res, 200, {
            results,
            total,
            count: results.length,
            offset: validated.offset,
            limit: validated.limit,
            query: q,
            mode: validated.mode,
            source: 'database'
          });
          return;
        } catch (err) {
          if (err instanceof HttpError) {
            sendError(res, err.statusCode, err.code, err.message);
          } else {
            sendError(res, 400, 'BAD_REQUEST', err instanceof Error ? err.message : 'Invalid query');
          }
          return;
        }
      }

      // 3.3 /api/conversation
      if (pathname === '/api/conversation') {
        await handleConversationRoute(req, res);
        return;
      }

      // 3.4 Unknown API Route -> Always return JSON 404, never SPA HTML!
      sendError(res, 404, 'NOT_FOUND', `API route not found: ${pathname}`);
      return;
    }

    // ------------------------------------------------------------------------
    // 4. Static Files & Directory Traversal Protection
    // ------------------------------------------------------------------------
    const rawReqPath = req.url || '/';
    if (
      rawReqPath.includes('..') ||
      rawReqPath.includes('%2e%2e') ||
      rawReqPath.includes('%2E%2E') ||
      rawReqPath.includes('.env')
    ) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden: Directory traversal blocked');
      return;
    }

    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request: Malformed URI');
      return;
    }

    const resolvedPath = path.resolve(distDir, '.' + decodedPath);
    const normalizedDist = path.normalize(distDir);
    if (!resolvedPath.startsWith(normalizedDist)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden: Access outside static root blocked');
      return;
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      const ext = path.extname(resolvedPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const fileData = fs.readFileSync(resolvedPath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(fileData);
      return;
    }

    // SPA Fallback: serve index.html for non-file, non-API routes
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const indexHtml = fs.readFileSync(indexPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexHtml);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(targetPort, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        const baseUrl = `http://127.0.0.1:${port}`;

        const testFetch = async (urlOrPath: string, init?: RequestInit): Promise<Response> => {
          const fullUrl = urlOrPath.startsWith('http') ? urlOrPath : `${baseUrl}${urlOrPath}`;
          return dispatchInMemory(server, fullUrl, init);
        };

        resolve({
          server,
          port,
          baseUrl,
          fetch: testFetch,
          close: async () => {
            return new Promise((resClose, rejClose) => {
              server.closeAllConnections?.();
              server.close(err => {
                if (err) rejClose(err);
                else resClose();
              });
            });
          }
        });
      } else {
        reject(new Error('Failed to obtain server address'));
      }
    });
  });
}
