import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeConversation,
  handleConversationRoute,
  buildTutorSystemPrompt,
  extractAiResponseText,
  DEFAULT_AI_TIMEOUT_MS,
  MAX_AI_TIMEOUT_MS,
  MIN_AI_TIMEOUT_MS
} from '../server/ai.ts';
import {
  generateSinologyAiReply,
  createGuidedFallbackReply,
  SINOLOGY_SCENARIOS
} from '../server/aiFallback.ts';
import type { ConversationReply, AiConnectionStatus, ConversationRequestBody } from '../src/types.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

describe('Credential boundary regressions R3/R4', () => {
  const messages: ConversationRequestBody['messages'] = [{ role: 'user', content: '你好' }];

  it.each([
    'https://openrouter.ai.attacker.invalid/v1',
    'https://openrouter.ai/api/v1?unsafe=1',
    'https://openrouter.ai/api/v1#unsafe',
    'http://openrouter.ai/api/v1'
  ])('never dispatches a rejected configured OpenRouter URL: %s', async (baseUrl) => {
    const fetchFn = vi.fn();
    await executeConversation({ messages }, {
      env: { AI_BASE_URL: baseUrl, AI_API_KEY: 'fake-generic-sentinel' }, fetchFn
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('does not send an AgentRouter DeepSeek model key to direct DeepSeek', async () => {
    const fetchFn = vi.fn();
    await executeConversation({ messages, baseUrl: 'https://api.deepseek.com/v1' }, {
      env: { AI_DEEPSEEK_KEY: 'fake-agentrouter-model-key' }, fetchFn
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    { baseUrl: 'https://agentrouter.org/v1', env: { AI_BASE_URL: 'https://openrouter.ai/api/v1', AI_API_KEY: 'fake-openrouter-generic' } },
    { baseUrl: 'https://api.openrouter.ai/v1', env: { AI_BASE_URL: 'https://openrouter.ai/api/v1', AI_API_KEY: 'fake-openrouter-generic' } },
    { baseUrl: 'https://openrouter.ai/api/v1', env: { AI_API_KEY: 'fake-agentrouter-generic' } }
  ])('never dispatches a generic key to a different configured origin: $baseUrl', async ({ baseUrl, env }) => {
    const fetchFn = vi.fn();
    await executeConversation({ messages, baseUrl }, { env, fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    { baseUrl: 'https://openrouter.ai/api/v1', env: { AI_BASE_URL: 'https://openrouter.ai/api/v1', AI_API_KEY: 'fake-openrouter-generic' }, key: 'fake-openrouter-generic' },
    { baseUrl: 'https://agentrouter.org/v1', env: { AI_DEEPSEEK_KEY: 'fake-agentrouter-model' }, key: 'fake-agentrouter-model' },
    { baseUrl: 'https://api.deepseek.com/v1', env: { AI_DEEPSEEK_KEY: 'fake-agentrouter-model', AI_DEEPSEEK_DIRECT_KEY: 'fake-direct' }, key: 'fake-direct' },
    { baseUrl: 'https://openrouter.ai/api/v1', env: { AI_OPENROUTER_KEY: 'fake-openrouter-dedicated', AI_API_KEY: 'fake-agentrouter-generic' }, key: 'fake-openrouter-dedicated' }
  ])('dispatches exactly once with the correct key: $key', async ({ baseUrl, env, key }) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '中文：你好\nPinyin: nǐ hǎo\nTiếng Việt: Xin chào\n練習：再說一次' } }]
    }), { status: 200 }));
    const result = await executeConversation({ messages, baseUrl, model: 'deepseek-v4-flash' }, { env, fetchFn });
    expect(result.body).toMatchObject({ mode: 'ai' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(`${baseUrl}/chat/completions`);
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: `Bearer ${key}` });
  });
});

