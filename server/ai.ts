/**
 * server/ai.ts
 *
 * Upstream AI Connector & Guided Fallback Dispatcher for ZhongXue V2.
 * Owned by Subagent A05 (AI Provider & Fallback Lead).
 *
 * Implements:
 * 1. Safe upstream proxying for AgentRouter (Responses API) & OpenRouter/DeepSeek (Chat Completions).
 * 2. Strict integration with server/security.ts:
 *    - Never sends server environment keys to untrusted/custom baseUrls.
 *    - Rejects unauthorized baseUrls or falls back safely to local guided tutor.
 * 3. Robust timeout & cancellation management:
 *    - Default server-side deadline: 12,000 ms (12 seconds).
 *    - Strict ceiling: 15,000 ms (15 seconds).
 *    - AbortController linked to both server deadline timer and client disconnect (req.on('close')).
 * 4. Automatic resilient fallback:
 *    - Any upstream failure (401, 403, 429, 5xx, timeout, network disconnect) automatically triggers
 *      rich TOCFL guided tutor response from server/aiFallback.ts with mode='guided'.
 *    - Prevents UI spinner hang or infinite loading on client.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  ConversationRequestBody,
  ConversationReply,
  ConversationTurn,
  AiConnectionStatus,
  ApiErrorBody
} from '../src/types.ts';
import {
  resolveUpstreamCredentials,
  type ResolvedCredentials
} from './security.ts';
import { createGuidedFallbackReply } from './aiFallback.ts';
import { sendJson, sendError, methodNotAllowed, badRequest, payloadTooLarge } from './errors.ts';
import {
  parseJsonBody,
  validateConversationBody,
  validateJsonContentType,
  MAX_BODY_SIZE_CONVERSATION
} from './validation.ts';

/** Default server response deadline (12 seconds) */
export const DEFAULT_AI_TIMEOUT_MS = 12000;

/** Absolute maximum timeout ceiling enforced by server (15 seconds) */
export const MAX_AI_TIMEOUT_MS = 15000;

/** Minimum allowed timeout (1 second) */
export const MIN_AI_TIMEOUT_MS = 1000;

export interface ExecuteConversationOptions {
  clientSignal?: AbortSignal;
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  allowLocalDev?: boolean;
}

export interface ExecuteConversationResult {
  statusCode: number;
  body: ConversationReply | AiConnectionStatus | ApiErrorBody;
}

/**
 * Builds the canonical system prompt for TOCFL Taiwan Mandarin roleplay tutor.
 */
