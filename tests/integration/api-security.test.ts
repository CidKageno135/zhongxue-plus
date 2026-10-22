/**
 * tests/integration/api-security.test.ts
 *
 * Independent Integration Security Test Suite for ZhongXue V2.
 * Owned by Subagent A16 (QA API & Independent Security Lead).
 *
 * Comprehensive end-to-end HTTP integration tests against live local test server verifying:
 * 1. Credential Forwarding Prevention (Finding SEC-01):
 *    - Server environment keys are NEVER forwarded to untrusted/custom baseUrls.
 *    - Substring tricks like agentrouter.org.evil.com are rejected/withheld.
 *    - HTTP redirects do not leak Authorization headers.
 *    - Cross-origin requests from unauthorized origins receive 403 Forbidden without wildcard CORS.
 * 2. Input Validation & Bounds Enforcement (Subagent A04 verification):
 *    - Malformed JSON -> 400 Bad Request with structured error envelope.
 *    - Negative offset / NaN limit / limit > 100 -> 400 Bad Request.
 *    - Payloads exceeding size limits -> 413 Payload Too Large.
 *    - Invalid HTTP methods -> 405 Method Not Allowed.
 * 3. Static File Security & Directory Traversal:
 *    - Path traversal attempts (/../.env, /%2e%2e/.env) -> 403 Forbidden, never serves secrets.
 *    - Unknown /api/* routes -> 404 Not Found with JSON envelope, NEVER HTML SPA fallback.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { createTestServer, type RunningTestServer } from '../fixtures/api/test-server.ts';
import { MockUpstreamServer } from '../fixtures/api/mock-upstream-server.ts';
import {
  SENTINEL_SOL_KEY,
  SENTINEL_DEEPSEEK_KEY,
  SENTINEL_API_KEY,
  SENTINEL_CLIENT_KEY,
  ATTACKER_EVIL_URL,
  ATTACKER_SUBSTRING_URL,
  ATTACKER_SUBSTRING_PATH_URL,
  UNAUTHORIZED_ORIGIN,
  AUTHORIZED_DEV_ORIGIN,
  MALFORMED_JSON_STRING,
  createOversizedPayload
} from '../fixtures/api/sentinel-secrets.ts';
import {
  SENTINEL_AGENTROUTER_KEY,
  SENTINEL_CLIENT_KEY as T10_SENTINEL_CLIENT_KEY,
  PROVIDER_URLS
} from '../fixtures/security/index.js';

describe('API Security Integration Tests (A16 Independent QA)', () => {
  let testServer: RunningTestServer;
  let mockUpstream: MockUpstreamServer;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    // Inject fake sentinel secrets into environment
    process.env.AI_AGENTROUTER_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_SOL_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_DEEPSEEK_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_API_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_MODEL = 'gpt-6.1-sol';

    // Start mock upstream and test server
    mockUpstream = new MockUpstreamServer();
    await mockUpstream.start();

    testServer = await createTestServer({
      env: process.env,
      loadDictionary: true
    });
  });

  afterAll(async () => {
    await testServer?.close();
    await mockUpstream?.stop();

    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockUpstream.clear();
  });

  // ==========================================================================
  // Section 1: Credential Forwarding Prevention (Finding SEC-01)
  // ==========================================================================
  describe('1. Credential Forwarding Prevention (SEC-01)', () => {
    it('1.1 should NEVER forward server API keys when client specifies external attacker baseUrl without apiKey', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: ATTACKER_EVIL_URL,
          model: 'gpt-6.1-sol',
          messages: [{ role: 'user', content: 'Hello test' }]
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Must safely fallback to guided response without forwarding server keys
      expect(data.mode).toBe('guided');
      expect(data.meta?.fallbackReason).toBe('no_key');

      // The returned payload must NEVER contain any sentinel keys
      const rawText = JSON.stringify(data);
      expect(rawText).not.toContain(SENTINEL_SOL_KEY);
      expect(rawText).not.toContain(SENTINEL_DEEPSEEK_KEY);
      expect(rawText).not.toContain(SENTINEL_API_KEY);
    });

    it('1.2 should withhold server keys when action is ping to an external attacker baseUrl', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'ping',
          baseUrl: ATTACKER_EVIL_URL,
          model: 'gpt-6.1-sol'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBeDefined();

      const rawText = JSON.stringify(data);
      expect(rawText).not.toContain(SENTINEL_SOL_KEY);
      expect(rawText).not.toContain(SENTINEL_DEEPSEEK_KEY);
      expect(rawText).not.toContain(SENTINEL_API_KEY);
    });

    it('1.3 should reject or withhold server keys on fake hostnames using substring trick e.g. agentrouter.org.evil.com', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: ATTACKER_SUBSTRING_URL,
          model: 'gpt-6.1-sol',
          messages: [{ role: 'user', content: 'Hello test' }]
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Server key must NOT be attached
      expect(data.mode).toBe('guided');
      expect(data.meta?.fallbackReason).toBe('no_key');

      const rawText = JSON.stringify(data);
      expect(rawText).not.toContain(SENTINEL_SOL_KEY);
      expect(rawText).not.toContain(SENTINEL_DEEPSEEK_KEY);
      expect(rawText).not.toContain(SENTINEL_API_KEY);
    });

    it('1.4 should reject or withhold server keys on url with agentrouter in the path: https://evil-attacker.com/agentrouter.org', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: ATTACKER_SUBSTRING_PATH_URL,
          model: 'gpt-6.1-sol',
          messages: [{ role: 'user', content: 'Test path trick' }]
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mode).toBe('guided');
      expect(data.meta?.fallbackReason).toBe('no_key');

      const rawText = JSON.stringify(data);
      expect(rawText).not.toContain(SENTINEL_SOL_KEY);
      expect(rawText).not.toContain(SENTINEL_DEEPSEEK_KEY);
    });

    it('1.5 should verify against local mock upstream that server never sends Authorization header when baseUrl is unapproved and without client key', async () => {
      const mockUrl = mockUpstream.getBaseUrl();

      await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: mockUrl,
          model: 'gpt-6.1-sol',
          messages: [{ role: 'user', content: 'Testing mock upstream' }]
        })
      });

      // Mock upstream should NOT have received any request with server keys
      expect(mockUpstream.wasSecretReceived(SENTINEL_SOL_KEY)).toBe(false);
      expect(mockUpstream.wasSecretReceived(SENTINEL_DEEPSEEK_KEY)).toBe(false);
      expect(mockUpstream.wasSecretReceived(SENTINEL_API_KEY)).toBe(false);
      expect(mockUpstream.wasAuthorizationReceived()).toBe(false);
    });

    it('1.6 should forward ONLY client-provided apiKey when client explicitly provides their own key', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'ping',
          baseUrl: 'https://openrouter.ai/api/v1',
          apiKey: SENTINEL_CLIENT_KEY,
          model: 'deepseek/deepseek-chat'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Check that server sentinel keys were never leaked in output
      const rawText = JSON.stringify(data);
      expect(rawText).not.toContain(SENTINEL_SOL_KEY);
      expect(rawText).not.toContain(SENTINEL_DEEPSEEK_KEY);
    });

    it('1.7 should prevent credential leakage across HTTP redirects by setting redirect manual', async () => {
      const redirectServer = new MockUpstreamServer({
        redirectTarget: 'http://127.0.0.1:59999/leaked'
      });
      const redirectUrl = await redirectServer.start();

      try {
        await testServer.fetch('/api/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: AUTHORIZED_DEV_ORIGIN
          },
          body: JSON.stringify({
            action: 'ping',
            baseUrl: redirectUrl + '/redirect',
            model: 'gpt-6.1-sol'
          })
        });

        // The redirect server must NOT have received any Authorization header
        expect(redirectServer.wasSecretReceived(SENTINEL_SOL_KEY)).toBe(false);
        expect(redirectServer.wasSecretReceived(SENTINEL_DEEPSEEK_KEY)).toBe(false);
        expect(redirectServer.wasAuthorizationReceived()).toBe(false);
      } finally {
        await redirectServer.stop();
      }
    });

    it('1.8 should reject cross-origin requests from unauthorized origins with 403 Forbidden', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: UNAUTHORIZED_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          messages: [{ role: 'user', content: 'Cross-origin attack' }]
        })
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error?.code).toBe('FORBIDDEN_ORIGIN');

      // Crucial: Access-Control-Allow-Origin MUST NOT be the attacker origin or wildcard *
      const acao = res.headers.get('access-control-allow-origin');
      expect(acao).not.toBe(UNAUTHORIZED_ORIGIN);
      expect(acao).not.toBe('*');
    });
  });

  // ==========================================================================
  // Section 2: Input Validation & Boundary Enforcement (Subagent A04)
  // ==========================================================================
  describe('2. Input Validation & Limits (A04 Verification)', () => {
    it('2.1 should reject malformed JSON body with 400 Bad Request and sanitized JSON envelope', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: MALFORMED_JSON_STRING
      });

      expect(res.status).toBe(400);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(['BAD_REQUEST', 'INVALID_JSON']).toContain(data.error?.code);
      expect(data.error?.message).toBeDefined();

      // Must never leak stack traces or file paths
      expect(JSON.stringify(data)).not.toContain('at ');
      expect(JSON.stringify(data)).not.toContain(':\\');
    });

    it('2.2 should reject negative offset in /api/dictionary with 400 Bad Request', async () => {
      const res = await testServer.fetch('/api/dictionary?q=學生&offset=-1', {
        headers: { Origin: AUTHORIZED_DEV_ORIGIN }
      });

      expect(res.status).toBe(400);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error?.code).toBe('BAD_REQUEST');
      expect(data.error?.message).toMatch(/offset/i);
    });

    it('2.3 should reject NaN or invalid limit in /api/dictionary with 400 Bad Request', async () => {
      const res = await testServer.fetch('/api/dictionary?q=學生&limit=not-a-number', {
        headers: { Origin: AUTHORIZED_DEV_ORIGIN }
      });

      expect(res.status).toBe(400);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error?.code).toBe('BAD_REQUEST');
      expect(data.error?.message).toMatch(/limit/i);
    });

    it('2.4 should reject limit exceeding maximum allowable bounds (limit > 100) with 400 Bad Request', async () => {
      const res = await testServer.fetch('/api/dictionary?q=學生&limit=500', {
        headers: { Origin: AUTHORIZED_DEV_ORIGIN }
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error?.code).toBe('BAD_REQUEST');
      expect(data.error?.message).toMatch(/limit/i);
    });

    it('2.5 should reject request missing both q and id in /api/dictionary with 400 Bad Request', async () => {
      const res = await testServer.fetch('/api/dictionary', {
        headers: { Origin: AUTHORIZED_DEV_ORIGIN }
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error?.code).toBe('BAD_REQUEST');
    });

    it('2.6 should reject huge payload exceeding limit with 413 Payload Too Large', async () => {
      const hugeBody = createOversizedPayload(150 * 1024); // 150KB exceeds 100KB limit

      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: hugeBody
      });

      expect(res.status).toBe(413);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error?.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('2.7 should reject invalid HTTP methods on /api/health with 405 Method Not Allowed', async () => {
      const methods = ['DELETE', 'POST', 'PUT'];
      for (const m of methods) {
        const res = await testServer.fetch('/api/health', {
          method: m,
          headers: { Origin: AUTHORIZED_DEV_ORIGIN }
        });
        expect(res.status).toBe(405);
        const data = await res.json();
        expect(data.error?.code).toBe('METHOD_NOT_ALLOWED');
      }
    });

    it('2.8 should reject invalid HTTP methods on /api/dictionary with 405 Method Not Allowed', async () => {
      const res = await testServer.fetch('/api/dictionary?q=test', {
        method: 'DELETE',
        headers: { Origin: AUTHORIZED_DEV_ORIGIN }
      });
      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data.error?.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  // ==========================================================================
  // Section 3: Static File Security & Directory Traversal Protection
  // ==========================================================================
  describe('3. Static File Security & Directory Traversal Protection', () => {
    it('3.1 should block path traversal request GET /../.env with 403 Forbidden', async () => {
      const res = await testServer.fetch('/../.env');
      expect(res.status).toBe(403);

      const text = await res.text();
      expect(text).not.toContain('AI_SOL_KEY');
      expect(text).not.toContain('AI_DEEPSEEK_KEY');
      expect(text).not.toContain(SENTINEL_SOL_KEY);
    });

    it('3.2 should block URL-encoded traversal GET /%2e%2e/.env with 403 Forbidden', async () => {
      const res = await testServer.fetch('/%2e%2e/.env');
      expect(res.status).toBe(403);

      const text = await res.text();
      expect(text).not.toContain('AI_SOL_KEY');
      expect(text).not.toContain('SENTINEL_SOL_KEY');
    });

    it('3.3 should block nested encoded traversal GET /assets/..%2f..%2f.env with 403 Forbidden', async () => {
      const res = await testServer.fetch('/assets/..%2f..%2f.env');
      expect(res.status).toBe(403);

      const text = await res.text();
      expect(text).not.toContain('AI_SOL_KEY');
      expect(text).not.toContain('SENTINEL_SOL_KEY');
    });

    it('3.4 should return JSON 404 for unknown /api routes, NEVER returning SPA HTML index.html', async () => {
      const unknownRoutes = [
        '/api/non-existent-api-route',
        '/api/does-not-exist',
        '/api/v1/unknown',
        '/api/admin/secrets'
      ];

      for (const route of unknownRoutes) {
        const res = await testServer.fetch(route, {
          headers: { Origin: AUTHORIZED_DEV_ORIGIN }
        });

        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('application/json');

        const data = await res.json();
        expect(data.error?.code).toBe('NOT_FOUND');

        // Verify it is NOT returning SPA HTML
        const raw = JSON.stringify(data);
        expect(raw).not.toContain('<!doctype html>');
        expect(raw).not.toContain('<!DOCTYPE html>');
        expect(raw).not.toContain('<div id="root">');
      }
    });

    it('3.5 should serve SPA HTML for non-API routes', async () => {
      const res = await testServer.fetch('/review');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const text = await res.text();
      expect(text).toContain('<!doctype html>');
    });
  });

  // ==========================================================================
  // Section 4: T10 Acceptance Tests - F02: Provider Key Confusion (G2)
  // ==========================================================================
  describe('4. T10 Acceptance: F02 Cross-Provider Key Forwarding via /api/conversation (G2)', () => {
    it('4.1 should NEVER forward AgentRouter server key to OpenRouter when client requests OpenRouter without apiKey', async () => {
      // Client explicitly requests OpenRouter baseUrl, but provides NO client apiKey.
      // Server environment has AgentRouter server key (SENTINEL_AGENTROUTER_KEY).
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: PROVIDER_URLS.OPENROUTER,
          model: 'gpt-6.1-sol',
          messages: [{ role: 'user', content: 'Testing cross-provider key protection' }]
        })
      });

      // INVARIANT (G2):
      // When client does not pass apiKey and specifies OpenRouter (or custom),
      // backend MUST NOT transfer server key of AgentRouter to OpenRouter.
      // It must reject or return 400.
      expect(res.status).toBe(400);

      // CRITICAL ASSERTION:
      // Zero outbound requests to OpenRouter containing the AgentRouter server sentinel!
      expect(mockUpstream.wasSecretReceived(SENTINEL_AGENTROUTER_KEY)).toBe(false);

      const data = await res.json();
      expect(data.mode).not.toBe('ai');
      expect(JSON.stringify(data)).not.toContain(SENTINEL_AGENTROUTER_KEY);
    });

    it('4.2 should REJECT ping to OpenRouter without apiKey and never leak AgentRouter key', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'ping',
          baseUrl: PROVIDER_URLS.OPENROUTER,
          model: 'gpt-6.1-sol'
        })
      });

      expect(res.status).toBe(400);
      expect(mockUpstream.wasSecretReceived(SENTINEL_AGENTROUTER_KEY)).toBe(false);

      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(JSON.stringify(data)).not.toContain(SENTINEL_AGENTROUTER_KEY);
    });

    it('4.3 should forward client-provided apiKey to OpenRouter without injecting AgentRouter key', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'ping',
          baseUrl: PROVIDER_URLS.OPENROUTER,
          apiKey: T10_SENTINEL_CLIENT_KEY,
          model: 'gpt-6.1-sol'
        })
      });

      expect(res.status).toBe(200);
      expect(mockUpstream.wasSecretReceived(SENTINEL_AGENTROUTER_KEY)).toBe(false);
      expect(mockUpstream.wasSecretReceived(T10_SENTINEL_CLIENT_KEY)).toBe(true);
    });
  });

  // ==========================================================================
  // Section 5: T10 Acceptance Tests - F03: SSRF & Fragment Defense (G2)
  // ==========================================================================
  describe('5. T10 Acceptance: F03 SSRF & Fragment Defense via /api/conversation (G2)', () => {
    let localInternalServer: http.Server;
    let localInternalPort: number;
    const internalRequests: Array<{ method: string; path: string; headers: http.IncomingHttpHeaders }> = [];

    beforeAll(async () => {
      localInternalServer = http.createServer((req, res) => {
        internalRequests.push({
          method: req.method || 'GET',
          path: req.url || '/',
          headers: req.headers
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'internal_pwned', message: 'Internal service reached' }));
      });

      await new Promise<void>((resolve, reject) => {
        localInternalServer.on('error', reject);
        localInternalServer.listen(0, '127.0.0.1', () => {
          const addr = localInternalServer.address();
          if (addr && typeof addr === 'object') {
            localInternalPort = addr.port;
            resolve();
          } else {
            reject(new Error('Failed to bind internal server'));
          }
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>(resolve => {
        localInternalServer.closeAllConnections?.();
        localInternalServer.close(() => resolve());
      });
    });

    beforeEach(() => {
      internalRequests.length = 0;
    });

    it('5.1: MUST BLOCK request with URL fragment (#) targeting loopback: http://127.0.0.1:<port>/admin-action#', async () => {
      const exploitUrl = `http://127.0.0.1:${localInternalPort}/admin-action#`;

      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: exploitUrl,
          apiKey: T10_SENTINEL_CLIENT_KEY,
          model: 'test-model',
          messages: [{ role: 'user', content: 'SSRF exploit probe' }]
        })
      });

      // INVARIANT (G2):
      // SSRF: Chặn request tới loopback/localhost/private IP,
      // chặn URL chứa fragment (#) làm cắt đuôi path.
      // Must return 400 Bad Request
      expect(res.status).toBe(400);

      // Internal loopback server MUST NOT receive any request!
      expect(internalRequests.length, 'Internal loopback service was reached via SSRF!').toBe(0);

      const data = await res.json();
      expect(data.mode).not.toBe('ai');
    });

    it('5.2: MUST BLOCK request with URL fragment (#) on public provider: https://openrouter.ai/api/v1#/chat/completions', async () => {
      const fragmentUrl = 'https://openrouter.ai/api/v1#/chat/completions';

      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: fragmentUrl,
          apiKey: T10_SENTINEL_CLIENT_KEY,
          model: 'gpt-6.1-sol',
          messages: [{ role: 'user', content: 'Fragment probe' }]
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.mode).not.toBe('ai');
    });

    it('5.3: MUST BLOCK SSRF requests to cloud metadata (169.254.169.254)', async () => {
      const res = await testServer.fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: AUTHORIZED_DEV_ORIGIN
        },
        body: JSON.stringify({
          action: 'chat',
          baseUrl: 'http://169.254.169.254/latest/meta-data',
          apiKey: T10_SENTINEL_CLIENT_KEY,
          model: 'test-model',
          messages: [{ role: 'user', content: 'Cloud metadata probe' }]
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.mode).not.toBe('ai');
    });

    it('5.4: MUST BLOCK SSRF requests to RFC 1918 private network addresses (10.0.0.1, 192.168.1.1)', async () => {
      for (const ip of ['http://10.0.0.1/admin', 'http://192.168.1.1/setup']) {
        const res = await testServer.fetch('/api/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: AUTHORIZED_DEV_ORIGIN
          },
          body: JSON.stringify({
            action: 'chat',
            baseUrl: ip,
            apiKey: T10_SENTINEL_CLIENT_KEY,
            model: 'test-model',
            messages: [{ role: 'user', content: 'Private network probe' }]
          })
        });

        expect(res.status).toBe(400);
      }
    });

    it('5.5: Redirect MUST NOT carry Authorization header across redirects to a new destination', async () => {
      let leakedAuthHeader: string | undefined;
      const sinkServer = http.createServer((req, res) => {
        leakedAuthHeader = req.headers.authorization;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'sink_reached' }));
      });

      await new Promise<void>(resolve => sinkServer.listen(0, '127.0.0.1', () => resolve()));
      const sinkAddr = sinkServer.address();
      const sinkPort = sinkAddr && typeof sinkAddr === 'object' ? sinkAddr.port : 0;

      const redirectHopServer = http.createServer((req, res) => {
        res.writeHead(302, {
          Location: `http://127.0.0.1:${sinkPort}/leaked-credentials`,
          'Content-Type': 'text/plain'
        });
        res.end('Redirecting');
      });

      await new Promise<void>(resolve => redirectHopServer.listen(0, '127.0.0.1', () => resolve()));
      const hopAddr = redirectHopServer.address();
      const hopPort = hopAddr && typeof hopAddr === 'object' ? hopAddr.port : 0;

      try {
        await testServer.fetch('/api/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: AUTHORIZED_DEV_ORIGIN
          },
          body: JSON.stringify({
            action: 'chat',
            baseUrl: `http://127.0.0.1:${hopPort}/v1`,
            apiKey: T10_SENTINEL_CLIENT_KEY,
            model: 'test-model',
            messages: [{ role: 'user', content: 'Redirect probe' }]
          })
        });

        // The sink server must NEVER receive the client or server Authorization token!
        expect(leakedAuthHeader).toBeUndefined();
      } finally {
        sinkServer.closeAllConnections?.();
        sinkServer.close();
        redirectHopServer.closeAllConnections?.();
        redirectHopServer.close();
      }
    });
  });
});