describe('A05: Sinology AI Fallback Engine (server/aiFallback.ts)', () => {
  it('covers all 15 required Taiwan everyday conversation scenarios', () => {
    const requiredKeys = [
      'factory',
      'tax',
      'tech',
      'scooter',
      'tea',
      'mrt',
      'nightmarket',
      'store',
      'house',
      'clinic',
      'bank',
      'workplace',
      'interview',
      'translate',
      'greeting'
    ];

    for (const key of requiredKeys) {
      expect(SINOLOGY_SCENARIOS[key]).toBeDefined();
      const sc = SINOLOGY_SCENARIOS[key];
      expect(sc.traditional).toBeTruthy();
      expect(sc.pinyin).toBeTruthy();
      expect(sc.vietnamese).toBeTruthy();
      expect(sc.practiceTip).toBeTruthy();
      expect(sc.keywords.length).toBeGreaterThan(0);
    }
  });

  it('generates accurate 4-line response format by explicit roleId', () => {
    const reply = generateSinologyAiReply('', 'factory');
    const lines = reply.split('\n');
    expect(lines.length).toBe(4);
    expect(lines[0]).toMatch(/^中文：/);
    expect(lines[1]).toMatch(/^Pinyin: /);
    expect(lines[2]).toMatch(/^Tiếng Việt: /);
    expect(lines[3]).toMatch(/^練習：/);

    expect(lines[0]).toContain('組長');
    expect(lines[0]).toContain('機台');
    expect(lines[0]).toContain('加班');
  });

  it('accurately resolves tax residency scenario (183 days / ARC)', () => {
    const reply = generateSinologyAiReply('', 'tax');
    expect(reply).toContain('綜合所得稅');
    expect(reply).toContain('183天');
    expect(reply).toContain('扣繳憑單');
    expect(reply).toContain('Pinyin:');
    expect(reply).toContain('Tiếng Việt:');
  });

  it('accurately resolves semiconductor 3nm cleanroom scenario', () => {
    const reply = generateSinologyAiReply('', 'tech');
    expect(reply).toContain('3奈米晶圓');
    expect(reply).toContain('無塵室');
    expect(reply).toContain('良率');
  });

  it('accurately matches user query keywords in Vietnamese and Chinese', () => {
    // Bubble tea
    const teaReply = generateSinologyAiReply('Cho tôi một cốc trà sữa 50Lan ít đường ít đá mang đi');
    expect(teaReply).toContain('珍珠奶茶');
    expect(teaReply).toContain('微糖');

    // Scooter
    const scooterReply = generateSinologyAiReply('Tôi muốn thuê xe máy và đổ 95 đầy bình');
    expect(scooterReply).toContain('租機車');
    expect(scooterReply).toContain('95');

    // MRT & EasyCard
    const mrtReply = generateSinologyAiReply('Ga MRT ở đâu và cách nạp tiền thẻ EasyCard?');
    expect(mrtReply).toContain('捷運站');
    expect(mrtReply).toContain('悠遊卡');

    // Convenience store
    const storeReply = generateSinologyAiReply('Thanh toán ở cửa hàng tiện lợi 7-11 lưu hóa đơn');
    expect(storeReply).toContain('八十五元');
    expect(storeReply).toContain('載具');

    // Clinic
    const clinicReply = generateSinologyAiReply('Tôi bị đau đầu sốt cao muốn khám bệnh bằng thẻ BHYT');
    expect(clinicReply).toContain('健保卡');
    expect(clinicReply).toContain('初診');
  });

  it('creates transparent guided fallback reply with mode="guided" and source="local-fallback"', () => {
    const reply = createGuidedFallbackReply({
      lastUserMessage: 'Xin chào',
      roleId: 'greeting',
      reason: 'timeout',
      latencyMs: 12050
    });

    expect(reply.mode).toBe('guided');
    expect(reply.model).toBe('sinology-local-tutor');
    expect(reply.provider).toBe('Sinology Local NLP');
    expect(reply.content).toContain('中文：');
    expect(reply.meta?.fallbackReason).toBe('timeout');
    expect(reply.meta?.latencyMs).toBe(12050);
    expect(reply.meta?.guidanceNote).toContain('12s');
    expect(reply.thread?.messages.length).toBe(2);
    expect(reply.thread?.messages[0].role).toBe('user');
    expect(reply.thread?.messages[1].role).toBe('assistant');
  });
});

