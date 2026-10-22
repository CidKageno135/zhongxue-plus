/**
 * tests/api-client.test.ts
 *
 * Comprehensive Unit Test Suite for Client API Adapter (src/services/api.ts).
 * Owned by Subagent A08 (Client API Adapter Lead).
 *
 * Verifies:
 * 1. checkBackendHealth:
 *    - JSON 200 -> online: true, reads dynamic totalEntries.
 *    - HTML 200 (SPA fallback simulation) -> online: false (NEVER true!).
 *    - HTTP 503/500 -> online: false.
 *    - Network error / fetch rejection -> online: false.
 *    - Degraded backend -> online: false.
 * 2. searchDictionary & getDictionaryDetail:
 *    - Online API search returning database results.
 *    - Offline graceful fallback to searchLocalLessons.
 *    - Fallback on HTML 200 SPA response.
 *    - Active AbortSignal cancellation rethrows AbortError.
 *    - Empty query handling.
 *    - Detail retrieval online and offline fallback.
 * 3. searchLocalLessons (A07 Normalization Integration):
 *    - Matches accented Pinyin ('xuéshēng').
 *    - Matches tone-numbered Pinyin ('xue2 sheng1').
 *    - Matches toneless Pinyin ('xuesheng').
 *    - Matches unaccented Vietnamese ('hoc sinh').
 *    - Matches accented Vietnamese ('học sinh').
 *    - Mode-specific filtering ('hanzi', 'pinyin', 'vi').
 * 4. sendAiMessage:
 *    - Online live AI response handling.
 *    - Server guided fallback response handling with metadata.
 *    - AbortSignal active cancellation rethrowing AbortError.
 *    - Offline local guided tutor generation.
 *    - Dual signature support (options object & legacy positional).
 * 5. recognizeHandwriting:
 *    - Online recognition candidates.
 *    - AbortSignal cancellation.
 *    - Fallback to client geometric recognizer on network failure or empty candidates.
 *    - Input validation for empty or malformed strokes.
 * 6. checkAiHealth:
 *    - Online ping check and offline error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkBackendHealth,
  searchDictionary,
  getDictionaryDetail,
  searchLocalLessons,
  sendAiMessage,
  recognizeHandwriting,
  recognizeHandwritingDetailed,
  checkAiHealth,
  fallbackClientHandwriting,
  type HandwritingStroke,
  type ConversationTurn
} from '../src/services/api';

describe('A08: Client API Adapter (src/services/api.ts)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ==========================================================================
  // 1. checkBackendHealth
  // ==========================================================================
  describe('1. checkBackendHealth()', () => {
    it('returns online: true and reads dynamic totalEntries when /api/health returns valid JSON', async () => {
      const mockHealthPayload = {
        status: 'ok',
        uptime: 1234,
        timestamp: '2026-10-21T12:00:00.000Z',
        dictionary: {
          loaded: true,
          totalEntries: 122596,
          loadTimeMs: 450
        },
        ai: {
          configured: true,
          provider: 'agentrouter',
          model: 'gpt-6.1-sol'
        },
        version: '2.0.0'
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8'
        }),
        json: async () => mockHealthPayload
      } as Response);

      const result = await checkBackendHealth();

      expect(result.online).toBe(true);
      expect(result.totalEntries).toBe(122596);
      expect(result.status).toBe('ok');
      expect(result.version).toBe('2.0.0');
      expect(result.ai?.provider).toBe('agentrouter');

      // Verify request was sent to same-origin /api/health (NEVER :3001)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe('/api/health');
      expect(String(callArgs[0])).not.toContain(':3001');
    });

    it('returns online: false when server returns HTML 200 (SPA fallback simulation)', async () => {
      // Simulation of Vite preview or Nginx SPA fallback where /api/health returns index.html
      const spaHtml = '<!doctype html><html lang="en"><head><title>ZhongXue</title></head><body><div id="root"></div></body></html>';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'text/html; charset=utf-8'
        }),
        text: async () => spaHtml,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        }
      } as unknown as Response);

      const result = await checkBackendHealth();

      // Under NO circumstances should HTML 200 be treated as online!
      expect(result.online).toBe(false);
      expect(result.totalEntries).toBe(40);
      expect(result.status).toBe('offline');
    });

    it('returns online: false when server returns HTTP 503 (dictionary not ready)', async () => {
      const degradedPayload = {
        status: 'degraded',
        uptime: 5,
        dictionary: {
          loaded: false,
          totalEntries: 0
        }
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
        json: async () => degradedPayload
      } as Response);

      const result = await checkBackendHealth();

      expect(result.online).toBe(false);
      expect(result.totalEntries).toBe(40);
    });

    it('returns online: false when server returns HTTP 500 internal server error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: { code: 'INTERNAL_ERROR', message: 'Crash' } })
      } as Response);

      const result = await checkBackendHealth();

      expect(result.online).toBe(false);
      expect(result.totalEntries).toBe(40);
    });

    it('returns online: false when network throws (offline / connection refused)', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await checkBackendHealth();

      expect(result.online).toBe(false);
      expect(result.totalEntries).toBe(40);
      expect(result.status).toBe('offline');
    });

    it('returns online: false when JSON body has status "degraded" even if HTTP status was 200', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          status: 'degraded',
          dictionary: { loaded: false, totalEntries: 0 }
        })
      } as Response);

      const result = await checkBackendHealth();

      expect(result.online).toBe(false);
      expect(result.status).toBe('degraded');
    });
  });

  // ==========================================================================
  // 2. searchDictionary & getDictionaryDetail
  // ==========================================================================
  describe('2. searchDictionary() and getDictionaryDetail()', () => {
    it('returns online database results when /api/dictionary succeeds', async () => {
      const mockDbResponse = {
        results: [
          {
            id: 'dict-101',
            traditional: '學生',
            simplified: '学生',
            pinyin: 'xué sheng',
            definitions: ['học sinh', 'sinh viên']
          }
        ],
        total: 1,
        count: 1,
        offset: 0,
        limit: 20,
        query: '學生',
        mode: 'all',
        source: 'database'
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockDbResponse
      } as Response);

      const res = await searchDictionary('學生', 'all', 0, 20);

      expect(res.source).toBe('database');
      expect(res.results).toHaveLength(1);
      expect(res.results[0].traditional).toBe('學生');
      expect(res.total).toBe(1);

      // Verify request path
      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('/api/dictionary?q=%E5%AD%B8%E7%94%9F');
      expect(url).not.toContain(':3001');
    });

    it('returns empty results immediately for blank query without calling fetch', async () => {
      globalThis.fetch = vi.fn();

      const res = await searchDictionary('   ');

      expect(res.results).toHaveLength(0);
      expect(res.total).toBe(0);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('gracefully falls back to local curriculum search when backend returns network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network connection refused'));

      const res = await searchDictionary('xuéshēng', 'all', 0, 10);

      expect(res.source).toBe('local');
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results.some(r => r.traditional === '學生')).toBe(true);
      expect(res.total).toBeGreaterThan(0);
    });

    it('gracefully falls back to local search when backend returns HTML 200 SPA page', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'text/html' }),
        text: async () => '<!doctype html><html></html>'
      } as unknown as Response);

      const res = await searchDictionary('hoc sinh', 'all');

      expect(res.source).toBe('local');
      expect(res.results.some(r => r.traditional === '學生')).toBe(true);
    });

    it('gracefully falls back to local search when backend returns HTTP 500 error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: 'Database crashed' })
      } as Response);

      const res = await searchDictionary('學生');

      expect(res.source).toBe('local');
      expect(res.results.some(r => r.traditional === '學生')).toBe(true);
    });

    it('rethrows AbortError when search request is actively cancelled by client AbortSignal', async () => {
      const controller = new AbortController();
      controller.abort();

      globalThis.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
        if (init?.signal?.aborted) {
          const err = new DOMException('The operation was aborted', 'AbortError');
          return Promise.reject(err);
        }
        return Promise.resolve(new Response());
      });

      await expect(
        searchDictionary('學生', 'all', 0, 20, controller.signal)
      ).rejects.toThrow();
    });

    it('paginates local search results correctly with offset and limit', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      // Search broad query with offset=0, limit=1
      const page1 = await searchDictionary('a', 'all', 0, 1);
      expect(page1.source).toBe('local');
      expect(page1.limit).toBe(1);
      expect(page1.offset).toBe(0);
      expect(page1.results.length).toBeLessThanOrEqual(1);

      // Search broad query with offset=1, limit=1
      const page2 = await searchDictionary('a', 'all', 1, 1);
      expect(page2.offset).toBe(1);
      expect(page2.limit).toBe(1);
    });

    it('getDictionaryDetail returns online entry when available', async () => {
      const mockDetail = {
        id: 'dict-999',
        traditional: '高鐵',
        simplified: '高铁',
        pinyin: 'gāotiě',
        definitions: ['đường sắt cao tốc Đài Loan (THSR)']
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockDetail
      } as Response);

      const detail = await getDictionaryDetail('dict-999');

      expect(detail).not.toBeNull();
      expect(detail?.traditional).toBe('高鐵');
      expect(detail?.pinyin).toBe('gāotiě');
    });

    it('getDictionaryDetail falls back to local words when backend is offline', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const detail = await getDictionaryDetail('dict-fallback-xuesheng');

      expect(detail).not.toBeNull();
      expect(detail?.traditional).toBe('學生');
      expect(detail?.definitions[0]).toContain('Học sinh');
    });

    it('getDictionaryDetail returns null when entry does not exist anywhere', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'Content-Type': 'application/json' })
      } as Response);

      const detail = await getDictionaryDetail('non-existent-id-999999');

      expect(detail).toBeNull();
    });
  });

  // ==========================================================================
  // 3. searchLocalLessons (A07 Normalization Integration)
  // ==========================================================================
  describe('3. searchLocalLessons() with A07 Search Normalization', () => {
    it('matches accented Pinyin "xuéshēng"', () => {
      const results = searchLocalLessons('xuéshēng');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.traditional === '學生')).toBe(true);
    });

    it('matches tone-numbered Pinyin "xue2 sheng1"', () => {
      const results = searchLocalLessons('xue2 sheng1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.traditional === '學生')).toBe(true);
    });

    it('matches toneless Pinyin "xuesheng"', () => {
      const results = searchLocalLessons('xuesheng');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.traditional === '學生')).toBe(true);
    });

    it('matches unaccented Vietnamese "hoc sinh"', () => {
      const results = searchLocalLessons('hoc sinh');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.traditional === '學生')).toBe(true);
    });

    it('matches accented Vietnamese "học sinh"', () => {
      const results = searchLocalLessons('học sinh');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.traditional === '學生')).toBe(true);
    });

    it('matches Hanzi "學生"', () => {
      const results = searchLocalLessons('學生');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].traditional).toBe('學生');
    });

    it('searches curriculum words: "tra sua" matches 珍珠奶茶', () => {
      const results = searchLocalLessons('tra sua');
      expect(results.some(r => r.traditional === '珍珠奶茶')).toBe(true);
    });

    it('searches curriculum words: "zhenzhu naicha" matches 珍珠奶茶', () => {
      const results = searchLocalLessons('zhenzhu naicha');
      expect(results.some(r => r.traditional === '珍珠奶茶')).toBe(true);
    });

    it('respects mode: "pinyin" filtering', () => {
      const results = searchLocalLessons('xuesheng', 'pinyin');
      expect(results.some(r => r.traditional === '學生')).toBe(true);

      // Vietnamese definition match should be excluded in pinyin mode
      const viOnlyResults = searchLocalLessons('học sinh', 'pinyin');
      expect(viOnlyResults.some(r => r.traditional === '學生')).toBe(false);
    });

    it('respects mode: "vi" filtering', () => {
      const results = searchLocalLessons('học sinh', 'vi');
      expect(results.some(r => r.traditional === '學生')).toBe(true);

      // Pinyin match should be excluded in vi mode
      const pinyinResults = searchLocalLessons('xuéshēng', 'vi');
      expect(pinyinResults.some(r => r.traditional === '學生')).toBe(false);
    });

    it('returns empty array on blank query', () => {
      expect(searchLocalLessons('')).toEqual([]);
      expect(searchLocalLessons('   ')).toEqual([]);
    });
  });

  // ==========================================================================
  // 4. sendAiMessage
  // ==========================================================================
  describe('4. sendAiMessage()', () => {
    it('returns live AI response when /api/conversation responds with mode "ai"', async () => {
      const mockReply = {
        mode: 'ai' as const,
        content: '中文：你好！\nPinyin: Nǐ hǎo!\nTiếng Việt: Xin chào!\n練習：Chào lại nhé!',
        model: 'gpt-6.1-sol',
        provider: 'agentrouter',
        thread: {
          id: 42,
          messages: [{ role: 'assistant' as const, content: '你好！' }]
        },
        meta: {
          latencyMs: 120
        }
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockReply
      } as Response);

      const reply = await sendAiMessage('Xin chào');

      expect(reply.mode).toBe('ai');
      expect(reply.content).toContain('中文：你好！');
      expect(reply.model).toBe('gpt-6.1-sol');
      expect(reply.provider).toBe('agentrouter');
      expect(reply.thread?.id).toBe(42);

      const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toBe('/api/conversation');
      expect(String(callArgs[0])).not.toContain(':3001');
    });

    it('handles server-side guided fallback response with mode "guided"', async () => {
      const mockGuidedReply = {
        mode: 'guided' as const,
        content: '中文：組長，機台故障了。\nPinyin: ...\nTiếng Việt: ...\n練習：...',
        meta: {
          fallbackReason: 'upstream_error' as const,
          guidanceNote: 'Mô hình bận, đã kích hoạt gia sư hướng dẫn cục bộ'
        }
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockGuidedReply
      } as Response);

      const reply = await sendAiMessage('Báo máy hỏng', { roleId: 'factory' });

      expect(reply.mode).toBe('guided');
      expect(reply.content).toContain('組長');
      expect(reply.meta?.fallbackReason).toBe('upstream_error');
    });

    it('rethrows AbortError when AbortSignal is aborted by user (cancelling UI chat)', async () => {
      const controller = new AbortController();
      controller.abort();

      globalThis.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
        if (init?.signal?.aborted) {
          return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
        }
        return Promise.resolve(new Response());
      });

      // Passing signal via options object
      await expect(
        sendAiMessage('Hello', { signal: controller.signal })
      ).rejects.toThrow();

      // Passing signal via legacy positional argument
      await expect(
        sendAiMessage('Hello', 1, [], undefined, 'factory', undefined, controller.signal)
      ).rejects.toThrow();
    });

    it('gracefully triggers client-side simulateLocalAiReply when backend network fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const reply = await sendAiMessage('máy hỏng tăng ca', { roleId: 'factory' });

      expect(reply.mode).toBe('guided');
      expect(reply.content).toContain('組長');
      expect(reply.meta?.fallbackReason).toBe('offline');
      expect(reply.meta?.guidanceNote).toContain('Ngoại tuyến');
    });

    it('gracefully triggers client-side simulateLocalAiReply on HTTP 500 error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: 'Upstream crashed' })
      } as Response);

      const reply = await sendAiMessage('183 ngày hoàn thuế', { roleId: 'tax' });

      expect(reply.mode).toBe('guided');
      expect(reply.content).toContain('綜合所得稅');
      expect(reply.content).toContain('183');
    });

    it('supports legacy positional arguments signature used in AiChatView', async () => {
      const history: ConversationTurn[] = [
        { role: 'user', content: 'Chào bạn' },
        { role: 'assistant', content: 'Chào bạn! Tôi có thể giúp gì?' }
      ];

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const reply = await sendAiMessage(
        'Cho tôi một ly trà sữa',
        1,
        history,
        undefined,
        'tea',
        'deepseek-v4-flash'
      );

      expect(reply.mode).toBe('guided');
      expect(reply.content).toContain('珍珠奶茶');
    });

    it('supports messages array input format', async () => {
      const messages: ConversationTurn[] = [
        { role: 'user', content: 'Thuê xe máy một ngày bao nhiêu tiền?' }
      ];

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const reply = await sendAiMessage(messages, { roleId: 'scooter' });

      expect(reply.mode).toBe('guided');
      expect(reply.content).toContain('租機車');
    });
  });

  // ==========================================================================
  // 5. recognizeHandwriting
  // ==========================================================================
  describe('5. recognizeHandwriting()', () => {
    // Standard horizontal stroke (representing character '一')
    const sampleStrokes: HandwritingStroke[] = [
      [[50, 100, 150, 200], [100, 100, 100, 100], [0, 50, 100, 150]]
    ];

    it('exposes local fallback provenance after HTTP failure instead of claiming online recognition', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 502 }));
      const result = await recognizeHandwritingDetailed(sampleStrokes);
      expect(result.source).toBe('local_fallback');
      expect(result.candidates[0]).toBe('一');
    });

    it('preserves backend local fallback provenance and distinguishes online candidates', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        candidates: ['一'], source: 'local_fallback'
      }), { headers: { 'Content-Type': 'application/json' } }));
      expect((await recognizeHandwritingDetailed(sampleStrokes)).source).toBe('local_fallback');
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        candidates: ['一'], source: 'google'
      }), { headers: { 'Content-Type': 'application/json' } }));
      expect((await recognizeHandwritingDetailed(sampleStrokes)).source).toBe('online');
    });

    it('returns candidate characters when /api/handwriting succeeds', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          candidates: ['一', '二', '三'],
          source: 'google'
        })
      } as Response);

      const candidates = await recognizeHandwriting(sampleStrokes);

      expect(candidates).toEqual(['一', '二', '三']);
      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toBe('/api/handwriting');
      expect(String(url)).not.toContain(':3001');
    });

    it('rethrows AbortError when AbortSignal is cancelled', async () => {
      const controller = new AbortController();
      controller.abort();

      globalThis.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
        if (init?.signal?.aborted) {
          return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
        }
        return Promise.resolve(new Response());
      });

      await expect(
        recognizeHandwriting(sampleStrokes, controller.signal)
      ).rejects.toThrow();
    });

    it('falls back cleanly to client geometric handwriting recognizer on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const candidates = await recognizeHandwriting(sampleStrokes);

      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toBe('一');
    });

    it('falls back to client handwriting recognizer when API returns empty candidates', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          candidates: [],
          source: 'local_fallback'
        })
      } as Response);

      const candidates = await recognizeHandwriting(sampleStrokes);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toBe('一');
    });

    it('validates input and returns empty array without network call for invalid or empty strokes', async () => {
      globalThis.fetch = vi.fn();

      expect(await recognizeHandwriting([])).toEqual([]);
      // @ts-expect-error testing invalid input
      expect(await recognizeHandwriting(null)).toEqual([]);
      // @ts-expect-error testing invalid stroke structure
      expect(await recognizeHandwriting([['invalid']])).toEqual([]);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('supports options object and positional width/height arguments', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ candidates: ['一'], source: 'google' })
      } as Response);

      // Options object call
      await recognizeHandwriting(sampleStrokes, { width: 400, height: 400 });
      // Positional call (as in HandwritingPad.tsx)
      await recognizeHandwriting(sampleStrokes, 350, 350);

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('fallbackClientHandwriting classifies single horizontal stroke as "一"', () => {
      const candidates = fallbackClientHandwriting(sampleStrokes);
      expect(candidates[0]).toBe('一');
    });

    it('classifies various stroke geometries correctly in fallbackClientHandwriting', () => {
      // Dot stroke (small w and h)
      const dotStroke: HandwritingStroke = [
        [100, 105], [100, 105], [0, 50]
      ];
      expect(fallbackClientHandwriting([dotStroke]).length).toBeGreaterThan(0);

      // Vertical stroke (dx small, dy positive and large)
      const verticalStroke: HandwritingStroke = [
        [100, 100], [50, 150], [0, 50]
      ];
      expect(fallbackClientHandwriting([verticalStroke]).length).toBeGreaterThan(0);

      // Turning stroke (dx > 20, dy > 20)
      const turningStroke: HandwritingStroke = [
        [50, 100, 120], [50, 60, 120], [0, 50, 100]
      ];
      expect(fallbackClientHandwriting([turningStroke]).length).toBeGreaterThan(0);

      // Left-falling (P) and Right-falling (N) stroke combination for '人' or '八'
      const pStroke: HandwritingStroke = [
        [100, 70], [50, 150], [0, 50]
      ];
      const nStroke: HandwritingStroke = [
        [100, 150], [80, 160], [0, 50]
      ];
      const candidates2 = fallbackClientHandwriting([pStroke, nStroke]);
      expect(candidates2.some(c => c === '人' || c === '八' || c === '入')).toBe(true);

      // 4-stroke '中' pattern
      const s1: HandwritingStroke = [[100, 100], [50, 150], [0, 50]];
      const z1: HandwritingStroke = [[100, 150, 150], [50, 50, 100], [0, 50, 100]];
      const h1: HandwritingStroke = [[100, 150], [100, 100], [0, 50]];
      const s2: HandwritingStroke = [[125, 125], [30, 170], [0, 50]];
      const zhongCandidates = fallbackClientHandwriting([s1, z1, h1, s2]);
      expect(zhongCandidates).toContain('中');
    });
  });

  // ==========================================================================
  // 6. checkAiHealth
  // ==========================================================================
  describe('6. checkAiHealth()', () => {
    it('returns ok: true when /api/conversation ping succeeds', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          ok: true,
          provider: 'agentrouter',
          model: 'gpt-6.1-sol',
          baseUrl: 'https://agentrouter.org/v1',
          latencyMs: 95
        })
      } as Response);

      const status = await checkAiHealth('gpt-6.1-sol', 'sk-test', 'https://agentrouter.org/v1');

      expect(status.ok).toBe(true);
      expect(status.provider).toBe('agentrouter');
      expect(status.model).toBe('gpt-6.1-sol');
    });

    it('returns ok: false on network connection failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const status = await checkAiHealth('deepseek-v4-flash');

      expect(status.ok).toBe(false);
      expect(status.error).toContain('Connection refused');
    });
  });

  // ==========================================================================
  // 7. simulateLocalAiReply Scenarios Coverage
  // ==========================================================================
  describe('7. simulateLocalAiReply() Taiwan Everyday Scenarios', () => {
    it('covers semiconductor / tech scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Bán dẫn 3nm phòng sạch wafer TSMC', { roleId: 'tech' });
      expect(reply.content).toContain('晶圓');
      expect(reply.content).toContain('良率');
    });

    it('covers scooter rental scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Thuê xe máy', { roleId: 'scooter' });
      expect(reply.content).toContain('租機車');
      expect(reply.content).toContain('安全帽');
    });

    it('covers job interview scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Phỏng vấn xin việc lương', { roleId: 'interview' });
      expect(reply.content).toContain('面試');
      expect(reply.content).toContain('專業背景');
    });

    it('covers bubble tea scenario by keyword matching', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Tôi muốn uống trà sữa trân châu nửa đường ít đá');
      expect(reply.content).toContain('珍珠奶茶');
      expect(reply.content).toContain('半糖少冰');
    });

    it('covers MRT and EasyCard commute scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Đi ga MRT gần nhất chuyển tàu ở đâu');
      expect(reply.content).toContain('捷運站');
      expect(reply.content).toContain('悠遊卡');
    });

    it('covers night market food scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Chợ đêm mì bò bao nhiêu tiền');
      expect(reply.content).toContain('牛肉麵');
      expect(reply.content).toContain('夜市');
    });

    it('covers convenience store payment scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Cửa hàng tiện lợi 7-11 thanh toán tiền mặt hóa đơn');
      expect(reply.content).toContain('發票');
      expect(reply.content).toContain('現金');
    });

    it('covers rental apartment and deposit scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Thuê phòng trọ tiền cọc điện nước');
      expect(reply.content).toContain('房租');
      expect(reply.content).toContain('押金');
    });

    it('covers clinic and medical insurance scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Đi khám bác sĩ bị sốt đau đầu');
      expect(reply.content).toContain('健保卡');
      expect(reply.content).toContain('不舒服');
    });

    it('covers bank account and ARC residency scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Mở tài khoản ngân hàng cần thẻ cư trú ARC và con dấu');
      expect(reply.content).toContain('居留證');
      expect(reply.content).toContain('印章');
    });

    it('covers workplace meeting and leave scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Hôm nay đi làm họp xin nghỉ phép');
      expect(reply.content).toContain('開會');
      expect(reply.content).toContain('請假');
    });

    it('covers translation assistance request', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Câu này dịch sang tiếng Trung nói thế nào');
      expect(reply.content).toContain('請問這個用中文怎麼說');
    });

    it('covers default general greeting scenario', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
      const reply = await sendAiMessage('Chào buổi sáng bạn nhé!');
      expect(reply.content).toContain('你好');
      expect(reply.content).toContain('繁體中文');
    });
  });

  // ==========================================================================
  // 7. Acceptance G5 & F06: Dictionary Contract 3-Number Separation, Pagination & Corpus Protection
  // ==========================================================================
  describe('7. Acceptance G5 & F06: Dictionary Contract 3-Number Separation & Corpus Protection (Invariant G5)', () => {
    it('F06 Contract Reproduction: searchDictionary response explicitly separates dictionaryTotal, totalMatches, and pageCount', async () => {
      // Backend returns simulated search response for broad query "de" with limit 20
      const mockBackendResponse = {
        results: Array.from({ length: 20 }, (_, i) => ({
          id: `dict-de-${i + 1}`,
          traditional: `的${i}`,
          simplified: `的${i}`,
          pinyin: 'de',
          definitions: [`nghĩa ${i + 1}`]
        })),
        total: 10622,
        count: 20,
        dictionaryTotal: 122596,
        totalMatches: 10622,
        pageCount: 20,
        offset: 0,
        limit: 20,
        query: 'de',
        mode: 'all',
        source: 'database'
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockBackendResponse
      } as Response);

      const res = await searchDictionary('de', 'all', 0, 20);

      expect(res.source).toBe('database');
      expect(res.results).toHaveLength(20);

      // Invariant G5: Contract must clearly expose the 3 distinct numbers
      // 1. dictionaryTotal: total items in the entire dictionary (e.g. 122,596)
      // 2. totalMatches: total query matches across the database (e.g. 10,622)
      // 3. pageCount: items returned in current page (e.g. 20)
      const extendedRes = res as unknown as {
        dictionaryTotal?: number;
        totalMatches?: number;
        pageCount?: number;
      };

      expect(extendedRes.dictionaryTotal).toBe(122596);
      expect(extendedRes.totalMatches ?? res.total).toBe(10622);
      expect(extendedRes.pageCount ?? res.count).toBe(20);

      // Mutual exclusivity invariants: the 3 numbers must NOT be confused with each other
      expect(extendedRes.dictionaryTotal).not.toBe(extendedRes.totalMatches);
      expect(extendedRes.dictionaryTotal).not.toBe(extendedRes.pageCount);
      expect(extendedRes.totalMatches).not.toBe(extendedRes.pageCount);
    });

    it('G5 Contract Invariant: multi-page pagination preserves dictionaryTotal and totalMatches across consecutive pages', async () => {
      const mockPage1 = {
        results: Array.from({ length: 20 }, (_, i) => ({
          id: `dict-de-${i}`,
          traditional: `的${i}`,
          simplified: `的${i}`,
          pinyin: 'de',
          definitions: ['trợ từ']
        })),
        total: 10622,
        count: 20,
        dictionaryTotal: 122596,
        totalMatches: 10622,
        pageCount: 20,
        offset: 0,
        limit: 20,
        query: 'de',
        mode: 'all',
        source: 'database'
      };

      const mockPage2 = {
        results: Array.from({ length: 20 }, (_, i) => ({
          id: `dict-de-${i + 20}`,
          traditional: `得${i}`,
          simplified: `得${i}`,
          pinyin: 'de',
          definitions: ['trợ từ']
        })),
        total: 10622,
        count: 20,
        dictionaryTotal: 122596,
        totalMatches: 10622,
        pageCount: 20,
        offset: 20,
        limit: 20,
        query: 'de',
        mode: 'all',
        source: 'database'
      };

      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => mockPage1
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => mockPage2
        } as Response);

      const page1 = await searchDictionary('de', 'all', 0, 20);
      const page2 = await searchDictionary('de', 'all', 20, 20);

      const ext1 = page1 as unknown as { dictionaryTotal?: number; totalMatches?: number; pageCount?: number };
      const ext2 = page2 as unknown as { dictionaryTotal?: number; totalMatches?: number; pageCount?: number };

      expect(ext1.dictionaryTotal).toBe(122596);
      expect(ext2.dictionaryTotal).toBe(122596);
      expect(ext1.totalMatches ?? page1.total).toBe(10622);
      expect(ext2.totalMatches ?? page2.total).toBe(10622);
      expect(ext1.pageCount ?? page1.count).toBe(20);
      expect(ext2.pageCount ?? page2.count).toBe(20);

      // Verify that page 1 and page 2 contain distinct results
      expect(page1.results[0].id).not.toBe(page2.results[0].id);
    });

    it('G5 Corpus Protection: corpus-only entry (not in lessons) must return source "database" and NEVER let local fallback silently hide API crash with 0 results', async () => {
      // 1. Online: Searching corpus-only word "乾杯" (cheers / cạn ly, cv_3306)
      const mockGanbeiResponse = {
        results: [
          {
            id: 'cv_3306',
            traditional: '乾杯',
            simplified: '干杯',
            pinyin: 'gan1 bei1',
            definitions: ['cạn ly', 'uống cạn']
          }
        ],
        total: 1,
        count: 1,
        dictionaryTotal: 122596,
        totalMatches: 1,
        pageCount: 1,
        offset: 0,
        limit: 20,
        query: '乾杯',
        mode: 'all',
        source: 'database'
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockGanbeiResponse
      } as Response);

      const onlineRes = await searchDictionary('乾杯', 'all', 0, 20);
      expect(onlineRes.source).toBe('database');
      expect(onlineRes.results).toHaveLength(1);
      expect(onlineRes.results[0].traditional).toBe('乾杯');

      // 2. Offline / API crash: Backend returns 500 Internal Server Error
      // Invariant G5: "Từ chỉ có ở corpus (không nằm trong bài học mặc định) phải trả về nguồn từ điển,
      // không được để local fallback âm thầm che giấu khi API hỏng."
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: 'Dictionary database failure' })
      } as Response);

      const crashRes = await searchDictionary('乾杯', 'all', 0, 20);

      // The client MUST NOT return source: 'local' with 0 results silently masquerading as a successful empty search!
      // It must indicate an error condition (apiFailed, error flag, or non-silent degradation)
      const crashExt = crashRes as unknown as { apiFailed?: boolean; error?: unknown; degraded?: boolean };
      expect(crashExt.apiFailed || crashExt.degraded || crashRes.source !== 'local' || crashRes.results.length > 0).toBe(true);
    });

    it('G5 Search Normalization in Client Adapter: finds 學生 across all representations (traditional, simplified, pinyin tone/toneless/numbered, vietnamese accented/unaccented)', async () => {
      const mockStudentResponse = {
        results: [
          {
            id: 'cv_31249',
            traditional: '學生',
            simplified: '学生',
            pinyin: 'xue2 sheng5',
            definitions: ['học sinh', 'sinh viên']
          }
        ],
        total: 12,
        count: 1,
        dictionaryTotal: 122596,
        totalMatches: 12,
        pageCount: 1,
        offset: 0,
        limit: 20,
        query: '學生',
        mode: 'all',
        source: 'database'
      };

      for (const query of ['學生', '学生', 'xuesheng', 'xuéshēng', 'xue2 sheng1', 'học sinh', 'hoc sinh']) {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => ({ ...mockStudentResponse, query })
        } as Response);

        const res = await searchDictionary(query, 'all', 0, 20);
        expect(res.source).toBe('database');
        expect(res.results.some(r => r.traditional === '學生')).toBe(true);
      }
    });
  });
});