export function buildTutorSystemPrompt(roleId?: string): string {
  let roleContext = '';
  switch (roleId) {
    case 'factory':
      roleContext = 'Tình huống: Công xưởng Đài Loan (工廠機台與加班), giao tiếp với Quản đốc/Tổ trưởng sản xuất (組長) về máy móc, kiểm hàng, xin tăng ca hoặc nghỉ phép.';
      break;
    case 'tax':
      roleContext = 'Tình huống: Cục thuế Đài Loan (國稅局) tháng 5, kê khai thuế thu nhập cá nhân (綜合所得稅), hoàn thuế (退稅), cư trú đủ 183 ngày, chứng từ khấu trừ (扣繳憑單).';
      break;
    case 'tech':
      roleContext = 'Tình huống: Khu công nghệ Tân Trúc / TSMC, thảo luận tấm wafer 3nm, phòng sạch, tỷ lệ thành phẩm (良率), tiến trình bán dẫn.';
      break;
    case 'scooter':
      roleContext = 'Tình huống: Thuê xe máy ở Đài Loan, đổ xăng 95, mũ bảo hiểm, trạm xăng Trung Dầu CPC, hóa đơn lưu mã thẻ (載具).';
      break;
    case 'tea':
      roleContext = 'Tình huống: Quầy trà sữa Đài Loan (50嵐), hỏi đồ uống, điều chỉnh độ ngọt (đường) và đá (nhiều đá/ít đá/không đá), mua mang đi hay dùng tại quán.';
      break;
    case 'mrt':
      roleContext = 'Tình huống: Ga tàu điện ngầm Đài Bắc (MRT), mua thẻ EasyCard (悠遊卡), nạp tiền và hỏi tuyến đổi tàu.';
      break;
    case 'nightmarket':
      roleContext = 'Tình huống: Chợ đêm Đài Loan, gọi món ăn vặt, mì bò kho, đậu phụ thối, hỏi độ cay.';
      break;
    case 'store':
      roleContext = 'Tình huống: Cửa hàng tiện lợi 7-Eleven / FamilyMart Đài Loan, thanh toán tiền mặt/thẻ, in hóa đơn hoặc lưu thẻ, gửi bưu kiện.';
      break;
    case 'house':
      roleContext = 'Tình huống: Thuê phòng trọ tại Đài Loan, hỏi tiền cọc 2 tháng, tiền điện nước hóa đơn Đài Điện, hẹn giờ xem phòng.';
      break;
    case 'clinic':
      roleContext = 'Tình huống: Phòng khám và BHYT Đài Loan, xuất trình thẻ BHYT (健保卡), miêu tả triệu chứng sốt hoặc đau đầu, hướng dẫn uống thuốc.';
      break;
    case 'bank':
      roleContext = 'Tình huống: Ngân hàng Đài Loan, mở tài khoản cho người nước ngoài, mang thẻ cư trú ARC, hộ chiếu, con dấu cá nhân, đăng ký internet banking.';
      break;
    case 'workplace':
      roleContext = 'Tình huống: Môi trường công sở văn phòng, họp phòng họp số 3, xin nghỉ phép riêng, điền hệ thống chấm công.';
      break;
    case 'interview':
      roleContext = 'Tình huống: Phỏng vấn xin việc tại Đài Loan, giới thiệu bản thân, phúc lợi lao bảo y bảo, thời gian đi làm.';
      break;
  }

  return `你是 ZhongXue+ 的臺灣華語對話與發音練習助教。請使用繁體中文、臺灣常用詞彙與自然臺灣腔調。
${roleContext ? `【目前練習情境】：${roleContext}` : ''}
請嚴格按照以下4行格式回應，不要使用 Markdown 星號或多餘格式：
中文：[Một câu tiếng Hoa Phồn thể chuẩn giọng Đài Loan tự nhiên phù hợp ngữ cảnh]
Pinyin: [Phiên âm Pinyin kèm dấu thanh điệu chuẩn]
Tiếng Việt: [Dịch nghĩa tiếng Việt tự nhiên và giải thích ngữ cảnh ngắn gọn]
練習：[Nhận xét ngắn về phát âm hoặc ngữ pháp, kèm 1 gợi ý câu phản xạ ngắn để người học luyện nói tiếp]`;
}

/**
 * Extracts AI text response from OpenAI Responses API or standard Chat Completions format.
 */
export function extractAiResponseText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const d = data as {
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
    choices?: Array<{
      message?: { content?: string; reasoning_content?: string };
    }>;
  };

  // 1. OpenAI Responses API (e.g. gpt-6.1-sol on AgentRouter)
  if (Array.isArray(d.output)) {
    for (let i = d.output.length - 1; i >= 0; i--) {
      const item = d.output[i];
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c.text === 'string' && c.text.trim()) {
            return c.text.trim();
          }
        }
      }
    }
  }

  // 2. Standard Chat Completions (DeepSeek / OpenRouter / OpenAI compatible)
  if (Array.isArray(d.choices) && d.choices[0]?.message) {
    const text = d.choices[0].message.content || d.choices[0].message.reasoning_content;
    if (typeof text === 'string' && text.trim()) {
      return text.trim();
    }
  }

  return null;
}

/**
 * Core conversation processor.
 * Hermetic, pure function accepting custom fetchFn and AbortSignal for seamless testing.
 */
