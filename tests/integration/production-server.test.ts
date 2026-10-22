/**
 * tests/integration/production-server.test.ts
 *
 * Production Server Integration Test Suite for ZhongXue V2.
 * Owned by Subagent T14 (Independent Production Package Tester).
 *
 * Invariant G6 Verification:
 * 1. Health Probe Endpoint (/api/health): real dictionary engine total 122,596, AI config.
 * 2. Dictionary Search Endpoint (/api/dictionary): Hanzi query, ID lookup, JSON 404 on missing ID.
 * 3. Conversation Endpoint (/api/conversation): GET status ready.
 * 4. Routing Isolation (G6): non-existent /api/* routes ALWAYS return JSON 404 {"error": ...}, NEVER HTML SPA fallback.
 * 5. Static Assets & Path Traversal Protection (G6): /../.env, %2e%2e, package.json blocked with 403.
 * 6. Clean Server Shutdown: clean socket and connection closure via closeAllConnections().
 * 7. Sensitivity Enforcement (G6): server errors propagate loudly as 500/errors, NO silent fallback to fake router.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, type RunningTestServer } from '../fixtures/api/test-server.ts';
import type { HealthResponse, DictionarySearchResponse } from '../../src/types.ts';

describe('Production Server Integration Tests (T14 Invariant G6)', () => {
  let prodServer: RunningTestServer;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.AI_MODEL = 'gpt-6.1-sol';
    process.env.AI_SOL_KEY = 'sk-prod-test-sentinel-key';

    // Start production server instance connected directly to server/app.ts
    prodServer = await createTestServer({
      env: process.env,
      loadDictionary: true
    });
  });

  afterAll(async () => {
    await prodServer?.close();
    process.env = originalEnv;
  });

  // ==========================================================================
  // 1. Health Probe Endpoint (/api/health)
  // ==========================================================================
  describe('1. Health Probe Endpoint (GET /api/health)', () => {
    it('1.1 should return HTTP 200 with application/json; charset=utf-8', async () => {
      const res = await prodServer.fetch('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('1.2 should match canonical HealthResponse schema with exactly 122,596 dictionary entries', async () => {
      const res = await prodServer.fetch('/api/health');
      const data: HealthResponse = await res.json();

      // Top-level status & uptime
      expect(data.status).toBe('ok');
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);

      // Timestamp must be valid ISO string
      expect(typeof data.timestamp).toBe('string');
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);

      // Dictionary status & total entries from real CC-CEDICT database
      expect(data.dictionary).toBeDefined();
      expect(data.dictionary.loaded).toBe(true);
      expect(data.dictionary.totalEntries).toBe(122596);
      expect(typeof data.dictionary.loadTimeMs).toBe('number');

      // AI configuration
      expect(data.ai).toBeDefined();
      expect(data.ai.configured).toBe(true);
      expect(data.ai.provider).toBe('agentrouter');
      expect(data.ai.model).toBe('gpt-6.1-sol');

      // Application version
      expect(data.version).toBe('2.0.0');
    });

    it('1.3 should reject non-GET methods on /api/health with 405 Method Not Allowed', async () => {
      const res = await prodServer.fetch('/api/health', { method: 'POST' });
      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data.error?.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  // ==========================================================================
  // 2. Dictionary Search Endpoint (/api/dictionary)
  // ==========================================================================
  describe('2. Dictionary Search Endpoint (GET /api/dictionary)', () => {
    it('2.1 should return HTTP 200 with results when querying Traditional Hanzi q=學生', async () => {
      const res = await prodServer.fetch('/api/dictionary?q=學生');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data: DictionarySearchResponse = await res.json();
      expect(data.source).toBe('database');
      expect(data.query).toBe('學生');
      expect(data.total).toBeGreaterThan(0);
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);

      // Exact match must be Tier 1 at index 0
      const first = data.results[0];
      expect(first.traditional).toBe('學生');
      expect(first.simplified).toBe('学生');
      expect(first.definitions.length).toBeGreaterThan(0);
      expect(first.definitions.some((d) => d.includes('học sinh') || d.includes('sinh viên'))).toBe(true);
    });

    it('2.2 should return individual entry by id', async () => {
      // First find an entry id
      const searchRes = await prodServer.fetch('/api/dictionary?q=學生');
      const searchData: DictionarySearchResponse = await searchRes.json();
      const targetId = searchData.results[0].id;

      // Query by ID
      const res = await prodServer.fetch(`/api/dictionary?id=${targetId}`);
      expect(res.status).toBe(200);
      const item = await res.json();
      expect(item.id).toBe(targetId);
      expect(item.traditional).toBe('學生');
    });

    it('2.3 should return JSON 404 when querying non-existent entry id', async () => {
      const res = await prodServer.fetch('/api/dictionary?id=non_existent_id_999999');
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error?.code).toBe('NOT_FOUND');
    });
  });

  // ==========================================================================
  // 3. Conversation Status Probe (/api/conversation)
  // ==========================================================================
  describe('3. Conversation Endpoint (GET /api/conversation)', () => {
    it('3.1 should return HTTP 200 with status ready on GET /api/conversation', async () => {
      const res = await prodServer.fetch('/api/conversation');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.status).toBe('ready');
      expect(data.ok).toBe(true);
      expect(data.model).toBe('gpt-6.1-sol');
      expect(data.hasApiKey).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Missing Routes & Routing Isolation (/api/does-not-exist) (Invariant G6)
  // ==========================================================================
  describe('4. Non-Existent Routes Routing Isolation (Invariant G6)', () => {
    it('4.1 should return JSON 404 on /api/does-not-exist, NEVER returning HTML SPA fallback', async () => {
      const res = await prodServer.fetch('/api/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error?.code).toBe('NOT_FOUND');
      expect(data.error?.message).toMatch(/not found/i);

      // Verify strictly NO HTML was returned
      const text = JSON.stringify(data);
      expect(text).not.toContain('<!doctype html>');
      expect(text).not.toContain('<div id="root">');
    });

    it('4.2 should return JSON 404 on deep non-existent route /api/v2/nested/missing', async () => {
      const res = await prodServer.fetch('/api/v2/nested/missing');
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error?.code).toBe('NOT_FOUND');
    });

    it('4.3 should return JSON 404 on fake HTML route under /api (/api/test.html)', async () => {
      const res = await prodServer.fetch('/api/test.html');
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error?.code).toBe('NOT_FOUND');
    });
  });

  // ==========================================================================
  // 5. Static Assets & Path Traversal Protection (Invariant G6)
  // ==========================================================================
  describe('5. Static Assets & Path Traversal Protection (Invariant G6)', () => {
    it('5.1 should block path traversal /../.env with 403 Forbidden and never leak file contents', async () => {
      const res = await prodServer.fetch('/../.env');
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).not.toContain('AI_SOL_KEY');
      expect(text).not.toContain('AI_API_KEY');
    });

    it('5.2 should block URL-encoded directory traversal /%2e%2e/.env with 403 Forbidden', async () => {
      const res = await prodServer.fetch('/%2e%2e/.env');
      expect(res.status).toBe(403);
    });

    it('5.3 should block access to package.json via traversal with 403 Forbidden', async () => {
      const res = await prodServer.fetch('/../package.json');
      expect(res.status).toBe(403);
    });

    it('5.4 should block direct request to sensitive file /.env with 403 Forbidden', async () => {
      const res = await prodServer.fetch('/.env');
      expect(res.status).toBe(403);
    });

    it('5.5 should block null-byte injection attempt with 403 Forbidden', async () => {
      const res = await prodServer.fetch('/%00/test.html');
      expect(res.status).toBe(403);
    });

    it('5.6 should serve SPA HTML for valid client-side routes (e.g. /review)', async () => {
      const res = await prodServer.fetch('/review');
      // If dist/ exists, serves 200 text/html; if not yet built, serves 503 build not found
      expect([200, 503]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers.get('content-type')).toContain('text/html');
        const text = await res.text();
        expect(text).toContain('<div id="root">');
      }
    });
  });

  // ==========================================================================
  // 6. Clean Server Shutdown & Socket Lifecycle
  // ==========================================================================
  describe('6. Clean Server Shutdown Lifecycle', () => {
    it('6.1 should start an isolated server instance and close cleanly without lingering sockets', async () => {
      const ephemeralServer = await createTestServer({
        env: process.env,
        loadDictionary: false // Fast start without reloading dict
      });

      expect(ephemeralServer.server.listening).toBe(true);
      expect(ephemeralServer.port).toBeGreaterThan(0);

      // Verify server is responsive
      const res = await ephemeralServer.fetch('/api/conversation');
      expect(res.status).toBe(200);

      // Close cleanly
      await ephemeralServer.close();

      // Verify server is no longer listening
      expect(ephemeralServer.server.listening).toBe(false);
    });
  });

  // ==========================================================================
  // 7. Sensitivity Verification (Invariant G6 - Anti-Silent-Fallback)
  // ==========================================================================
  describe('7. Sensitivity Enforcement (Invariant G6 Anti-Silent-Fallback)', () => {
    it('7.1 should emit HTTP 500 when server handler throws, NEVER silently returning mock 200', async () => {
      // Construct a test server whose handler intentionally crashes
      const brokenServer = await createTestServer({
        loadDictionary: false,
        customHandler: async () => {
          throw new Error('Simulated critical server error inside handler');
        }
      });

      try {
        const res = await brokenServer.fetch('/api/health');
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error?.code).toBe('INTERNAL_ERROR');
        expect(data.error?.message).toContain('Simulated critical server error');
      } finally {
        await brokenServer.close();
      }
    });
  });
});
