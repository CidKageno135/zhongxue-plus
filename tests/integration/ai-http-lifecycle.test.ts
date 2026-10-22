/**
 * tests/integration/ai-http-lifecycle.test.ts
 *
 * Independent HTTP/AI Lifecycle Acceptance Test Suite.
 * Owned by Subagent T11 (Independent HTTP/AI Tester).
 *
 * Enforces Invariant G3 and strictly reproduces:
 * - F04: Upstream abort signal propagation on client disconnect & lifecycle cleanup
 * - Ping upstream readiness: HTTP 200 with empty body or invalid schema must NOT be reported as ready
 * - Deadline timeout & listener cleanup over real loopback TCP sockets
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { RealTcpAppServer } from '../fixtures/ai-http/real-tcp-server.ts';
import { FakeUpstreamServer } from '../fixtures/ai-http/fake-upstream.ts';

describe('T11 Acceptance: AI HTTP Lifecycle & Cancellation (Invariant G3 / F04)', () => {
  let appServer: RealTcpAppServer;
  let fakeUpstream: FakeUpstreamServer;

  beforeAll(async () => {
    appServer = new RealTcpAppServer();
    await appServer.start();

    fakeUpstream = new FakeUpstreamServer();
    await fakeUpstream.start();
  });

  afterAll(async () => {
    await appServer.close();
    await fakeUpstream.close();
  });

  beforeEach(() => {
    fakeUpstream.clear();
  });

  describe('F04: Client Disconnect & Upstream Abort Signal', () => {
    it('aborts upstream request when client disconnects during pending AI generation', async () => {
      // Configure upstream with a long delay (800ms) simulating slow LLM generation
      fakeUpstream.setResponse({
        delayMs: 800,
        statusCode: 200,
        body: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Delayed response that should be cancelled'
              }
            }
          ]
        }
      });

      const requestPayload = JSON.stringify({
        action: 'chat',
        roleId: 'factory',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'test-client-key-xyz',
        messages: [{ role: 'user', content: 'Tổ trưởng máy sửa xong chưa?' }]
      });

      // Client sends request and forcibly disconnects TCP socket after 60ms
      const abortResult = await appServer.sendAndAbort({
        path: '/api/conversation',
        body: requestPayload,
        abortAfterMs: 60
      });

      expect(abortResult.aborted).toBe(true);

      // INVARIANT G3 / F04 REPRODUCTION:
      // Upstream MUST receive abort signal when client disconnects mid-flight.
      // On baseline: server/ai.ts binds req.on('close') after body end, so upstream
      // is NEVER aborted and this expectation FAILS (RED).
      const wasAbortedByUpstream = await fakeUpstream.waitForAbort(1200);
      expect(
        wasAbortedByUpstream,
        'Upstream must receive AbortSignal when client disconnects during pending generation'
      ).toBe(true);
    });

    it('successfully completes and returns 200 when client stays connected normally', async () => {
      fakeUpstream.setResponse({
        delayMs: 50,
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
      });

      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        roleId: 'greeting',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'test-client-key-xyz',
        messages: [{ role: 'user', content: 'Xin chào' }]
      });

      expect(res.statusCode).toBe(200);
      const data = res.json() as Record<string, unknown>;
      expect(data.mode).toBe('ai');
      expect(data.content).toContain('中文：你好！');
      expect(fakeUpstream.wasAborted()).toBe(false);
    });
  });

  describe('Ping Upstream Verification: Empty body or invalid schema must not be ready', () => {
    it('rejects ping as ok=false when upstream returns HTTP 200 with an empty body', async () => {
      // Simulate upstream responding with HTTP 200 but 0 bytes / empty string
      fakeUpstream.setResponse({
        statusCode: 200,
        body: '',
        headers: { 'Content-Type': 'application/json' }
      });

      const res = await appServer.postJson('/api/conversation', {
        action: 'ping',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'test-client-key-xyz'
      });

      expect(res.statusCode).toBe(200);
      const data = res.json() as { ok: boolean; error?: string };

      // INVARIANT G3: HTTP 200 with empty body must NOT be reported as reachable/ready
      // On baseline: server/ai.ts:264 only checks pingRes.ok without inspecting response body,
      // so it wrongly reports ok=true. This expectation FAILS (RED) on baseline.
      expect(
        data.ok,
        'Ping must NOT report ok=true when upstream returns HTTP 200 with empty body'
      ).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('rejects ping as ok=false when upstream returns HTTP 200 with whitespace-only body', async () => {
      fakeUpstream.setResponse({
        statusCode: 200,
        body: '    \n  \t  ',
        headers: { 'Content-Type': 'application/json' }
      });

      const res = await appServer.postJson('/api/conversation', {
        action: 'ping',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'test-client-key-xyz'
      });

      expect(res.statusCode).toBe(200);
      const data = res.json() as { ok: boolean; error?: string };

      expect(
        data.ok,
        'Ping must NOT report ok=true when upstream returns HTTP 200 with whitespace-only body'
      ).toBe(false);
    });

    it('rejects ping as ok=false when upstream returns HTTP 200 with invalid schema or error payload', async () => {
      // Simulate upstream proxy returning HTTP 200 with HTML or schema error object
      fakeUpstream.setResponse({
        statusCode: 200,
        body: { error: 'Upstream quota exhausted', code: 'RATE_LIMIT' },
        headers: { 'Content-Type': 'application/json' }
      });

      const res = await appServer.postJson('/api/conversation', {
        action: 'ping',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'test-client-key-xyz'
      });

      expect(res.statusCode).toBe(200);
      const data = res.json() as { ok: boolean; error?: string };

      // INVARIANT G3: HTTP 200 with schema error must NOT be reported as ready
      // On baseline: server/ai.ts:264 reports ok=true regardless of schema. This FAILS (RED).
      expect(
        data.ok,
        'Ping must NOT report ok=true when upstream returns HTTP 200 with error schema'
      ).toBe(false);
    });

    it('reports ok=true when upstream returns HTTP 200 with valid chat schema', async () => {
      fakeUpstream.setResponse({
        statusCode: 200,
        body: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'pong'
              }
            }
          ]
        }
      });

      const res = await appServer.postJson('/api/conversation', {
        action: 'ping',
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'test-client-key-xyz'
      });

      expect(res.statusCode).toBe(200);
      const data = res.json() as { ok: boolean; provider?: string };
      expect(data.ok).toBe(true);
      expect(data.provider).toBeDefined();
    });
  });

  describe('Deadline Timeout & Lifecycle Enforcement', () => {
    it('cleans up and triggers guided fallback when upstream exceeds timeout deadline', async () => {
      fakeUpstream.setResponse({
        delayMs: 2500, // Exceeds requested timeout
        statusCode: 200,
        body: { choices: [{ message: { content: 'Too late' } }] }
      });

      const res = await appServer.postJson('/api/conversation', {
        action: 'chat',
        roleId: 'clinic',
        timeoutMs: 1000, // 1 second timeout
        baseUrl: fakeUpstream.getBaseUrl(),
        apiKey: 'test-client-key-xyz',
        messages: [{ role: 'user', content: 'Khám bệnh BHYT' }]
      });

      expect(res.statusCode).toBe(200);
      const data = res.json() as { mode: string; meta?: { fallbackReason?: string } };
      expect(data.mode).toBe('guided');
      expect(data.meta?.fallbackReason).toBe('timeout');
    });
  });
});
