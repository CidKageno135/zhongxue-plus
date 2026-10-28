/**
 * tests/fixtures/ai-http/fake-upstream.ts
 *
 * Mock upstream AI provider server listening on local TCP loopback.
 * Used for independent acceptance testing of HTTP lifecycle, cancellation, and validation.
 * Owned by Subagent T11 (Independent HTTP/AI Tester).
 */

import http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';

export interface UpstreamRecordedRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
  aborted: boolean;
  receivedAt: number;
}

export interface FakeUpstreamResponseConfig {
  statusCode?: number;
  body?: string | Record<string, unknown> | null;
  delayMs?: number;
  headers?: Record<string, string>;
}

export class FakeUpstreamServer {
  private server: http.Server | null = null;
  private port = 0;
  private baseUrl = '';
  private requests: UpstreamRecordedRequest[] = [];
  private responseConfig: FakeUpstreamResponseConfig = {
    statusCode: 200,
    body: {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '中文：你好！\nPinyin: nǐ hǎo!\nTiếng Việt: Xin chào!\n練習：跟我念'
          }
        }
      ]
    }
  };

  private abortListeners: Array<() => void> = [];
  private requestListeners: Array<(req: UpstreamRecordedRequest) => void> = [];

  constructor(initialConfig?: FakeUpstreamResponseConfig) {
    if (initialConfig) {
      this.responseConfig = { ...this.responseConfig, ...initialConfig };
    }
  }

  setResponse(config: FakeUpstreamResponseConfig): void {
    this.responseConfig = { ...config };
  }

  async start(): Promise<{ port: number; baseUrl: string }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let body = '';
        let wasAborted = false;

        const currentReq: UpstreamRecordedRequest = {
          method: req.method || 'GET',
          url: req.url || '/',
          headers: req.headers,
          body: '',
          aborted: false,
          receivedAt: Date.now()
        };
        this.requests.push(currentReq);

        req.on('data', chunk => {
          body += chunk;
        });

        const markAborted = () => {
          if (!res.writableFinished && !res.writableEnded) {
            wasAborted = true;
            currentReq.aborted = true;
            for (const listener of this.abortListeners) {
              listener();
            }
          }
        };

        // In Node.js HTTP servers, premature client disconnection while waiting
        // for response is detected via res.on('close') when !res.writableFinished && !res.writableEnded
        res.on('close', markAborted);

        req.on('end', () => {
          currentReq.body = body;
          for (const listener of this.requestListeners) {
            listener(currentReq);
          }

          const {
            statusCode = 200,
            body: respBody = '',
            delayMs = 0,
            headers: customHeaders = {}
          } = this.responseConfig;

          const send = () => {
            if (res.writableEnded || res.writableFinished || wasAborted) {
              return;
            }

            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              ...customHeaders
            };

            res.writeHead(statusCode, headers);
            if (respBody === null || respBody === undefined) {
              res.end('');
            } else if (typeof respBody === 'string') {
              res.end(respBody);
            } else {
              res.end(JSON.stringify(respBody));
            }
          };

          if (delayMs > 0) {
            const timer = setTimeout(send, delayMs);
            res.on('close', () => {
              if (!res.writableFinished && !res.writableEnded) {
                clearTimeout(timer);
              }
            });
          } else {
            send();
          }
        });
      });

      this.server.on('error', reject);

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          this.baseUrl = `http://127.0.0.1:${this.port}`;
          resolve({ port: this.port, baseUrl: this.baseUrl });
        } else {
          reject(new Error('Failed to obtain upstream server port'));
        }
      });
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getPort(): number {
    return this.port;
  }

  getRequests(): UpstreamRecordedRequest[] {
    return [...this.requests];
  }

  getLastRequest(): UpstreamRecordedRequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  wasAborted(): boolean {
    return this.requests.some(r => r.aborted);
  }

  clear(): void {
    this.requests = [];
    this.abortListeners = [];
    this.requestListeners = [];
  }

  async waitForAbort(timeoutMs = 1200): Promise<boolean> {
    if (this.wasAborted()) return true;

    return new Promise(resolve => {
      const timer = setTimeout(() => {
        resolve(this.wasAborted());
      }, timeoutMs);

      this.abortListeners.push(() => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.closeAllConnections?.();
      this.server.close(err => {
        if (err) reject(err);
        else resolve();
      });
      this.server = null;
    });
  }
}