describe('A05: Upstream AI Provider & Timeout Connector (server/ai.ts)', () => {
  const mockEnv = {
    AI_SOL_KEY: 'mock-sol-secret-key-12345678',
    AI_DEEPSEEK_KEY: 'mock-deepseek-secret-key-87654321',
    AI_BASE_URL: 'https://agentrouter.org/v1',
    AI_MODEL: 'gpt-6.1-sol',
    AI_TIMEOUT_MS: '12000'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('builds canonical tutor prompt with role context', () => {
    const prompt = buildTutorSystemPrompt('factory');
    expect(prompt).toContain('ZhongXue+');
    expect(prompt).toContain('繁體中文');
    expect(prompt).toContain('工廠');
    expect(prompt).toContain('中文：');
    expect(prompt).toContain('Pinyin:');
    expect(prompt).toContain('Tiếng Việt:');
    expect(prompt).toContain('練習：');
  });

  it('extracts text from OpenAI Responses API format', () => {
    const data = {
      output: [
        {
          type: 'message',
          content: [{ type: 'text', text: '中文：你好！\nPinyin: Nǐ hǎo!\nTiếng Việt: Chào bạn!\n練習：...' }]
        }
      ]
    };
    const extracted = extractAiResponseText(data);
    expect(extracted).toContain('中文：你好！');
  });

  it('extracts text from standard Chat Completions format', () => {
    const data = {
      choices: [
        {
          message: {
            content: '中文：早安！\nPinyin: Zǎo ān!\nTiếng Việt: Chào buổi sáng!\n練習：...'
          }
        }
      ]
    };
    const extracted = extractAiResponseText(data);
    expect(extracted).toContain('中文：早安！');
  });

  it('successfully completes conversation turn on mocked Sol Responses API', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://agentrouter.org/v1/responses');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-sol-secret-key-12345678');
      expect((init.headers as Record<string, string>)['Originator']).toBe('codex_cli_rs');

      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('gpt-6.1-sol');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'text',
                  text: '中文：組長，這台機器修好了。\nPinyin: Zǔzhǎng, zhè tái jīqì xiū hǎo le.\nTiếng Việt: Tổ trưởng ơi, máy này đã sửa xong rồi.\n練習：練習說：下班辛苦了！'
                }
              ]
            }
          ]
        })
      };
    });

    const result = await executeConversation(
      {
        action: 'chat',
        roleId: 'factory',
        messages: [{ role: 'user', content: 'Tổ trưởng máy sửa xong chưa?' }]
      },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as ConversationReply;
    expect(body.mode).toBe('ai');
    expect(body.provider).toContain('AgentRouter');
    expect(body.content).toContain('中文：組長，這台機器修好了。');
    expect(body.thread?.messages.length).toBe(2);
  });

  it('successfully completes conversation turn on mocked Chat Completions API (OpenRouter/DeepSeek)', async () => {
    const customEnv = {
      AI_BASE_URL: 'https://openrouter.ai/api/v1',
      AI_MODEL: 'deepseek-v4-flash',
      AI_API_KEY: 'mock-openrouter-key-99999999'
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-openrouter-key-99999999');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: '中文：歡迎光臨50嵐！\nPinyin: Huānyíng guānglín wǔshí lán!\nTiếng Việt: Chào mừng đến với 50 Lan!\n練習：我要一杯無糖綠茶。'
              }
            }
          ]
        })
      };
    });

    const result = await executeConversation(
      {
        action: 'chat',
        roleId: 'tea',
        messages: [{ role: 'user', content: 'Cho 1 cốc trà xanh' }]
      },
      { env: customEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as ConversationReply;
    expect(body.mode).toBe('ai');
    expect(body.provider).toContain('OpenRouter');
    expect(body.content).toContain('歡迎光臨50嵐');
  });

  it('aborts upstream request and triggers guided fallback upon deadline timeout (12s)', async () => {
    // Mock fetch that hangs until aborted by signal
    const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_, reject) => {
        const signal = init.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    // Provide a small timeout (50ms) to simulate deadline expiration cleanly
    const result = await executeConversation(
      {
        action: 'chat',
        roleId: 'factory',
        timeoutMs: 50, // Clamped to MIN_AI_TIMEOUT_MS in prod, but let's test fast timeout
        messages: [{ role: 'user', content: 'Có tăng ca không?' }]
      },
      {
        env: { ...mockEnv, AI_TIMEOUT_MS: '50' },
        fetchFn: mockFetch as unknown as typeof fetch
      }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as ConversationReply;
    // Guaranteed to return mode: 'guided' with timeout reason
    expect(body.mode).toBe('guided');
    expect(body.meta?.fallbackReason).toBe('timeout');
    expect(body.content).toContain('中文：');
    expect(body.content).toContain('組長');
  });

  it('automatically triggers guided fallback when upstream returns HTTP 500 error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    });

    const result = await executeConversation(
      {
        action: 'chat',
        roleId: 'mrt',
        messages: [{ role: 'user', content: 'Đến ga Taipei đi thế nào?' }]
      },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as ConversationReply;
    expect(body.mode).toBe('guided');
    expect(body.meta?.fallbackReason).toBe('upstream_error');
    expect(body.content).toContain('捷運');
  });

  it('automatically triggers guided fallback when upstream returns HTTP 429 rate limit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests'
    });

    const result = await executeConversation(
      {
        action: 'chat',
        roleId: 'scooter',
        messages: [{ role: 'user', content: 'Thuê xe máy giá bao nhiêu?' }]
      },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as ConversationReply;
    expect(body.mode).toBe('guided');
    expect(body.meta?.fallbackReason).toBe('upstream_error');
    expect(body.content).toContain('租機車');
  });

  it('automatically triggers guided fallback when upstream returns HTTP 401 unauthorized', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized'
    });

    const result = await executeConversation(
      {
        action: 'chat',
        roleId: 'clinic',
        messages: [{ role: 'user', content: 'Khám bệnh BHYT' }]
      },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as ConversationReply;
    expect(body.mode).toBe('guided');
    expect(body.meta?.fallbackReason).toBe('upstream_error');
    expect(body.content).toContain('健保卡');
  });

  it('aborts upstream request immediately when client aborts signal', async () => {
    const clientController = new AbortController();
    let upstreamSignalReceivedAbort = false;

    const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const signal = init.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          upstreamSignalReceivedAbort = true;
        });
      }
      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const execPromise = executeConversation(
      {
        action: 'chat',
        roleId: 'tax',
        messages: [{ role: 'user', content: 'Khai thuế 183 ngày' }]
      },
      {
        env: mockEnv,
        fetchFn: mockFetch as unknown as typeof fetch,
        clientSignal: clientController.signal
      }
    );

    // Abort client request mid-flight
    clientController.abort();

    const result = await execPromise;
    expect(upstreamSignalReceivedAbort).toBe(true);
    expect(result.statusCode).toBe(499);
  });

  it('performs ping health check successfully on upstream with valid schema', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'pong' } }]
      }),
      text: async () => JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'pong' } }] })
    });

    const result = await executeConversation(
      { action: 'ping' },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as AiConnectionStatus;
    expect(body.ok).toBe(true);
    expect(body.provider).toContain('AgentRouter');
    expect(body.model).toBe('gpt-6.1-sol');
    expect(typeof body.latencyMs).toBe('number');
  });

  it('rejects ping as ok=false when upstream returns HTTP 200 with empty body (G3 invariant)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => ''
    });

    const result = await executeConversation(
      { action: 'ping' },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as AiConnectionStatus;
    // On baseline: returns ok=true without checking body -> FAILS (RED)
    expect(
      body.ok,
      'HTTP 200 with empty body must NOT be reported as reachable/ready'
    ).toBe(false);
    expect(body.error).toBeDefined();
  });

  it('rejects ping as ok=false when upstream returns HTTP 200 with invalid schema or error payload (G3 invariant)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: 'Model overloaded' }),
      text: async () => JSON.stringify({ error: 'Model overloaded' })
    });

    const result = await executeConversation(
      { action: 'ping' },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as AiConnectionStatus;
    // On baseline: returns ok=true without inspecting schema -> FAILS (RED)
    expect(
      body.ok,
      'HTTP 200 with error schema must NOT be reported as reachable/ready'
    ).toBe(false);
    expect(body.error).toBeDefined();
  });

  it('returns ok=false on ping when no API key is configured', async () => {
    const emptyEnv = { AI_SOL_KEY: '', AI_API_KEY: '', AI_DEEPSEEK_KEY: '' };
    const result = await executeConversation(
      { action: 'ping' },
      { env: emptyEnv }
    );

    expect(result.statusCode).toBe(200);
    const body = result.body as AiConnectionStatus;
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/Chưa cấu hình API Key|No API key configured/);
  });

  it('SEC-01: refuses to forward server keys to untrusted custom baseUrl without client apiKey', async () => {
    const mockFetch = vi.fn();

    const result = await executeConversation(
      {
        action: 'chat',
        baseUrl: 'https://attacker-controlled-server.com/v1',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      { env: mockEnv, fetchFn: mockFetch as unknown as typeof fetch }
    );

    // Upstream fetch to attacker must NEVER be called!
    expect(mockFetch).not.toHaveBeenCalled();

    // Instead, safely falls back to local guided tutor with no_key reason
    expect(result.statusCode).toBe(200);
    const body = result.body as ConversationReply;
    expect(body.mode).toBe('guided');
    expect(body.meta?.fallbackReason).toBe('no_key');
  });

  it('verifies timeout constants and bounds', () => {
    expect(DEFAULT_AI_TIMEOUT_MS).toBe(12000);
    expect(MAX_AI_TIMEOUT_MS).toBe(15000);
    expect(MIN_AI_TIMEOUT_MS).toBe(1000);
  });
});

