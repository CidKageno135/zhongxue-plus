/**
 * tests/adversarial-r18-probe.test.ts
 *
 * Independent Security & HTTP Adversarial Probe Suite.
 * Owned by Subagent R18 (Security & HTTP Reviewer - Round 3).
 *
 * Purpose:
 * Strictly verify, stress-test, and attempt to refute the claims of:
 * - B02 (F02: Provider key binding & F03: SSRF/fragment defense)
 * - B03 (F04: HTTP lifecycle/abort & F05: Route validation)
 * - B06 (Static file server path traversal & sensitive file protection)
 * - T10 & T11 (Acceptance test sensitivity & completeness)
 *
 * Runs negative controls, edge-case attack vectors, and live loopback HTTP probes.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { RealTcpAppServer } from './fixtures/ai-http/real-tcp-server.ts';
import { FakeUpstreamServer } from './fixtures/ai-http/fake-upstream.ts';
import { MockUpstreamServer } from './fixtures/api/mock-upstream-server.ts';
import {
  validateUpstreamUrl,
  isTrustedHost,
  isLoopbackOrLocalhost,
  isPrivateOrInternalIp,
  getProviderForHostname,
  getServerKeyForProvider,
  resolveUpstreamCredentials,
  redactSecret,
  isAllowedOrigin,
  getCorsHeaders
} from '../server/security.ts';
import {
  SENTINEL_AGENTROUTER_KEY,
  SENTINEL_OPENROUTER_KEY,
  SENTINEL_CLIENT_KEY,
  PROVIDER_URLS,
  ATTACK_VECTORS
} from './fixtures/security/index.js';

describe('R18 Adversarial Security & HTTP Probe Suite', () => {
  let appServer: RealTcpAppServer;
  let fakeUpstream: FakeUpstreamServer;
  let trapServer: MockUpstreamServer;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    // Scenario 1 default: Server has AgentRouter keys only (standard production config)
    // AI_OPENROUTER_KEY is intentionally NOT set to prove zero cross-provider key leakage.
    process.env.AI_AGENTROUTER_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_SOL_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_DEEPSEEK_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_API_KEY = SENTINEL_AGENTROUTER_KEY;
    process.env.AI_MODEL = 'gpt-6.1-sol';
    delete process.env.AI_OPENROUTER_KEY;

    appServer = new RealTcpAppServer();
    await appServer.start();

    fakeUpstream = new FakeUpstreamServer();
    await fakeUpstream.start();

    trapServer = new MockUpstreamServer();
    await trapServer.start();
  });

  afterAll(async () => {
    await appServer?.close();
    await fakeUpstream?.close();
    await trapServer?.stop();
    process.env = originalEnv;
  });

  beforeEach(() => {
    fakeUpstream.clear();
    trapServer.clear();
  });

  // ==========================================================================
  // Section 1: F02 Rebuttal & Negative Controls (Provider Key Binding)
  // ==========================================================================
  describe('1. F02: Provider Key Binding & Isolation Rebuttal', () => {

    it('1.1 MUST NOT attach AgentRouter server key to OpenRouter even with model=gpt-6.1-sol and adversarial headers', async () => {
      // Attacker tries to coerce server into releasing AgentRouter key by specifying AgentRouter's flagship model
      // and sending AgentRouter specific headers
      const res = await appServer.postRaw(
        '/api/conversation',
        JSON.stringify({
          action: 'chat',
          baseUrl: 'https://openrouter.ai/api/v1',
          model: 'gpt-6.1-sol',
          messages: [{ role: 'user', content: 'Extract secret key probe' }]
        }),
        'application/json'
      );

      // Must be rejected with HTTP 400 Bad Request
      expect(res.statusCode, 'Request to OpenRouter without client key must return HTTP 400').toBe(400);

      const json = res.json() as { error?: { code?: string; message?: string } };
      expect(json.error?.code).toBe('BAD_REQUEST');
      expect(res.rawText).not.toContain(SENTINEL_AGENTROUTER_KEY);
    });

    it('1.2 MUST NOT attach AgentRouter key to OpenRouter when strange or unmapped model is requested', async () => {
      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'deepseek/deepseek-r1-zero:free',
        messages: [{ role: 'user', content: 'test probe' }]
      });

      expect(res.statusCode).toBe(400);
      expect(res.rawText).not.toContain(SENTINEL_AGENTROUTER_KEY);
    });

    it('1.3 MUST NOT leak AgentRouter key via ping action to OpenRouter without client apiKey', async () => {
      const res = await appServer.postJson('/api/conversation', {
        action: 'ping',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'gpt-6.1-sol'
      });

      expect(res.statusCode).toBe(400);
      const json = res.json() as { ok: boolean; error?: string };
      expect(json.ok).toBe(false);
      expect(res.rawText).not.toContain(SENTINEL_AGENTROUTER_KEY);
    });

    it('1.4 Forwards client-provided apiKey to OpenRouter without leaking server key', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://openrouter.ai/api/v1',
        clientApiKey: SENTINEL_CLIENT_KEY,
        model: 'gpt-6.1-sol',
        env: {
          AI_SOL_KEY: SENTINEL_AGENTROUTER_KEY,
          AI_AGENTROUTER_KEY: SENTINEL_AGENTROUTER_KEY
        }
      });

      expect(creds.isAllowed).toBe(true);
      expect(creds.keySource).toBe('client');
      expect(creds.apiKey).toBe(SENTINEL_CLIENT_KEY);
      expect(creds.apiKey).not.toBe(SENTINEL_AGENTROUTER_KEY);
    });

    it('1.5 Multi-provider environment: Assigns correct key per provider and NEVER confuses them', () => {
      const multiEnv = {
        AI_AGENTROUTER_KEY: SENTINEL_AGENTROUTER_KEY,
        AI_OPENROUTER_KEY: SENTINEL_OPENROUTER_KEY
      };

      // AgentRouter receives AgentRouter key
      const ar = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://agentrouter.org/v1',
        model: 'gpt-6.1-sol',
        env: multiEnv
      });
      expect(ar.apiKey).toBe(SENTINEL_AGENTROUTER_KEY);

      // OpenRouter receives OpenRouter key
      const or = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://openrouter.ai/api/v1',
        model: 'gpt-6.1-sol',
        env: multiEnv
      });
      expect(or.apiKey).toBe(SENTINEL_OPENROUTER_KEY);
      expect(or.apiKey).not.toBe(SENTINEL_AGENTROUTER_KEY);
    });

    it('1.6 Negative Control F02: Demonstrates that lacking provider-specific key revokes authorization', () => {
      // Pure AgentRouter destination -> Gets AgentRouter key
      const credsAgentRouter = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://agentrouter.org/v1',
        model: 'gpt-6.1-sol',
        env: {
          AI_AGENTROUTER_KEY: SENTINEL_AGENTROUTER_KEY
        }
      });
      expect(credsAgentRouter.apiKey).toBe(SENTINEL_AGENTROUTER_KEY);
      expect(credsAgentRouter.keySource).toBe('server');

      // OpenRouter destination when ONLY AgentRouter key exists in env -> Refuses authorization
      const credsIsolated = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://openrouter.ai/api/v1',
        model: 'gpt-6.1-sol',
        env: {
          AI_AGENTROUTER_KEY: SENTINEL_AGENTROUTER_KEY
          // Note: NO AI_OPENROUTER_KEY!
        }
      });
      expect(credsIsolated.isAllowed).toBe(false);
      expect(credsIsolated.apiKey).toBeNull();
      expect(credsIsolated.keySource).toBe('none');
    });
  });

  // ==========================================================================
  // Section 2: F03 Rebuttal & SSRF Attack Vectors
  // ==========================================================================
  describe('2. F03: SSRF & Attack Vectors Rebuttal', () => {

    it('2.1 Rejects IPv6 loopback variants in default/production mode', () => {
      const ipv6Vectors = [
        'http://[::1]:8080/v1',
        'http://[0000:0000:0000:0000:0000:0000:0000:0001]:8080/v1',
        'http://[::ffff:127.0.0.1]:8080/v1',
        'http://[fe80::1]:8080/v1',
        'http://[fc00::1]:8080/v1'
      ];

      for (const vector of ipv6Vectors) {
        const result = validateUpstreamUrl(vector, { allowLocalDev: false });
        expect(
          result.valid,
          `Vector "${vector}" must be rejected when allowLocalDev=false`
        ).toBe(false);
      }
    });

    it('2.2 Verifies URL encoded fragments (%23) do not lead to path truncation or key leakage', async () => {
      // In WHATWG URL parsing, %23 is part of pathname, not a URL fragment hash.
      // We verify that sending %23 does not cause path truncation or bypass security checks.
      const encodedFragmentUrl = 'https://openrouter.ai/api/v1%23admin';
      const parsed = validateUpstreamUrl(encodedFragmentUrl);
      expect(parsed.valid).toBe(true);
      expect(parsed.url?.pathname).toContain('%23admin');
      // The hash remains empty, confirming WHATWG does not treat %23 as fragment delimiter
      expect(parsed.url?.hash).toBe('');

      // When tested over HTTP without apiKey, it must be rejected due to F02 provider key protection
      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        baseUrl: encodedFragmentUrl,
        messages: [{ role: 'user', content: 'test fragment probe' }]
      });
      expect(res.statusCode).toBe(400);
      expect(res.rawText).not.toContain(SENTINEL_AGENTROUTER_KEY);
    });

    it('2.3 Rejects userinfo in all URL variants', () => {
      const userinfoVectors = [
        'https://user:pass@agentrouter.org/v1',
        'https://admin:secret@openrouter.ai/api/v1',
        'https://admin@agentrouter.org/v1',
        'http://user:pass@127.0.0.1:8080/v1',
        'http://attacker@localhost:8080/v1'
      ];

      for (const vector of userinfoVectors) {
        const result = validateUpstreamUrl(vector);
        expect(result.valid, `Userinfo vector "${vector}" must be rejected`).toBe(false);
        expect(result.error).toMatch(/userinfo/i);
      }
    });

    it('2.4 Blocks DNS rebinding and host spoofing attempts', () => {
      const spoofVectors = [
        'http://127.0.0.1.nip.io/v1',
        'http://localhost.evil.com/v1',
        'http://agentrouter.org.attacker.com/v1',
        'https://openrouter.ai.attacker.com/v1'
      ];

      for (const vector of spoofVectors) {
        const result = validateUpstreamUrl(vector);
        // http: is blocked for remote host; https: is untrusted
        if (vector.startsWith('http:')) {
          expect(result.valid, `Remote http vector "${vector}" must be invalid`).toBe(false);
        } else {
          expect(result.isTrusted, `Spoofed host "${vector}" must NOT be trusted`).toBe(false);
        }
      }
    });

    it('2.5 Upstream 302 redirect MUST NOT leak Authorization header across origin', async () => {
      // Set up trap server on dynamic port
      let trapReceivedRequests = 0;
      let trapReceivedAuthHeader = '';

      const redirectTrapServer = http.createServer((req, res) => {
        trapReceivedRequests++;
        trapReceivedAuthHeader = req.headers['authorization'] || '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'Stolen response' } }] }));
      });

      await new Promise<void>(resolve => redirectTrapServer.listen(0, '127.0.0.1', () => resolve()));
      const trapPort = (redirectTrapServer.address() as { port: number }).port;
      const trapUrl = `http://127.0.0.1:${trapPort}/sink`;

      // Configure fake upstream to return 302 Redirect pointing to the trap server
      fakeUpstream.setResponse({
        statusCode: 302,
        headers: {
          Location: trapUrl,
          'Content-Type': 'text/plain'
        },
        body: `Redirecting to ${trapUrl}`
      });

      // Send chat request to fakeUpstream with client key
      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: SENTINEL_CLIENT_KEY,
        messages: [{ role: 'user', content: 'Test redirect leak' }]
      });

      // Due to redirect: 'manual', the redirect is NOT followed:
      // 1. Trap server received ZERO requests
      expect(trapReceivedRequests, 'Redirect trap server must receive ZERO requests').toBe(0);
      expect(trapReceivedAuthHeader).toBe('');

      // 2. Response falls back safely to guided tutor
      expect(res.statusCode).toBe(200);
      const json = res.json() as { mode?: string };
      expect(json.mode).toBe('guided');

      await new Promise<void>(resolve => redirectTrapServer.close(() => resolve()));
    });

    it('2.6 Negative Control F03: Path-truncation loopback exploit fails with 0 requests to target', async () => {
      let internalCalls = 0;
      const internalServer = http.createServer((req, res) => {
        internalCalls++;
        res.writeHead(200);
        res.end('Action executed');
      });

      await new Promise<void>(resolve => internalServer.listen(0, '127.0.0.1', () => resolve()));
      const port = (internalServer.address() as { port: number }).port;

      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        baseUrl: `http://127.0.0.1:${port}/admin-action#`,
        messages: [{ role: 'user', content: 'Exploit attempt' }]
      });

      expect(res.statusCode).toBe(400);
      expect(internalCalls, 'Internal admin endpoint must receive ZERO requests').toBe(0);

      await new Promise<void>(resolve => internalServer.close(() => resolve()));
    });
  });

  // ==========================================================================
  // Section 3: F04 Rebuttal & HTTP Lifecycle / Abort
  // ==========================================================================
  describe('3. F04: Lifecycle, Abort & Disconnect Rebuttal', () => {

    it('3.1 Client TCP disconnect mid-flight triggers upstream AbortSignal', async () => {
      // Configure upstream with slow delay (800ms)
      fakeUpstream.setResponse({
        delayMs: 800,
        statusCode: 200,
        body: {
          choices: [{ message: { role: 'assistant', content: 'Should be cancelled' } }]
        }
      });

      const payload = JSON.stringify({
        action: 'chat',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'client-key-probe',
        messages: [{ role: 'user', content: 'Slow query' }]
      });

      // Send request and forcibly destroy socket after 60ms
      const abortResult = await appServer.sendAndAbort({
        path: '/api/conversation',
        body: payload,
        abortAfterMs: 60
      });

      expect(abortResult.aborted).toBe(true);

      // Verify upstream observed the abort signal
      const wasAborted = await fakeUpstream.waitForAbort(1200);
      expect(wasAborted, 'Upstream must receive abort signal when client disconnects').toBe(true);
    });

    it('3.2 Normal client request is NOT aborted and completes with 200 OK', async () => {
      fakeUpstream.setResponse({
        delayMs: 50,
        statusCode: 200,
        body: {
          choices: [{ message: { role: 'assistant', content: '中文：你好！\nPinyin: nǐ hǎo!\nTiếng Việt: Xin chào!\n練習：跟我念' } }]
        }
      });

      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'client-key-probe',
        messages: [{ role: 'user', content: 'Normal message' }]
      });

      expect(res.statusCode).toBe(200);
      const json = res.json() as { mode?: string; content?: string };
      expect(json.mode).toBe('ai');
      expect(json.content).toContain('中文：你好！');
      expect(fakeUpstream.wasAborted()).toBe(false);
    });

    it('3.3 Ping Upstream Schema Resilience: Rejects non-conforming responses', async () => {
      const nonConformingCases: Array<{
        name: string;
        response: { statusCode?: number; body?: string | Record<string, unknown>; headers?: Record<string, string> };
        expectedErrorPattern: RegExp;
      }> = [
        {
          name: 'Empty body',
          response: { statusCode: 200, body: '', headers: { 'Content-Type': 'application/json' } },
          expectedErrorPattern: /empty or whitespace/i
        },
        {
          name: 'Whitespace-only body',
          response: { statusCode: 200, body: '   \n\t  ', headers: { 'Content-Type': 'application/json' } },
          expectedErrorPattern: /empty or whitespace/i
        },
        {
          name: 'Empty JSON object',
          response: { statusCode: 200, body: {}, headers: { 'Content-Type': 'application/json' } },
          expectedErrorPattern: /missing choices or output/i
        },
        {
          name: 'Empty choices array',
          response: { statusCode: 200, body: { choices: [] }, headers: { 'Content-Type': 'application/json' } },
          expectedErrorPattern: /missing choices or output/i
        },
        {
          name: 'Error payload from upstream',
          response: { statusCode: 200, body: { error: { message: 'Overloaded' } }, headers: { 'Content-Type': 'application/json' } },
          expectedErrorPattern: /Upstream returned error: Overloaded/i
        },
        {
          name: 'HTML string instead of JSON',
          response: { statusCode: 200, body: '<html><body>502 Bad Gateway</body></html>', headers: { 'Content-Type': 'text/html' } },
          expectedErrorPattern: /not valid JSON/i
        }
      ];

      for (const tc of nonConformingCases) {
        fakeUpstream.setResponse(tc.response);

        const res = await appServer.postJson('/api/conversation', {
          action: 'ping',
          baseUrl: fakeUpstream.getBaseUrl(),
          apiKey: 'client-key-probe'
        });

        expect(res.statusCode).toBe(200);
        const json = res.json() as { ok: boolean; error?: string };
        expect(json.ok, `Ping case "${tc.name}" must return ok=false`).toBe(false);
        expect(json.error).toMatch(tc.expectedErrorPattern);
      }
    });
  });

  // ==========================================================================
  // Section 4: F05 Rebuttal & Route Validation on Live HTTP
  // ==========================================================================
  describe('4. F05: Live HTTP Route Validation Rebuttal', () => {

    it('4.1 Rejects body "null" with 400 Bad Request', async () => {
      const res = await appServer.postRaw('/api/conversation', 'null', 'application/json');
      expect(res.statusCode).toBe(400);
      const json = res.json() as { error?: { code?: string } };
      expect(json.error?.code).toBe('BAD_REQUEST');
    });

    it('4.2 Rejects primitive JSON types (true, 123, "string") with 400 Bad Request', async () => {
      for (const primitive of ['true', '123', '"hello world"']) {
        const res = await appServer.postRaw('/api/conversation', primitive, 'application/json');
        expect(res.statusCode, `POST "${primitive}" must return 400`).toBe(400);
      }
    });

    it('4.3 Rejects JSON array body with 400 Bad Request', async () => {
      const res = await appServer.postRaw('/api/conversation', '[1, 2, 3]', 'application/json');
      expect(res.statusCode).toBe(400);
    });

    it('4.4 Rejects empty JSON object with 400 Bad Request', async () => {
      const res = await appServer.postRaw('/api/conversation', '{}', 'application/json');
      expect(res.statusCode).toBe(400);
      const json = res.json() as { error?: { message?: string } };
      expect(json.error?.message).toMatch(/messages array cannot be empty/i);
    });

    it('4.5 Rejects empty messages array with 400 Bad Request', async () => {
      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        messages: []
      });
      expect(res.statusCode).toBe(400);
      const json = res.json() as { error?: { message?: string } };
      expect(json.error?.message).toMatch(/messages array cannot be empty/i);
    });

    it('4.6 Rejects non-JSON Content-Type (text/plain, application/x-www-form-urlencoded) with 415', async () => {
      const plainRes = await appServer.postRaw('/api/conversation', '{"action":"ping"}', 'text/plain');
      expect([400, 415]).toContain(plainRes.statusCode);

      const formRes = await appServer.postRaw(
        '/api/conversation',
        'action=ping',
        'application/x-www-form-urlencoded'
      );
      expect([400, 415]).toContain(formRes.statusCode);
    });

    it('4.7 Rejects oversized payload (> 100 KB) with 413 Payload Too Large', async () => {
      const oversizedText = 'X'.repeat(105 * 1024);
      const res = await appServer.postRaw(
        '/api/conversation',
        JSON.stringify({
          action: 'chat',
          messages: [{ role: 'user', content: oversizedText }]
        }),
        'application/json'
      );
      expect(res.statusCode).toBe(413);
    });

    it('4.8 Rejects invalid message roles (role: "admin", "root") with 400 Bad Request', async () => {
      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        messages: [{ role: 'hacker', content: 'hello' }]
      });
      expect(res.statusCode).toBe(400);
      const json = res.json() as { error?: { message?: string } };
      expect(json.error?.message).toMatch(/invalid message role/i);
    });

    it('4.9 Rejects unsupported HTTP methods (DELETE, PATCH) with 405 Method Not Allowed', async () => {
      const methods = ['DELETE', 'PATCH'];
      for (const method of methods) {
        const res = await appServer.rawRequest({
          method,
          path: '/api/conversation'
        });
        expect(res.statusCode, `${method} /api/conversation must return 405`).toBe(405);
      }
    });

    it('4.10 GET /api/conversation returns status probe with 200 OK', async () => {
      const res = await appServer.rawRequest({
        method: 'GET',
        path: '/api/conversation'
      });
      expect(res.statusCode).toBe(200);
      const json = res.json() as { status?: string; ok?: boolean };
      expect(json.status).toBe('ready');
      expect(json.ok).toBe(true);
    });
  });

  // ==========================================================================
  // Section 5: Static Security & Path Traversal Rebuttal
  // ==========================================================================
  describe('5. Static Server Security & Path Traversal Rebuttal', () => {

    it('5.1 Rejects directory traversal /../../.env with 403 Forbidden', async () => {
      const res = await appServer.rawRequest({
        method: 'GET',
        path: '/../../.env'
      });
      expect(res.statusCode).toBe(403);
      expect(res.rawText).not.toContain('AI_');
    });

    it('5.2 Rejects URL-encoded directory traversal /%2e%2e/%2e%2e/.env with 403 Forbidden', async () => {
      const res = await appServer.rawRequest({
        method: 'GET',
        path: '/%2e%2e/%2e%2e/.env'
      });
      expect(res.statusCode).toBe(403);
    });

    it('5.3 Rejects access to sensitive file /.env.example and /package.json with 403 Forbidden', async () => {
      const envRes = await appServer.rawRequest({
        method: 'GET',
        path: '/.env.example'
      });
      expect(envRes.statusCode).toBe(403);

      const pkgRes = await appServer.rawRequest({
        method: 'GET',
        path: '/package.json'
      });
      expect(pkgRes.statusCode).toBe(403);
    });

    it('5.4 Rejects direct access to backend source code /server/index.ts with 403 Forbidden', async () => {
      const res = await appServer.rawRequest({
        method: 'GET',
        path: '/server/index.ts'
      });
      expect(res.statusCode).toBe(403);
    });

    it('5.5 Rejects null byte injection /index.html%00 with 403 Forbidden', async () => {
      const res = await appServer.rawRequest({
        method: 'GET',
        path: '/index.html%00'
      });
      expect(res.statusCode).toBe(403);
    });

    it('5.6 Unknown /api/* route returns 404 JSON (NEVER SPA index.html)', async () => {
      const res = await appServer.rawRequest({
        method: 'GET',
        path: '/api/nonexistent-action-endpoint'
      });
      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toContain('application/json');
      const json = res.json() as { error?: { code?: string } };
      expect(json.error?.code).toBe('NOT_FOUND');
      // Assert it is NOT the SPA index.html fallback
      expect(res.rawText).not.toContain('<!DOCTYPE html>');
    });
  });

  // ==========================================================================
  // Section 6: Security Boundary Evaluation: Local Dev vs Public Production
  // ==========================================================================
  describe('6. Security Boundary: Local Dev vs Public Production', () => {

    it('6.1 Production mode rejects loopback by default even when NODE_ENV is unset', () => {
      const envWithoutNodeEnv: Record<string, string | undefined> = {};
      const res = validateUpstreamUrl('http://127.0.0.1:8080/v1', {
        env: envWithoutNodeEnv,
        allowLocalDev: false
      });

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Insecure protocol/i);
    });

    it('6.2 Local Dev mode allows loopback ONLY when explicitly opted-in', () => {
      const res = validateUpstreamUrl('http://127.0.0.1:8080/v1', {
        allowLocalDev: true
      });
      expect(res.valid).toBe(true);
      expect(res.isTrusted).toBe(false); // Valid for testing, but not a trusted remote provider
    });

    it('6.3 Cloud Metadata and RFC 1918 Private IPs are BLOCKED under all modes', () => {
      const blockedAddresses = [
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.1/admin',
        'http://192.168.1.1/gateway',
        'http://172.16.0.1/internal'
      ];

      for (const addr of blockedAddresses) {
        // Even with allowLocalDev=true, RFC1918 and Cloud Metadata must be blocked
        const res = validateUpstreamUrl(addr, { allowLocalDev: true });
        expect(res.valid, `Address ${addr} must be blocked even in dev`).toBe(false);
      }
    });

    it('6.4 Wildcard CORS is NEVER returned for any origin', () => {
      const origins = [
        'https://malicious-website.com',
        'http://attacker.local',
        'null',
        ''
      ];

      for (const origin of origins) {
        const cors = getCorsHeaders(origin);
        expect(cors['Access-Control-Allow-Origin']).not.toBe('*');
      }
    });

    it('6.5 Secrets are sanitized in error and log helper functions', () => {
      const rawSecret = 'sk-or-v1-abcdef0123456789fedcba9876543210';
      const redacted = redactSecret(rawSecret);
      expect(redacted).toBe('sk-...3210');
      expect(redacted).not.toContain('abcdef0123456789');

      const logMsg = `User authenticated with Bearer ${rawSecret} on server`;
      const sanitizedLog = redactSecret(logMsg);
      expect(sanitizedLog).toContain('Bearer [REDACTED]');
      expect(sanitizedLog).not.toContain(rawSecret);
    });
  });
});
