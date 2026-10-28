/**
 * tests/fixtures/api/mock-upstream-server.ts
 *
 * Ephemeral mock HTTP server simulating external AI providers or malicious endpoints.
 * Used to verify credential isolation, redirect handling, and leak detection in tests.
 * Supports both TCP listening and transparent in-memory fetch interception for sandboxed environments.
 * Owned by Subagent A16 (QA API & Independent Security Lead).
 */

import http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';

export interface RecordedRequest {
  method: string;
  url: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: string;
  receivedAt: number;
}

export interface MockUpstreamServerOptions {
  redirectTarget?: string;
  simulateErrorStatus?: number;
}

export class MockUpstreamServer {
  private server: http.Server | null = null;
  private port = 0;
  private baseUrl = '';
  private requests: RecordedRequest[] = [];
  private options: MockUpstreamServerOptions;
  private originalFetch: typeof globalThis.fetch | null = null;

  constructor(options: MockUpstreamServerOptions = {}) {
    this.options = options;
  }

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', () => {
          const recorded = this.recordRequest(
            req.method || 'GET',
            req.url || '/',
            req.headers,
            body
          );

          if (recorded.path === '/redirect') {
            const destination = this.options.redirectTarget || '/destination';
            res.writeHead(302, {
              Location: destination,
              'Content-Type': 'text/plain'
            });
            res.end(`Redirecting to ${destination}`);
            return;
          }

          if (this.options.simulateErrorStatus) {
            res.writeHead(this.options.simulateErrorStatus, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Simulated upstream error' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              output: [
                {
                  type: 'message',
                  content: [{ type: 'text', text: '中文：你好！\nPinyin: nǐ hǎo!\nTiếng Việt: Xin chào!' }]
                }
              ],
              choices: [
                {
                  message: {
                    content: '中文：你好！\nPinyin: nǐ hǎo!\nTiếng Việt: Xin chào!'
                  }
                }
              ]
            })
          );
        });
      });

      this.server.on('error', reject);

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          this.baseUrl = `http://127.0.0.1:${this.port}`;

          // Install in-process fetch hook for this mock upstream
          this.installFetchHook();

          resolve(this.baseUrl);
        } else {
          reject(new Error('Failed to obtain ephemeral port'));
        }
      });
    });
  }

  private recordRequest(
    method: string,
    urlStr: string,
    headers: IncomingHttpHeaders,
    body: string
  ): RecordedRequest {
    const parsedPath = urlStr.split('?')[0];
    const recorded: RecordedRequest = {
      method,
      url: urlStr,
      path: parsedPath,
      headers,
      body,
      receivedAt: Date.now()
    };
    this.requests.push(recorded);
    return recorded;
  }

  private installFetchHook(): void {
    if (this.originalFetch) return;
    this.originalFetch = globalThis.fetch;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const targetUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      const isForThisMock = self.baseUrl && targetUrl.startsWith(self.baseUrl);
      const isExternalMock = targetUrl.includes('openrouter.ai') || targetUrl.includes('agentrouter.org');

      if (isForThisMock || isExternalMock) {
        const headersRecord: IncomingHttpHeaders = {};

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

        const method = (init?.method || 'GET').toUpperCase();
        const bodyStr = init?.body ? String(init.body) : '';

        const recorded = self.recordRequest(method, targetUrl, headersRecord, bodyStr);

        if (recorded.path.endsWith('/redirect') || targetUrl.includes('/redirect')) {
          const destination = self.options.redirectTarget || '/destination';
          return new Response(`Redirecting to ${destination}`, {
            status: 302,
            headers: {
              Location: destination,
              'Content-Type': 'text/plain'
            }
          });
        }

        if (self.options.simulateErrorStatus) {
          return new Response(JSON.stringify({ error: 'Simulated upstream error' }), {
            status: self.options.simulateErrorStatus,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [{ type: 'text', text: '中文：你好！\nPinyin: nǐ hǎo!\nTiếng Việt: Xin chào!' }]
              }
            ],
            choices: [
              {
                message: {
                  content: '中文：你好！\nPinyin: nǐ hǎo!\nTiếng Việt: Xin chào!'
                }
              }
            ]
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return self.originalFetch!.call(this, input, init);
    };
  }

  async stop(): Promise<void> {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    return new Promise(resolve => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.closeAllConnections?.();
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getPort(): number {
    return this.port;
  }

  getRecordedRequests(): RecordedRequest[] {
    return [...this.requests];
  }

  clear(): void {
    this.requests = [];
  }

  wasSecretReceived(secret: string): boolean {
    if (!secret) return false;
    for (const req of this.requests) {
      for (const val of Object.values(req.headers)) {
        if (typeof val === 'string' && val.includes(secret)) {
          return true;
        }
        if (Array.isArray(val) && val.some(v => v.includes(secret))) {
          return true;
        }
      }
      if (req.body.includes(secret)) {
        return true;
      }
    }
    return false;
  }

  wasAuthorizationReceived(): boolean {
    return this.requests.some(req => Boolean(req.headers['authorization']));
  }
}
