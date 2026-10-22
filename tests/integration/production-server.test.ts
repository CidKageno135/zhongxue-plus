/**
 * tests/integration/production-server.test.ts
 *
 * Production Server Integration Test Suite for ZhongXue V2.
 * Owned by Subagent A16 (QA API & Independent Security Lead).
 *
 * Verifies the production server instance conforming to docs/API-CONTRACT.md:
 * 1. GET /api/health returns HTTP 200 matching HealthResponse schema (status 'ok',
 *    dictionary.loaded: true, dictionary.totalEntries: 122596).
 * 2. GET /api/dictionary?q=學生 returns HTTP 200 with JSON search results and ranking.
 * 3. GET /api/conversation returns HTTP 200 with JSON status ('ready').
 * 4. Non-existent route /api/does-not-exist returns JSON 404 (NOT HTML!).
 * 5. Clean server shutdown without lingering sockets.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, type RunningTestServer } from '../fixtures/api/test-server.ts';
import type { HealthResponse, DictionarySearchResponse } from '../../src/types.ts';

describe('Production Server Integration Tests (A16 Independent QA)', () => {
  let prodServer: RunningTestServer;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.AI_MODEL = 'gpt-6.1-sol';
    process.env.AI_SOL_KEY = 'sk-prod-test-sentinel-key';

    // Start production server instance on dynamic/ephemeral port
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

      // Dictionary status & total entries (Resolution of DICT-02)
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
      expect(first.definitions.some(d => d.includes('học sinh') || d.includes('sinh viên'))).toBe(true);
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
  // 4. Missing Routes & Routing Isolation (/api/does-not-exist)
  // ==========================================================================
  describe('4. Non-Existent Routes Routing Isolation', () => {
    it('4.1 should return JSON 404 on /api/does-not-exist, NEVER returning HTML SPA fallback', async () => {
      const res = await prodServer.fetch('/api/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = await res.json();
      expect(data.error?.code).toBe('NOT_FOUND');
      expect(data.error?.message).toMatch(/not found/i);

      // Verify no HTML was returned
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
  });

  // ==========================================================================
  // 5. Clean Server Shutdown
  // ==========================================================================
  describe('5. Clean Server Shutdown Lifecycle', () => {
    it('5.1 should start an isolated server instance and close cleanly without lingering sockets', async () => {
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
});
