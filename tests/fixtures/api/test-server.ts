/**
 * tests/fixtures/api/test-server.ts
 *
 * Production Server Test Harness for ZhongXue V2.
 * Owned by Subagent T14 (Independent Production Package Tester).
 *
 * Invariant G6 Enforcement:
 * 1. Directly invokes the real production request handler from server/app.ts.
 * 2. NO fallback mock router: eliminates silent fallback and error swallowing.
 * 3. NO in-memory mock duplex: exercises Node.js real http.Server and http.ClientRequest.
 * 4. Sensitivity guarantee: if server/app.ts or server entry fails, tests turn RED.
 * 5. Clean socket and connection teardown via closeAllConnections().
 */

import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { createAppHandler, type AppRequestHandler } from '../../../server/app.ts';
import { dictionaryEngine } from '../../../server/dictionary.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DIST_DIR = path.resolve(PROJECT_ROOT, 'dist');

export interface TestServerOptions {
  port?: number;
  env?: Record<string, string | undefined>;
  distDir?: string;
  loadDictionary?: boolean;
  customHandler?: AppRequestHandler;
}

export interface RunningTestServer {
  server: http.Server;
  port: number;
  baseUrl: string;
  fetch: (urlOrPath: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
}

/**
 * Creates and starts a conforming test server directly wired to server/app.ts.
 * Guaranteed: NO mock fallback router and NO silent error swallowing!
 */
export async function createTestServer(options: TestServerOptions = {}): Promise<RunningTestServer> {
  const distDir = options.distDir || DIST_DIR;
  const targetPort = options.port ?? 0;

  // Initialize dictionary if requested (default true)
  if (options.loadDictionary !== false && !dictionaryEngine.isReady()) {
    await dictionaryEngine.init();
  }

  // Real production handler creation - throws immediately if server/app.ts is broken
  const appHandler: AppRequestHandler = options.customHandler || createAppHandler({
    distPath: distDir
  });

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    // Directly dispatch to real app handler - NO fallback router!
    appHandler(req, res).catch((err: unknown) => {
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: err instanceof Error ? err.message : 'Server error'
          }
        }));
      }
    });
  });

  const isWindows = process.platform === 'win32';
  const pipePath = isWindows
    ? `\\\\.\\pipe\\zhongxue-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    : path.join(os.tmpdir(), `zhongxue-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`);

  return new Promise((resolve, reject) => {
    server.on('error', reject);

    // Listen on local IPC socket (named pipe on Windows / domain socket on Unix)
    // This allows complete Node.js HTTP/net stack execution in sandboxed environments without EACCES
    server.listen(pipePath, () => {
      const assignedPort = targetPort || 3000;
      const baseUrl = `http://127.0.0.1:${assignedPort}`;

      const testFetch = (urlOrPath: string, init?: RequestInit): Promise<Response> => {
        return new Promise<Response>((resResolve, resReject) => {
          let requestPath = urlOrPath;
          if (requestPath.startsWith('http://') || requestPath.startsWith('https://')) {
            try {
              const parsed = new URL(requestPath);
              requestPath = parsed.pathname + parsed.search;
            } catch {
              // Keep raw string if malformed
            }
          }

          // Escape Unicode/non-ASCII characters for Node http.request while preserving raw percent-encodings
          requestPath = Array.from(requestPath)
            .map((char) => (char.charCodeAt(0) > 127 ? encodeURIComponent(char) : char))
            .join('');

          const method = (init?.method || 'GET').toUpperCase();
          const headers: Record<string, string> = {};

          if (init?.headers) {
            if (init.headers instanceof Headers) {
              init.headers.forEach((v, k) => {
                headers[k.toLowerCase()] = v;
              });
            } else if (Array.isArray(init.headers)) {
              for (const [k, v] of init.headers) {
                headers[k.toLowerCase()] = v;
              }
            } else {
              for (const [k, v] of Object.entries(init.headers)) {
                headers[k.toLowerCase()] = String(v);
              }
            }
          }

          if (!headers['host']) {
            headers['host'] = `127.0.0.1:${assignedPort}`;
          }

          const req = http.request(
            {
              socketPath: pipePath,
              path: requestPath,
              method,
              headers
            },
            (incoming: IncomingMessage) => {
              const bodyChunks: Buffer[] = [];
              incoming.on('data', (chunk: Buffer) => {
                bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              });

              incoming.on('end', () => {
                const bodyBuffer = Buffer.concat(bodyChunks);
                const responseHeaders = new Headers();
                for (const [key, value] of Object.entries(incoming.headers)) {
                  if (Array.isArray(value)) {
                    for (const v of value) responseHeaders.append(key, v);
                  } else if (value !== undefined) {
                    responseHeaders.set(key, String(value));
                  }
                }

                const response = new Response(bodyBuffer, {
                  status: incoming.statusCode || 200,
                  statusText: incoming.statusMessage,
                  headers: responseHeaders
                });

                resResolve(response);
              });

              incoming.on('error', resReject);
            }
          );

          req.on('error', resReject);

          if (init?.body) {
            if (typeof init.body === 'string' || Buffer.isBuffer(init.body)) {
              req.write(init.body);
            } else {
              req.write(String(init.body));
            }
          }

          req.end();
        });
      };

      resolve({
        server,
        port: assignedPort,
        baseUrl,
        fetch: testFetch,
        close: async () => {
          return new Promise((resClose, rejClose) => {
            if (typeof server.closeAllConnections === 'function') {
              server.closeAllConnections();
            }
            server.close((err) => {
              if (err) rejClose(err);
              else resClose();
            });
          });
        }
      });
    });
  });
}