export async function executeConversation(
  body: ConversationRequestBody,
  options?: ExecuteConversationOptions
): Promise<ExecuteConversationResult> {
  const env = options?.env || process.env;
  const fetchFn = options?.fetchFn || globalThis.fetch;
  const action = body.action || 'chat';
  const tStart = Date.now();

  const model = (body.model || env.AI_MODEL || 'gpt-6.1-sol').trim();
  const isSolModel = model === 'gpt-6.1-sol' || model.includes('sol');

  // Allow local dev/test when running in test environment or explicitly enabled
  const allowLocalDev = options?.allowLocalDev ?? (env.ALLOW_LOCAL_TEST_UPSTREAM === 'true' || env.VITEST === 'true' || env.NODE_ENV === 'test');

  // Resolve credentials with A03 security boundary
  const creds: ResolvedCredentials = resolveUpstreamCredentials({
    model,
    requestedBaseUrl: body.baseUrl,
    clientApiKey: body.apiKey,
    env,
    allowLocalDev
  });

  // Calculate clamped timeout: default 12s, max 15s, min 1s
  const requestedTimeout = body.timeoutMs || (env.AI_TIMEOUT_MS ? Number(env.AI_TIMEOUT_MS) : DEFAULT_AI_TIMEOUT_MS);
  const timeoutMs = Math.min(Math.max(requestedTimeout || DEFAULT_AI_TIMEOUT_MS, MIN_AI_TIMEOUT_MS), MAX_AI_TIMEOUT_MS);

  // Set up AbortController linked to server timeout and optional clientSignal
  const controller = new AbortController();
  let timedOut = false;
  let clientAborted = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error('UPSTREAM_TIMEOUT'));
  }, timeoutMs);

  const onClientAbort = () => {
    clientAborted = true;
    controller.abort(new Error('CLIENT_ABORTED'));
  };

  if (options?.clientSignal) {
    if (options.clientSignal.aborted) {
      clearTimeout(timeoutId);
      return {
        statusCode: 499,
        body: { error: { code: 'CLIENT_CLOSED', message: 'Client aborted request before execution' } }
      };
    }
    options.clientSignal.addEventListener('abort', onClientAbort, { once: true });
  }

  try {
    // ------------------------------------------------------------------------
    // Action: 'ping' | 'health'
    // ------------------------------------------------------------------------
    if (action === 'ping' || action === 'health') {
      const isAgentRouter = creds.baseUrl.includes('agentrouter.org');
      const isOpenRouter = creds.baseUrl.includes('openrouter.ai');
      const providerLabel = isAgentRouter
        ? `AgentRouter (${model})`
        : isOpenRouter
          ? `OpenRouter (${model})`
          : `Upstream (${model})`;

      if (!creds.isAllowed || !creds.apiKey) {
        return {
          statusCode: 200,
          body: {
            ok: false,
            provider: isAgentRouter ? 'AgentRouter' : isOpenRouter ? 'OpenRouter' : 'Custom Provider',
            model,
            baseUrl: creds.baseUrl,
            error: creds.error || 'Chưa cấu hình API Key trong .env hoặc Cài đặt'
          } as AiConnectionStatus
        };
      }

      try {
        const pingHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creds.apiKey}`
        };
        if (isAgentRouter) {
          pingHeaders['Originator'] = 'codex_cli_rs';
          pingHeaders['User-Agent'] = 'codex_cli_rs/0.101.0 (Mac OS; arm64) Apple_Terminal/2.12';
          pingHeaders['Version'] = '0.101.0';
        }

        const pingEndpoint = isSolModel && isAgentRouter
          ? `${creds.baseUrl}/responses`
          : `${creds.baseUrl}/chat/completions`;

        const pingBody = isSolModel && isAgentRouter
          ? JSON.stringify({ model, input: 'ping', max_output_tokens: 20 })
          : JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 20 });

        const pingRes = await fetchFn(pingEndpoint, {
          method: 'POST',
          headers: pingHeaders,
          body: pingBody,
          signal: controller.signal,
          redirect: 'manual'
        });

        const elapsed = Date.now() - tStart;
        if (pingRes.ok) {
          const rawPingBody = await pingRes.text().catch(() => '');
          if (!rawPingBody || !rawPingBody.trim()) {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: 'Upstream returned empty or whitespace-only response body'
              } as AiConnectionStatus
            };
          }

          let pingData: Record<string, unknown>;
          try {
            pingData = JSON.parse(rawPingBody);
          } catch {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: 'Upstream response is not valid JSON'
              } as AiConnectionStatus
            };
          }

          if (!pingData || typeof pingData !== 'object' || Array.isArray(pingData)) {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: 'Upstream response must be a JSON object'
              } as AiConnectionStatus
            };
          }

          if ('error' in pingData && pingData.error) {
            const errVal = pingData.error;
            const errMsg = typeof errVal === 'string'
              ? errVal
              : typeof errVal === 'object' && errVal && 'message' in errVal && typeof (errVal as { message?: unknown }).message === 'string'
                ? (errVal as { message: string }).message
                : JSON.stringify(errVal);
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: `Upstream returned error: ${errMsg}`
              } as AiConnectionStatus
            };
          }

          const hasValidSchema =
            (Array.isArray(pingData.choices) && pingData.choices.length > 0) ||
            Array.isArray(pingData.output) ||
            Boolean(extractAiResponseText(pingData));

          if (!hasValidSchema) {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: 'Upstream response missing choices or output schema'
              } as AiConnectionStatus
            };
          }

          return {
            statusCode: 200,
            body: {
              ok: true,
              provider: providerLabel,
              model,
              baseUrl: creds.baseUrl,
              latencyMs: elapsed
            } as AiConnectionStatus
          };
        } else {
          const errText = await pingRes.text().catch(() => '');
          return {
            statusCode: 200,
            body: {
              ok: false,
              provider: isAgentRouter ? 'AgentRouter' : 'OpenRouter',
              model,
              baseUrl: creds.baseUrl,
              statusCode: pingRes.status,
              error: `Lỗi máy chủ (${pingRes.status}): ${errText.slice(0, 150)}`
            } as AiConnectionStatus
          };
        }
      } catch (err) {
        if (clientAborted) {
          return {
            statusCode: 499,
            body: { error: { code: 'CLIENT_CLOSED', message: 'Client cancelled request' } }
          };
        }
        return {
          statusCode: 200,
          body: {
            ok: false,
            provider: isAgentRouter ? 'AgentRouter' : 'OpenRouter',
            model,
            baseUrl: creds.baseUrl,
            error: timedOut ? 'Quá thời gian chờ phản hồi (timeout)' : (err instanceof Error ? err.message : 'Lỗi kết nối mạng')
          } as AiConnectionStatus
        };
      }
    }

    // ------------------------------------------------------------------------
    // Action: 'chat'
    // ------------------------------------------------------------------------
    const messages = body.messages || [];
    const lastUserTurn = [...messages].reverse().find(m => m.role === 'user');
    const lastMsg = lastUserTurn?.content || messages[messages.length - 1]?.content || '';
    const roleId = body.roleId;
    const threadId = body.threadId || Date.now();

    // If credentials are disallowed (e.g. untrusted baseUrl without client key) or missing
    if (!creds.isAllowed || !creds.apiKey) {
      const fallbackReply = createGuidedFallbackReply({
        lastUserMessage: lastMsg,
        roleId,
        threadId,
        previousMessages: messages,
        reason: 'no_key',
        latencyMs: Date.now() - tStart,
        note: creds.error
          ? `Từ chối ủy quyền (${creds.error}). Đang sử dụng gia sư hướng dẫn cục bộ.`
          : undefined
      });
      return { statusCode: 200, body: fallbackReply };
    }

    // Attempt upstream AI call with credentials
    const isAgentRouter = creds.baseUrl.includes('agentrouter.org');
    const isOpenRouter = creds.baseUrl.includes('openrouter.ai');
    const prompt = buildTutorSystemPrompt(roleId);

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.apiKey}`
    };
    if (isAgentRouter) {
      reqHeaders['Originator'] = 'codex_cli_rs';
      reqHeaders['User-Agent'] = 'codex_cli_rs/0.101.0 (Mac OS; arm64) Apple_Terminal/2.12';
      reqHeaders['Version'] = '0.101.0';
    }

    let aiText: string | null = null;
    let upstreamErrorStatus: number | null = null;

    try {
      if (isSolModel && isAgentRouter) {
        // OpenAI Responses API for gpt-6.1-sol
        const convHistory = messages.map(m =>
          `${m.role === 'user' ? 'Người học' : 'Trợ lý AI'}: ${m.content}`
        ).join('\n');
        const fullInput = `${prompt}\n\n【Lịch sử hội thoại】：\n${convHistory}`;

        const llmRes = await fetchFn(`${creds.baseUrl}/responses`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            model,
            input: fullInput,
            max_output_tokens: 2500
          }),
          signal: controller.signal,
          redirect: 'manual'
        });

        if (llmRes.ok) {
          let llmData: unknown = null;
          if (typeof llmRes.json === 'function') {
            try {
              llmData = await llmRes.json();
            } catch {
              llmData = null;
            }
          } else if (typeof llmRes.text === 'function') {
            try {
              const raw = await llmRes.text();
              llmData = raw ? JSON.parse(raw) : null;
            } catch {
              llmData = null;
            }
          }
          aiText = extractAiResponseText(llmData);
        } else {
          upstreamErrorStatus = llmRes.status;
          const errBody = typeof llmRes.text === 'function' ? await llmRes.text().catch(() => '') : '';
          console.warn(`[zhongxue-ai] Responses API error ${llmRes.status}:`, errBody.slice(0, 150));
        }
      } else {
        // Chat Completions API
        const payload: Record<string, unknown> = {
          model,
          messages: [
            { role: 'system', content: prompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
          ],
          max_tokens: 4096
        };
        if (isOpenRouter) {
          payload.reasoning = { enabled: false, exclude: true };
        }

        const llmRes = await fetchFn(`${creds.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(payload),
          signal: controller.signal,
          redirect: 'manual'
        });

        if (llmRes.ok) {
          let llmData: unknown = null;
          if (typeof llmRes.json === 'function') {
            try {
              llmData = await llmRes.json();
            } catch {
              llmData = null;
            }
          } else if (typeof llmRes.text === 'function') {
            try {
              const raw = await llmRes.text();
              llmData = raw ? JSON.parse(raw) : null;
            } catch {
              llmData = null;
            }
          }
          aiText = extractAiResponseText(llmData);
        } else {
          upstreamErrorStatus = llmRes.status;
          const errBody = typeof llmRes.text === 'function' ? await llmRes.text().catch(() => '') : '';
          console.warn(`[zhongxue-ai] Chat completions error ${llmRes.status}:`, errBody.slice(0, 150));
        }
      }

      // If upstream succeeded and returned parsed text
      if (aiText && aiText.trim()) {
        const replyTurn: ConversationTurn = { role: 'assistant', content: aiText.trim() };
        const reply: ConversationReply = {
          mode: 'ai',
          content: aiText.trim(),
          model,
          provider: isAgentRouter
            ? `AgentRouter (${model})`
            : isOpenRouter
              ? `OpenRouter (${model})`
              : `Upstream (${model})`,
          thread: {
            id: threadId,
            messages: [...messages, replyTurn]
          },
          meta: {
            latencyMs: Date.now() - tStart
          }
        };
        return { statusCode: 200, body: reply };
      }

      // Upstream failed with 4xx/5xx or empty response -> Guided fallback
      const fallbackReply = createGuidedFallbackReply({
        lastUserMessage: lastMsg,
        roleId,
        threadId,
        previousMessages: messages,
        reason: 'upstream_error',
        latencyMs: Date.now() - tStart,
        note: upstreamErrorStatus
          ? `Mô hình AI trực tuyến phản hồi mã lỗi ${upstreamErrorStatus}. Đã kích hoạt gia sư hướng dẫn cục bộ.`
          : 'Mô hình AI trực tuyến phản hồi rỗng. Đã kích hoạt gia sư hướng dẫn cục bộ.'
      });
      return { statusCode: 200, body: fallbackReply };
    } catch (err) {
      if (clientAborted) {
        return {
          statusCode: 499,
          body: { error: { code: 'CLIENT_CLOSED', message: 'Client cancelled request' } }
        };
      }

      // Timeout or network error -> Guided fallback
      const isTimeout = timedOut || (err instanceof Error && err.name === 'AbortError' && timedOut);
      const fallbackReply = createGuidedFallbackReply({
        lastUserMessage: lastMsg,
        roleId,
        threadId,
        previousMessages: messages,
        reason: isTimeout ? 'timeout' : 'upstream_error',
        latencyMs: Date.now() - tStart,
        note: isTimeout
          ? `Yêu cầu AI trực tuyến quá thời gian quy định (${timeoutMs}ms). Đã kích hoạt gia sư hướng dẫn cục bộ.`
          : `Lỗi kết nối AI trực tuyến (${err instanceof Error ? err.message : 'network error'}). Đã kích hoạt gia sư hướng dẫn cục bộ.`
      });
      return { statusCode: 200, body: fallbackReply };
    }
  } finally {
    clearTimeout(timeoutId);
    if (options?.clientSignal) {
      options.clientSignal.removeEventListener('abort', onClientAbort);
    }
  }
}

/**
 * Node.js HTTP request handler for /api/conversation.
 * Used by both standalone production server (server/routes.ts) and Vite dev plugin.
 */
export async function handleConversationRoute(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody?: ConversationRequestBody
): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  // 1. GET /api/conversation - Server status probe
  if (method === 'GET') {
    const creds = resolveUpstreamCredentials({});
    sendJson(res, 200, {
      status: 'ready',
      ok: true,
      provider: creds.isTrusted ? `AgentRouter (${process.env.AI_MODEL || 'gpt-6.1-sol'})` : 'Local Sinology Engine',
      baseUrl: creds.baseUrl,
      model: process.env.AI_MODEL || 'gpt-6.1-sol',
      hasApiKey: Boolean(creds.apiKey)
    });
    return;
  }

  // 2. Only POST allowed for conversation turns
  if (method !== 'POST') {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/conversation`));
    return;
  }

  // Early client disconnect / abort controller setup
  const clientController = new AbortController();
  const onClientDisconnect = () => {
    if (!res.writableEnded) {
      clientController.abort(new Error('CLIENT_CLOSED'));
    }
  };

  if (typeof res.on === 'function') {
    res.on('close', onClientDisconnect);
  }
  if (typeof req.on === 'function') {
    req.on('aborted', onClientDisconnect);
    req.on('close', () => {
      if (!req.complete && !res.writableEnded) {
        onClientDisconnect();
      }
    });
  }

  try {
    // 3. Content-Type and Body reading & validation
    let rawBody: unknown;
    if (parsedBody !== undefined) {
      const contentType = req.headers ? req.headers['content-type'] : undefined;
      if (contentType) {
        validateJsonContentType(contentType);
      }
      rawBody = parsedBody;
    } else {
      const contentType = req.headers ? req.headers['content-type'] : undefined;
      if (contentType) {
        validateJsonContentType(contentType);
      }

      rawBody = await new Promise((resolve, reject) => {
        let raw = '';
        let bytesRead = 0;
        const maxBytes = MAX_BODY_SIZE_CONVERSATION;

        if (req.headers && req.headers['content-length']) {
          const declared = parseInt(req.headers['content-length'], 10);
          if (!isNaN(declared) && declared > maxBytes) {
            reject(payloadTooLarge(`Request body size (${declared} bytes) exceeds limit of ${maxBytes} bytes`));
            return;
          }
        }

        req.on('data', (chunk: Buffer | string) => {
          const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
          bytesRead += len;
          if (bytesRead > maxBytes) {
            reject(payloadTooLarge(`Request body size (${bytesRead} bytes) exceeds limit of ${maxBytes} bytes`));
            return;
          }
          raw += chunk.toString();
        });

        req.on('end', () => {
          try {
            resolve(parseJsonBody(raw));
          } catch {
            reject(badRequest('Invalid JSON request body', undefined, 'BAD_REQUEST'));
          }
        });

        req.on('error', reject);
      });
    }

    // Validate body structure and chat messages
    const validBody = validateConversationBody(rawBody);

    // If action is chat (or default), ensure messages is not empty
    if ((!validBody.action || validBody.action === 'chat') && (!validBody.messages || validBody.messages.length === 0)) {
      throw badRequest('messages array cannot be empty');
    }

    if (res.writableEnded || clientController.signal.aborted) {
      return;
    }

    const result = await executeConversation(validBody, {
      clientSignal: clientController.signal
    });

    if (!res.writableEnded) {
      sendJson(res, result.statusCode, result.body);
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendError(res, err);
    }
  } finally {
    if (typeof res.removeListener === 'function') {
      res.removeListener('close', onClientDisconnect);
    }
    if (typeof req.removeListener === 'function') {
      req.removeListener('aborted', onClientDisconnect);
    }
  }
}
