/**
 * tests/fixtures/ai-http/real-tcp-server.ts
 *
 * Real TCP loopback test server harness binding createAppHandler() to ephemeral port.
 * Guarantees testing real HTTP socket behavior (headers, content-type, TCP disconnect, streaming).
 * Owned by Subagent T11 (Independent HTTP/AI Tester).
 */

import http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import { createAppHandler, type AppHandlerOptions } from '../../../server/app.ts';

export interface HttpResponseResult {
  statusCode: number;
  headers: IncomingHttpHeaders;
  rawText: string;
  json: () => unknown;
}

export class RealTcpAppServer {
  private server: http.Server | null = null;
  private port = 0;
  private baseUrl = '';

  constructor(private options: AppHandlerOptions = {}) {}

  async start(): Promise<{ port: number; baseUrl: string }> {
    const handler = createAppHandler(this.options);
    this.server = http.createServer(handler);

    return new Promise((resolve, reject) => {
      if (!this.server) return reject(new Error('Server not initialized'));

      this.server.on('error', reject);
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          this.baseUrl = `http://127.0.0.1:${this.port}`;
          resolve({ port: this.port, baseUrl: this.baseUrl });
        } else {
          reject(new Error('Failed to obtain app server port'));
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

  /**
   * Send a raw HTTP request over real TCP socket.
   */
  async rawRequest(options: {
    method?: string;
    path: string;
    headers?: Record<string, string>;
    body?: string | Buffer | null;
  }): Promise<HttpResponseResult> {
    const method = (options.method || 'GET').toUpperCase();

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: this.port,
          path: options.path,
          method,
          headers: options.headers || {}
        },
        res => {
          let rawText = '';
          res.setEncoding('utf8');
          res.on('data', chunk => {
            rawText += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              rawText,
              json: () => {
                try {
                  return JSON.parse(rawText);
                } catch (e) {
                  throw new Error(`Failed to parse JSON response (${res.statusCode}): "${rawText}". Error: ${e}`);
                }
              }
            });
          });
        }
      );

      req.on('error', reject);

      if (options.body !== undefined && options.body !== null) {
        req.write(options.body);
      }
      req.end();
    });
  }

  /**
   * Helper to POST JSON to an endpoint.
   */
  async postJson(path: string, body: unknown, customHeaders?: Record<string, string>): Promise<HttpResponseResult> {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    return this.rawRequest({
      method: 'POST',
      path,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rawBody).toString(),
        ...customHeaders
      },
      body: rawBody
    });
  }

  /**
   * Helper to POST raw string (e.g. "null", or malformed JSON) with custom Content-Type.
   */
  async postRaw(
    path: string,
    rawBody: string | null,
    contentType = 'application/json',
    customHeaders?: Record<string, string>
  ): Promise<HttpResponseResult> {
    const bodyStr = rawBody ?? '';
    return this.rawRequest({
      method: 'POST',
      path,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        'Content-Length': Buffer.byteLength(bodyStr).toString(),
        ...customHeaders
      },
      body: bodyStr
    });
  }

  /**
   * Sends a request over real TCP socket and forcibly aborts/destroys the client socket after `abortAfterMs`.
   * Simulates a user navigating away, refreshing the browser, or clicking "Cancel" in the UI.
   */
  async sendAndAbort(options: {
    path: string;
    body: string;
    contentType?: string;
    abortAfterMs: number;
    customHeaders?: Record<string, string>;
  }): Promise<{ aborted: boolean; clientError?: Error }> {
    return new Promise(resolve => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.port,
        path: options.path,
        method: 'POST',
        headers: {
          'Content-Type': options.contentType || 'application/json',
          'Content-Length': Buffer.byteLength(options.body).toString(),
          ...options.customHeaders
        }
      });

      let clientError: Error | undefined;

      req.on('error', err => {
        clientError = err;
      });

      req.write(options.body);
      req.end();

      // Trigger client-side disconnect after designated delay
      setTimeout(() => {
        req.destroy(new Error('Client aborted request'));
        // Allow brief tick for socket to tear down
        setTimeout(() => {
          resolve({ aborted: true, clientError });
        }, 30);
      }, options.abortAfterMs);
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