describe('A05: HTTP Route Handler Integration (server/ai.ts handleConversationRoute)', () => {
  let savedSolKey: string | undefined;
  let savedDeepseekKey: string | undefined;
  let savedApiKey: string | undefined;

  beforeEach(() => {
    savedSolKey = process.env.AI_SOL_KEY;
    savedDeepseekKey = process.env.AI_DEEPSEEK_KEY;
    savedApiKey = process.env.AI_API_KEY;
    delete process.env.AI_SOL_KEY;
    delete process.env.AI_DEEPSEEK_KEY;
    delete process.env.AI_API_KEY;
  });

  afterEach(() => {
    if (savedSolKey !== undefined) process.env.AI_SOL_KEY = savedSolKey;
    if (savedDeepseekKey !== undefined) process.env.AI_DEEPSEEK_KEY = savedDeepseekKey;
    if (savedApiKey !== undefined) process.env.AI_API_KEY = savedApiKey;
  });

  function createMockReqRes(method: string) {
    const req = new EventEmitter() as unknown as IncomingMessage & { method: string };
    req.method = method;

    const resHeaders: Record<string, string> = {};
    const responseMock = {
      statusCode: 200,
      writableEnded: false,
      setHeader: vi.fn((k: string, v: string) => {
        resHeaders[k.toLowerCase()] = v;
      }),
      end: vi.fn((data?: string) => {
        responseMock.writableEnded = true;
        responseMock._data = data;
      }),
      _data: '' as string | undefined
    };
    const res = responseMock as unknown as ServerResponse & { _data?: string };

    return { req, res, resHeaders };
  }

  it('GET /api/conversation returns ready status probe', async () => {
    const { req, res, resHeaders } = createMockReqRes('GET');
    await handleConversationRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(resHeaders['content-type']).toContain('application/json');
    const parsed = JSON.parse(res._data || '{}');
    expect(parsed.status).toBe('ready');
    expect(parsed.ok).toBe(true);
  });

  it('rejects unsupported HTTP methods (e.g. PUT) with 405 Method Not Allowed', async () => {
    const { req, res } = createMockReqRes('PUT');
    await handleConversationRoute(req, res);

    expect(res.statusCode).toBe(405);
    const parsed = JSON.parse(res._data || '{}');
    expect(parsed.error?.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('handles pre-parsed body directly and writes JSON response', async () => {
    const { req, res } = createMockReqRes('POST');
    const body: ConversationRequestBody = {
      action: 'chat',
      roleId: 'house',
      messages: [{ role: 'user', content: 'Thuê phòng trọ giá sao?' }]
    };

    await handleConversationRoute(req, res, body);

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res._data || '{}');
    expect(parsed.mode).toBe('guided');
    expect(parsed.content).toContain('獨立套房');
  });

  it('streams and parses body when pre-parsed body is not provided', async () => {
    const { req, res } = createMockReqRes('POST');
    const routePromise = handleConversationRoute(req, res);

    const raw = JSON.stringify({
      action: 'chat',
      roleId: 'store',
      messages: [{ role: 'user', content: 'Tính tiền siêu thị 7-11' }]
    });

    req.emit('data', Buffer.from(raw.slice(0, 20)));
    req.emit('data', Buffer.from(raw.slice(20)));
    req.emit('end');

    await routePromise;

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res._data || '{}');
    expect(parsed.mode).toBe('guided');
    expect(parsed.content).toContain('八十五元');
  });

  it('returns 400 when streamed body is invalid JSON', async () => {
    const { req, res } = createMockReqRes('POST');
    const routePromise = handleConversationRoute(req, res);

    req.emit('data', Buffer.from('{ broken-json: invalid '));
    req.emit('end');

    await routePromise;

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res._data || '{}');
    expect(parsed.error?.code).toBe('BAD_REQUEST');
  });

  it('returns 413 when streamed body exceeds 100KB limit', async () => {
    const { req, res } = createMockReqRes('POST');
    const routePromise = handleConversationRoute(req, res);

    const oversizedChunk = 'a'.repeat(105 * 1024);
    req.emit('data', Buffer.from(oversizedChunk));

    await routePromise;

    expect(res.statusCode).toBe(413);
    const parsed = JSON.parse(res._data || '{}');
    expect(parsed.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
