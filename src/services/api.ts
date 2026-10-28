/**
 * ZhongXue+ API Client Service (V2 Architecture)
 * Connects the frontend to same-origin /api/* endpoints with resilient,
 * local-first fallbacks for Dictionary, AI Tutor, and Handwriting Recognition.
 *
 * Owned by Subagent A08 (Client API Adapter Lead).
 */

import { getAllKnownWords, findWord } from '../domain/learning';
import {
  matchesQuery,
  normalizeVietnamese,
  normalizePinyin,
  isHanziText
} from '../domain/searchNormalization';
import type {
  Word,
  DbDictionaryResult,
  DictionarySearchResponse,
  SearchResponse,
  HealthResponse,
  ConversationTurn,
  ConversationReply,
  ConversationReplyMode,
  AiConnectionStatus,
  HandwritingStroke,
  HandwritingResponse
} from '../types';

export type {
  DbDictionaryResult,
  DictionarySearchResponse,
  SearchResponse,
  HealthResponse,
  ConversationTurn,
  ConversationReply,
  ConversationReplyMode,
  AiConnectionStatus,
  HandwritingStroke,
  HandwritingResponse
};

export interface DictionarySearchResult extends DictionarySearchResponse {
  dictionaryTotal?: number;
  totalMatches?: number;
  pageCount?: number;
  apiFailed?: boolean;
  degraded?: boolean;
}

export interface BackendHealth {
  online: boolean;
  totalEntries: number;
  status?: 'ok' | 'degraded' | 'error' | 'offline';
  uptime?: number;
  version?: string;
  ai?: {
    configured: boolean;
    provider: string;
    model: string;
  };
}

export interface SendAiMessageOptions {
  unitId?: number;
  history?: ConversationTurn[];
  threadId?: number;
  roleId?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HandwritingOptions {
  width?: number;
  height?: number;
  language?: string;
  signal?: AbortSignal;
}

let cachedHealthTotal = 122596;

/**
 * Standard same-origin API fetch helper.
 * Enforces JSON accept header and prevents outdated port 3001 fallback.
 */
async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return fetch(path, {
    ...options,
    headers
  });
}

/**
 * Check if the backend database & dictionary engine are accessible.
 * Strictly verifies HTTP status, application/json Content-Type, and valid JSON schema.
 * Under NO circumstances treats an HTML 200 response (like SPA fallback) as online!
 */
export async function checkBackendHealth(
  signal?: AbortSignal
): Promise<BackendHealth> {
  try {
    const res = await apiFetch('/api/health', { method: 'GET', signal });

    // Must be HTTP 200..299
    if (!res.ok) {
      return { online: false, totalEntries: 40, status: 'error' };
    }

    // Must strictly be JSON (reject text/html SPA fallback!)
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { online: false, totalEntries: 40, status: 'offline' };
    }

    const data: unknown = await res.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      'status' in data &&
      'dictionary' in data
    ) {
      const typed = data as Partial<HealthResponse>;
      const isOk = typed.status === 'ok';
      const isLoaded = Boolean(typed.dictionary?.loaded);

      if (isOk && isLoaded) {
        const total =
          typeof typed.dictionary?.totalEntries === 'number' &&
          typed.dictionary.totalEntries > 0
            ? typed.dictionary.totalEntries
            : 122596;
        cachedHealthTotal = total;

        return {
          online: true,
          totalEntries: total,
          status: 'ok',
          uptime: typed.uptime,
          version: typed.version,
          ai: typed.ai
        };
      }

      return {
        online: false,
        totalEntries: 40,
        status: (typed.status as BackendHealth['status']) || 'degraded'
      };
    }
  } catch {
    // Offline or network error
  }

  return { online: false, totalEntries: 40, status: 'offline' };
}

/**
 * Foundational offline dictionary items for instant zero-network lookup.
 */
const FOUNDATIONAL_FALLBACK_WORDS: Word[] = [
  {
    id: 'dict-fallback-xuesheng',
    hanzi: '學生',
    pinyin: 'xuéshēng',
    meaning: 'Học sinh, sinh viên',
    example: '我是學生。',
    examplePinyin: 'Wǒ shì xuésheng.',
    exampleMeaning: 'Tôi là học sinh.',
    category: 'Xưng hô',
    lessonId: 'fallback'
  },
  {
    id: 'dict-fallback-laoshi',
    hanzi: '老師',
    pinyin: 'lǎoshī',
    meaning: 'Thầy giáo, cô giáo, giáo viên',
    example: '老師好！',
    examplePinyin: 'Lǎoshī hǎo!',
    exampleMeaning: 'Chào thầy cô!',
    category: 'Xưng hô',
    lessonId: 'fallback'
  },
  {
    id: 'dict-fallback-taiwan',
    hanzi: '臺灣',
    pinyin: 'Táiwān',
    meaning: 'Đài Loan',
    example: '我住在臺灣。',
    examplePinyin: 'Wǒ zhù zài Táiwān.',
    exampleMeaning: 'Tôi sống ở Đài Loan.',
    category: 'Địa danh',
    lessonId: 'fallback'
  },
  {
    id: 'dict-fallback-huayu',
    hanzi: '華語',
    pinyin: 'Huáyǔ',
    meaning: 'Tiếng Hoa, tiếng Trung Quốc',
    example: '我學華語。',
    examplePinyin: 'Wǒ xué Huáyǔ.',
    exampleMeaning: 'Tôi học tiếng Hoa.',
    category: 'Ngôn ngữ',
    lessonId: 'fallback'
  }
];

/**
 * Search local curriculum lessons & registered words using advanced normalization from A07.
 * Supports:
 * - Tone marks Pinyin: 'xuéshēng'
 * - Tone numbers Pinyin: 'xue2 sheng1'
 * - Toneless Pinyin: 'xuesheng'
 * - Unaccented Vietnamese: 'hoc sinh'
 * - Accented Vietnamese: 'học sinh'
 * - Hanzi characters: '學生'
 */
export function searchLocalLessons(
  query: string,
  mode: 'all' | 'hanzi' | 'pinyin' | 'vi' = 'all'
): DbDictionaryResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Combine curriculum words and foundational offline words
  const known = getAllKnownWords();
  const wordMap = new Map<string, Word>();

  for (const w of FOUNDATIONAL_FALLBACK_WORDS) {
    wordMap.set(w.hanzi, w);
  }
  for (const w of known) {
    wordMap.set(w.hanzi, w);
  }

  const allCandidateWords = Array.from(wordMap.values());
  const qPinyin = normalizePinyin(trimmed);
  const qVi = normalizeVietnamese(trimmed);

  const matchedWords: Array<{ word: Word; score: number }> = [];

  for (const w of allCandidateWords) {
    let matches = false;
    let score = 0;

    const wPinyin = normalizePinyin(w.pinyin);
    const wVi = normalizeVietnamese(w.meaning);

    if (mode === 'hanzi') {
      if (isHanziText(trimmed)) {
        matches = w.hanzi.includes(trimmed);
      } else {
        matches = matchesQuery(w.hanzi, trimmed);
      }
      if (w.hanzi === trimmed) score += 100;
    } else if (mode === 'pinyin') {
      matches =
        matchesQuery(w.pinyin, trimmed) ||
        (Boolean(w.examplePinyin) && matchesQuery(w.examplePinyin, trimmed));
      if (wPinyin.clean === qPinyin.clean) score += 90;
    } else if (mode === 'vi') {
      matches =
        matchesQuery(w.meaning, trimmed) ||
        (Boolean(w.exampleMeaning) && matchesQuery(w.exampleMeaning, trimmed));
      if (wVi === qVi) score += 80;
    } else {
      // mode === 'all'
      const composite = `${w.hanzi} [${w.pinyin}] /${w.meaning}/ ${w.exampleMeaning || ''}`;
      matches =
        matchesQuery(composite, trimmed) ||
        matchesQuery(w.hanzi, trimmed) ||
        matchesQuery(w.pinyin, trimmed) ||
        matchesQuery(w.meaning, trimmed);

      if (w.hanzi === trimmed) score += 100;
      else if (wPinyin.clean === qPinyin.clean) score += 90;
      else if (wVi === qVi) score += 80;
      else if (w.hanzi.startsWith(trimmed)) score += 50;
      else if (wPinyin.clean.startsWith(qPinyin.clean)) score += 40;
    }

    if (matches) {
      matchedWords.push({ word: w, score });
    }
  }

  matchedWords.sort((a, b) => b.score - a.score);

  return matchedWords.map(({ word: w }) => ({
    id: w.id,
    traditional: w.hanzi,
    simplified: w.hanzi,
    pinyin: w.pinyin,
    definitions: [w.meaning, w.exampleMeaning].filter(Boolean)
  }));
}

/**
 * Search the 122k Chinese-Vietnamese dictionary.
 * Queries /api/dictionary with fallback to local curriculum search when offline or on failure.
 */
export async function searchDictionary(
  query: string,
  mode: 'all' | 'hanzi' | 'pinyin' | 'vi' = 'all',
  offset = 0,
  limit = 20,
  signal?: AbortSignal
): Promise<DictionarySearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      results: [],
      total: 0,
      count: 0,
      dictionaryTotal: cachedHealthTotal > 0 ? cachedHealthTotal : 122596,
      totalMatches: 0,
      pageCount: 0,
      offset,
      limit,
      query: '',
      mode,
      source: 'database'
    };
  }

  let backendFailed = false;

  try {
    const url = `/api/dictionary?q=${encodeURIComponent(trimmed)}&mode=${mode}&offset=${offset}&limit=${limit}`;
    const res = await apiFetch(url, { method: 'GET', signal });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as Partial<DictionarySearchResult>;
        if (data && Array.isArray(data.results)) {
          const dictTotal =
            typeof data.dictionaryTotal === 'number' && data.dictionaryTotal > 0
              ? data.dictionaryTotal
              : (cachedHealthTotal > 0 ? cachedHealthTotal : 122596);
          const totalMatches =
            typeof data.totalMatches === 'number'
              ? data.totalMatches
              : (typeof data.total === 'number' ? data.total : data.results.length);
          const pageCount =
            typeof data.pageCount === 'number'
              ? data.pageCount
              : (typeof data.count === 'number' ? data.count : data.results.length);

          return {
            results: data.results,
            total: totalMatches,
            count: pageCount,
            dictionaryTotal: dictTotal,
            totalMatches,
            pageCount,
            offset: typeof data.offset === 'number' ? data.offset : offset,
            limit: typeof data.limit === 'number' ? data.limit : limit,
            query: trimmed,
            mode,
            source: 'database'
          };
        }
      }
      backendFailed = true;
    } else {
      backendFailed = true;
    }
  } catch (err: unknown) {
    // If request was actively cancelled by client AbortSignal, rethrow
    if (
      signal?.aborted ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw err;
    }
    backendFailed = true;
  }

  // Local offline search fallback
  const localMatches = searchLocalLessons(trimmed, mode);
  const paginated = localMatches.slice(offset, offset + limit);

  return {
    results: paginated,
    total: localMatches.length,
    count: paginated.length,
    dictionaryTotal: cachedHealthTotal > 0 ? cachedHealthTotal : 122596,
    totalMatches: localMatches.length,
    pageCount: paginated.length,
    offset,
    limit,
    query: trimmed,
    mode,
    source: 'local',
    apiFailed: backendFailed && localMatches.length === 0,
    degraded: backendFailed
  };
}

/**
 * Get details of a single dictionary entry.
 * Calls /api/dictionary?id=... with local curriculum fallback.
 */
export async function getDictionaryDetail(
  id: string,
  signal?: AbortSignal
): Promise<DbDictionaryResult | null> {
  try {
    const res = await apiFetch(`/api/dictionary?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      signal
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as DbDictionaryResult;
      }
    }
  } catch {
    // Fall back to local word lookup
  }

  const localWord =
    FOUNDATIONAL_FALLBACK_WORDS.find(w => w.id === id || w.hanzi === id) ||
    findWord(id);
  if (localWord) {
    return {
      id: localWord.id,
      traditional: localWord.hanzi,
      simplified: localWord.hanzi,
      pinyin: localWord.pinyin,
      definitions: [localWord.meaning, localWord.exampleMeaning].filter(Boolean)
    };
  }

  return null;
}

export function resolveApiKeyForModel(_model?: string, explicitKey?: string): string {
  return (explicitKey || '').trim();
}

/**
 * Check health and connectivity to AI Agent Router.
 */
export async function checkAiHealth(
  modelCandidate?: string,
  apiKeyCandidate?: string,
  baseUrlCandidate?: string,
  signal?: AbortSignal
): Promise<AiConnectionStatus> {
  let apiKey = apiKeyCandidate;
  let baseUrl = baseUrlCandidate;
  let model = modelCandidate;

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('zhongxue.ai.config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!apiKey && parsed?.apiKey) apiKey = parsed.apiKey;
        if (!baseUrl && parsed?.baseUrl) baseUrl = parsed.baseUrl;
        if (!model && parsed?.model) model = parsed.model;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  model = (model || 'deepseek-v4-flash').trim();
  baseUrl = (baseUrl || 'https://agentrouter.org/v1').trim();
  apiKey = resolveApiKeyForModel(model, apiKey);

  try {
    const res = await apiFetch('/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping', apiKey, baseUrl, model }),
      signal
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as AiConnectionStatus;
      }
    }
  } catch (err) {
    if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw err;
    }
    return {
      ok: false,
      provider: 'AgentRouter / Offline',
      model,
      baseUrl,
      error: err instanceof Error ? err.message : 'Không thể kết nối máy chủ'
    };
  }

  return {
    ok: false,
    provider: 'AgentRouter',
    model,
    baseUrl,
    error: 'Máy chủ phản hồi mã lỗi'
  };
}

/**
 * Send message to AI Conversation partner.
 * Supports AbortSignal for UI cancellation, live AI / guided response handling,
 * and robust local guided fallback when offline.
 *
 * Overloads support both options-object and positional arguments.
 */
export async function sendAiMessage(
  input: string | ConversationTurn[],
  options?: SendAiMessageOptions,
  signal?: AbortSignal
): Promise<ConversationReply>;

export async function sendAiMessage(
  message: string,
  unitId?: number,
  history?: ConversationTurn[],
  threadId?: number,
  roleId?: string,
  modelCandidate?: string,
  signal?: AbortSignal
): Promise<ConversationReply>;

export async function sendAiMessage(
  input: string | ConversationTurn[],
  optionsOrUnitId?: number | SendAiMessageOptions,
  historyOrSignal?: ConversationTurn[] | AbortSignal,
  threadId?: number,
  roleId?: string,
  modelCandidate?: string,
  explicitSignal?: AbortSignal
): Promise<ConversationReply> {
  let allMessages: ConversationTurn[] = [];
  let lastUserMessage = '';
  let unitId = 1;
  let activeThreadId: number | undefined;
  let activeRoleId: string | undefined;
  let activeModel: string | undefined;
  let activeBaseUrl: string | undefined;
  let activeApiKey: string | undefined;
  let activeTimeoutMs: number | undefined;
  let signal: AbortSignal | undefined;

  if (typeof optionsOrUnitId === 'object' && optionsOrUnitId !== null) {
    const opts = optionsOrUnitId;
    signal = opts.signal || (historyOrSignal instanceof AbortSignal ? historyOrSignal : undefined);

    if (Array.isArray(input)) {
      allMessages = [...input];
      const last = [...input].reverse().find(m => m.role === 'user');
      lastUserMessage = last ? last.content : '';
    } else {
      lastUserMessage = input.trim();
      allMessages = [
        ...(opts.history || []),
        { role: 'user', content: lastUserMessage }
      ];
    }

    unitId = opts.unitId ?? 1;
    activeThreadId = opts.threadId;
    activeRoleId = opts.roleId;
    activeModel = opts.model;
    activeBaseUrl = opts.baseUrl;
    activeApiKey = opts.apiKey;
    activeTimeoutMs = opts.timeoutMs;
  } else {
    // Positional signature
    const messageStr = typeof input === 'string' ? input : '';
    lastUserMessage = messageStr.trim();
    unitId = typeof optionsOrUnitId === 'number' ? optionsOrUnitId : 1;
    const history = Array.isArray(historyOrSignal) ? historyOrSignal : [];
    signal = explicitSignal || (historyOrSignal instanceof AbortSignal ? historyOrSignal : undefined);

    allMessages = [...history, { role: 'user', content: lastUserMessage }];
    activeThreadId = threadId;
    activeRoleId = roleId;
    activeModel = modelCandidate;
  }

  if (signal?.aborted) {
    throw new DOMException('The operation was aborted', 'AbortError');
  }

  // Retrieve stored configuration if available in browser
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('zhongxue.ai.config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!activeApiKey && parsed?.apiKey) activeApiKey = parsed.apiKey;
        if (!activeBaseUrl && parsed?.baseUrl) activeBaseUrl = parsed.baseUrl;
        if (!activeModel && parsed?.model) activeModel = parsed.model;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  const model = (activeModel || 'deepseek-v4-flash').trim();
  const baseUrl = (activeBaseUrl || 'https://agentrouter.org/v1').trim();
  const apiKey = resolveApiKeyForModel(model, activeApiKey);

  try {
    const res = await apiFetch('/api/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'chat',
        unitId,
        threadId: activeThreadId,
        roleId: activeRoleId,
        messages: allMessages.slice(-20),
        apiKey,
        baseUrl,
        model,
        timeoutMs: activeTimeoutMs
      }),
      signal
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as Partial<ConversationReply>;
        if (data && typeof data.content === 'string') {
          return {
            mode: data.mode === 'guided' ? 'guided' : 'ai',
            content: data.content,
            model: data.model,
            provider: data.provider,
            thread: data.thread,
            meta: data.meta
          };
        }
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw err;
    }
    // Upstream or network failed: seamlessly fall back to local guided tutor
  }

  const fallback = simulateLocalAiReply(lastUserMessage, activeRoleId);
  return {
    mode: 'guided',
    content: fallback.content,
    thread: fallback.thread,
    meta: {
      fallbackReason: 'offline',
      guidanceNote: 'Gia sư hướng dẫn cục bộ (Ngoại tuyến)'
    }
  };
}

/**
 * Simulated intelligent tutor response following TOCFL Taiwan standards across life and professional scenarios.
 */
export function simulateLocalAiReply(userText: string, roleId?: string): ConversationReply {
  const lower = userText.toLowerCase();

  // Explicit Scenario Role overrides
  if (roleId === 'factory') {
    return {
      mode: 'guided',
      content: `中文：組長，這台機台剛才亮紅燈警報了，需要通知技術員維修。另外請問今天晚上有需要配合加班嗎？\nPinyin: Zǔzhǎng, zhè tái jītái gāngcái liàng hóngdēng jǐngbào le, xūyào tōngzhī jìshùyuán wéixiū. Lìngwài qǐngwèn jīntiān wǎnshang yǒu xūyào pèihé jiābān ma?\nTiếng Việt: Thưa tổ trưởng, máy này vừa báo đèn đỏ cảnh báo, cần báo kỹ thuật viên sửa chữa. Ngoài ra xin hỏi tối nay có cần phối hợp tăng ca không ạ?\n練習：Gợi ý phản xạ: 組長，我今天可以配合加班兩個小時，下班時我會記得刷卡打卡。(Thưa tổ trưởng, hôm nay em có thể tăng ca 2 tiếng, khi tan ca em sẽ nhớ quẹt thẻ).`
    };
  }

  if (roleId === 'tax') {
    return {
      mode: 'guided',
      content: `中文：您好！五月份是臺灣綜合所得稅申報期。請問您去年在臺灣居留是否滿183天？請出示您的居留證與扣繳憑單。\nPinyin: Nín hǎo! Wǔ yuèfèn shì Táiwān zōnghé suǒdéshuì shēnbào qī. Qǐngwèn nín qùnián zài Táiwān jūliú shìfǒu mǎn yībǎi bāshísān tiān? Qǐng chūshì nín de jūliúzhèng yǔ kòujiǎo píngdān.\nTiếng Việt: Xin chào! Tháng 5 là kỳ kê khai thuế thu nhập cá nhân tại Đài Loan. Xin hỏi năm ngoái bạn có cư trú đủ 183 ngày không? Vui lòng xuất trình thẻ ARC và chứng từ khấu trừ thuế.\n練習：Gợi ý phản xạ: 我去年居留超過183天，這是我的居留證與公司的扣繳憑單，想辦理線上退稅。(Năm ngoái tôi cư trú hơn 183 ngày, đây là thẻ ARC và chứng từ khấu trừ của công ty, tôi muốn làm thủ tục hoàn thuế trực tuyến).`
    };
  }

  if (roleId === 'tech') {
    return {
      mode: 'guided',
      content: `中文：工程師您好！這批3奈米晶圓正在無塵室進行先進製程曝光，目前的良率指標非常穩定。\nPinyin: Gōngchéngshī nín hǎo! Zhè pī sān nàimǐ jīngyuán zhèngzài wúchénshì jìnxíng xiānjìn zhìchéng pùguāng, mùqián de liánglǜ zhǐbiāo fēicháng wěndìng.\nTiếng Việt: Chào kỹ sư! Lô wafer 3nm này đang trong phòng sạch thực hiện quy trình quang khắc tiên tiến, chỉ số tỷ lệ thành phẩm (yield rate) hiện rất ổn định.\n練習：Gợi ý phản xạ: 請特別監控這道蝕刻步驟的良率變化，並與研發部門確認參數。(Xin đặc biệt theo dõi biến động tỷ lệ thành phẩm ở bước khắc này và xác nhận thông số với bộ phận R&D).`
    };
  }

  if (roleId === 'scooter') {
    return {
      mode: 'guided',
      content: `中文：你好！租機車一天六百元，附兩頂安全帽。請問你有國際駕照或臺灣機車駕照嗎？加滿95汽油，發票存載具。\nPinyin: Nǐ hǎo! Zū jīchē yì tiān liùbǎi yuán, fù liǎng dǐng ānquánmào. Qǐngwèn nǐ yǒu guójì jiàzhào huò Táiwān jīchē jiàzhào ma? Jiāmǎn jiǔwǔ qìyóu, fāpiào cún zàijù.\nTiếng Việt: Chào bạn! Thuê xe máy một ngày 600 tệ, kèm 2 mũ bảo hiểm. Bạn có bằng lái quốc tế hay Đài Loan không? Đổ đầy xăng 95, hóa đơn lưu mã thẻ.\n練習：Gợi ý phản xạ: 請問前面有台灣中油加油站嗎？95加滿，謝謝！(Xin hỏi phía trước có trạm xăng CPC không? Đổ đầy xăng 95, cảm ơn!).`
    };
  }

  if (roleId === 'interview') {
    return {
      mode: 'guided',
      content: `中文：很高興能與您面試！請用中文簡單介紹您的專業背景、過往專案經驗以及期望薪資與可到職日期。\nPinyin: Hěn gāoxìng néng yǔ nín miànshì! Qǐng yòng zhōngwén jiǎndān jièshào nín de zhuānyè bèijǐng, guòwǎng zhuān'àn jīngyàn yǐjí qīwàng xīnzī yǔ kě dàozhí rìqí.\nTiếng Việt: Rất vui được phỏng vấn cùng bạn! Xin hãy dùng tiếng Hoa giới thiệu ngắn gọn nền tảng chuyên môn, kinh nghiệm dự án, mức lương kỳ vọng và ngày có thể nhận việc.\n練習：Gợi ý phản xạ: 經理好！我叫小安，來自越南，有三年的工作經驗，希望能為貴公司貢獻所長。(Chào giám đốc! Em tên Tiểu An, đến từ Việt Nam, có 3 năm kinh nghiệm, hy vọng có thể cống hiến cho quý công ty).`
    };
  }

  // Topic: Factory work & Overtime
  if (
    lower.includes('công xưởng') ||
    lower.includes('tăng ca') ||
    lower.includes('quẹt thẻ') ||
    lower.includes('máy hỏng') ||
    lower.includes('tổ trưởng') ||
    lower.includes('加班') ||
    lower.includes('打卡') ||
    lower.includes('機台') ||
    lower.includes('組長')
  ) {
    return {
      mode: 'guided',
      content: `中文：組長，這台機器剛才亮紅燈故障了，需要找維修人員。另外請問今天需要加班嗎？\nPinyin: Zǔzhǎng, zhè tái jīqì gāngcái liàng hóngdēng gùzhàng le, xūyào zhǎo wéixiū rényuán. Lìngwài qǐngwèn jīntiān xūyào jiābān ma?\nTiếng Việt: Thưa tổ trưởng, máy này vừa báo đèn đỏ bị lỗi, cần gọi thợ bảo trì. Ngoài ra xin hỏi hôm nay có cần tăng ca không ạ?\n練習：Gợi ý phản xạ: 我今天可以配合加班兩個小時，下班時我會記得打卡。(Hôm nay tôi có thể phối hợp tăng ca 2 tiếng, khi tan ca tôi sẽ nhớ quẹt thẻ).`
    };
  }

  // Topic: Tax filing & 183 days residency
  if (
    lower.includes('khai thuế') ||
    lower.includes('thuế thu nhập') ||
    lower.includes('183 ngày') ||
    lower.includes('hoàn thuế') ||
    lower.includes('giảm trừ') ||
    lower.includes('報稅') ||
    lower.includes('所得稅') ||
    lower.includes('扣繳憑單') ||
    lower.includes('退稅')
  ) {
    return {
      mode: 'guided',
      content: `中文：外籍人士一曆年住滿183天適用綜合所得稅累進稅率，並可享有標準扣除額與退稅。\nPinyin: Wàijí rénshì yì lìnìan zhùmǎn yībǎi bāshísān tiān shìyòng zōnghé suǒdéshuì lěijìn shuìlǜ, bìng kě xiǎngyǒu biāozhǔn kòuchú'é yǔ tuìshuì.\nTiếng Việt: Người nước ngoài ở đủ 183 ngày trong một năm dương lịch được áp dụng biểu thuế lũy tiến, hưởng mức giảm trừ tiêu chuẩn và được hoàn thuế.\n練習：Gợi ý phản xạ: 請問線上報稅需要準備健保卡和讀卡機嗎？(Xin hỏi khai thuế online có cần chuẩn bị thẻ BHYT và đầu đọc thẻ không?).`
    };
  }

  // Topic: Semiconductor & High-tech
  if (
    lower.includes('bán dẫn') ||
    lower.includes('wafer') ||
    lower.includes('phòng sạch') ||
    lower.includes('tsmc') ||
    lower.includes('tiến trình') ||
    lower.includes('3nm') ||
    lower.includes('2nm') ||
    lower.includes('晶圓') ||
    lower.includes('無塵室') ||
    lower.includes('半導體') ||
    lower.includes('良率')
  ) {
    return {
      mode: 'guided',
      content: `中文：工程師您好！這批晶圓正在無塵室進行曝光製程，良率表現相當優秀。\nPinyin: Gōngchéngshī nín hǎo! Zhè pī jīngyuán zhèngzài wúchénshì jìnxíng pùguāng zhìchéng, liánglǜ biǎoxiàn xiāngdāng yōuxiù.\nTiếng Việt: Chào kỹ sư! Lô wafer này đang được quang khắc trong phòng sạch, tỷ lệ thành phẩm (yield rate) rất xuất sắc.\n練習：Gợi ý phản xạ: 請持續監控關鍵製程參數以確保良率。(Xin tiếp tục theo dõi các thông số tiến trình then chốt để đảm bảo tỷ lệ thành phẩm).`
    };
  }

  // Topic: Scooter & Transportation
  if (
    lower.includes('xe máy') ||
    lower.includes('thuê xe') ||
    lower.includes('機車') ||
    lower.includes('租車') ||
    lower.includes('trạm xăng') ||
    lower.includes('mũ bảo hiểm') ||
    lower.includes('95加滿') ||
    lower.includes('加油站')
  ) {
    return {
      mode: 'guided',
      content: `中文：租機車一天六百元，請出示駕照。這頂是你的安全帽，前面右轉有一家加油站。\nPinyin: Zū jīchē yì tiān liùbǎi yuán, qǐng chūshì jiàzhào. Zhè dǐng shì nǐ de ānquánmào, qiánmiàn yòuzhuǎn yǒu yì jiā jiāyóuzhàn.\nTiếng Việt: Thuê xe máy một ngày 600 tệ, vui lòng xuất trình bằng lái. Đây là mũ bảo hiểm của bạn, rẽ phải phía trước có trạm xăng.\n練習：Gợi ý phản xạ: 請問還車時需要把油箱加滿嗎？(Xin hỏi khi trả xe có cần đổ đầy bình xăng không?).`
    };
  }

  // Topic: Bubble tea / Drinks
  if (
    lower.includes('trà sữa') ||
    lower.includes('奶茶') ||
    lower.includes('trân châu') ||
    lower.includes('珍珠') ||
    lower.includes('bán táng') ||
    lower.includes('shǎo bīng') ||
    lower.includes('50嵐') ||
    /(độ|ít|nửa|thêm|không)\s+đường/i.test(lower) ||
    /(ít|nửa|không)\s+đá/i.test(lower) ||
    lower.includes('半糖') ||
    lower.includes('少冰') ||
    lower.includes('微冰') ||
    lower.includes('外帶')
  ) {
    return {
      mode: 'guided',
      content: `中文：你要喝珍珠奶茶還是四季春茶？甜度和冰塊要怎麼調整？\nPinyin: Nǐ yào hē zhēnzhū nǎichá háishì sìjìchūnchá? Tiándù hé bīngkuài yào zěnme tiáozhěng?\nTiếng Việt: Bạn muốn uống trà sữa trân châu hay trà Tứ Quý Xuân? Độ ngọt và độ đá điều chỉnh thế nào?\n練習：Rất tốt! Ở Đài Loan người ta thường chọn "半糖少冰" (bàn táng shǎo bīng - nửa đường ít đá) hoặc "微糖微冰" (ít đường ít đá). Hãy thử trả lời: 我要一杯波霸奶茶，半糖少冰，外帶。`
    };
  }

  // Topic: MRT / Commute / EasyCard
  if (
    lower.includes('mrt') ||
    lower.includes('捷運') ||
    lower.includes('悠遊卡') ||
    lower.includes('車站') ||
    lower.includes('出口') ||
    lower.includes('轉車') ||
    lower.includes('ga')
  ) {
    return {
      mode: 'guided',
      content: `中文：最近的捷運站就在前面直走右轉，進站請刷悠遊卡。\nPinyin: Zuìjìn de jiéyùn zhàn jiù zài qiánmiàn zhízǒu yòuzhuǎn, jìn zhàn qǐng shuā yōuyóukǎ.\nTiếng Việt: Ga MRT gần nhất ở ngay phía trước đi thẳng rồi rẽ phải, khi vào ga vui lòng quẹt thẻ EasyCard.\n練習：Từ "捷運" (jiéyùn - Tiệp vận) và "悠遊卡" (Yōuyóukǎ - Du du tạp) là từ vựng thiết yếu ở Đài Bắc. Hãy thử hỏi: 請問二號出口在哪裡？`
    };
  }

  // Topic: Night market / Beef noodles / Price
  if (
    lower.includes('夜市') ||
    lower.includes('牛肉麵') ||
    lower.includes('不要辣') ||
    lower.includes('好吃') ||
    lower.includes('小吃') ||
    lower.includes('chợ đêm') ||
    lower.includes('mì bò') ||
    lower.includes('bao nhiêu') ||
    lower.includes('多少錢')
  ) {
    return {
      mode: 'guided',
      content: `中文：這碗招牌牛肉麵一百五十元，請問要不要加辣？\nPinyin: Zhè wǎn zhāopái niúròu miàn yìbǎi wǔshí yuán, qǐngwèn yào bú yào jiā là?\nTiếng Việt: Tô mì bò đặc biệt này giá 150 Đài tệ, xin hỏi bạn có muốn thêm cay không?\n練習：Khi ăn ở chợ đêm (夜市 - yèshì), nếu không ăn cay bạn hãy nói: "我要一碗牛肉麵，不要辣，謝謝！"`
    };
  }

  // Topic: Convenience Store / Receipt / Card payment
  if (
    lower.includes('便利商店') ||
    lower.includes('袋子') ||
    lower.includes('發票') ||
    lower.includes('現金') ||
    lower.includes('刷卡') ||
    lower.includes('hóa đơn') ||
    lower.includes('quẹt thẻ') ||
    lower.includes('tiện lợi') ||
    lower.includes('7-11')
  ) {
    return {
      mode: 'guided',
      content: `中文：一共八十五元，請問需要袋子嗎？要付現金還是刷卡？\nPinyin: Yígòng bāshíwǔ yuán, qǐngwèn xūyào dàizi ma? Yào fù xiànjīn háishì shuā kǎ?\nTiếng Việt: Tổng cộng 85 tệ, xin hỏi bạn cần túi không? Thanh toán tiền mặt hay quẹt thẻ?\n練習：Hóa đơn ở Đài Loan ("發票" - fāpiào) có mã số dự thưởng xổ số mỗi 2 tháng! Hãy thử đáp: 不用袋子，請給我發票。`
    };
  }

  // Topic: Renting an apartment / Utilities / Deposit
  if (
    lower.includes('租房') ||
    lower.includes('房租') ||
    lower.includes('押金') ||
    lower.includes('水電費') ||
    lower.includes('thuê nhà') ||
    lower.includes('tiền cọc') ||
    lower.includes('điện nước')
  ) {
    return {
      mode: 'guided',
      content: `中文：這間房間靠近捷運站，一個月房租八千元，押金兩個月。\nPinyin: Zhè jiān fángjiān kàojìn jiéyùn zhàn, yí ge yuè fángzū bā qiān yuán, yājīn liǎng ge yuè.\nTiếng Việt: Căn phòng này gần ga MRT, tiền thuê mỗi tháng 8.000 tệ, tiền đặt cọc 2 tháng.\n練習：Khi thuê nhà ở Đài Loan, hãy luôn hỏi kỹ tiền điện nước: "請問房租包含水電費嗎？"`
    };
  }

  // Topic: Clinic / Health insurance card / Symptoms
  if (
    lower.includes('掛號') ||
    lower.includes('健保卡') ||
    lower.includes('頭痛') ||
    lower.includes('發燒') ||
    lower.includes('不舒服') ||
    lower.includes('khám') ||
    lower.includes('đau đầu') ||
    lower.includes('sốt')
  ) {
    return {
      mode: 'guided',
      content: `中文：請先給我你的健保卡掛號。請問你哪裡不舒服？\nPinyin: Qǐng xiān gěi wǒ nǐ de jiànbǎokǎ guàhào. Qǐngwèn nǐ nǎlǐ bù shūfu?\nTiếng Việt: Vui lòng đưa thẻ Bảo hiểm Y tế để đăng ký khám trước. Xin hỏi bạn thấy khó chịu ở đâu?\n練習：Dùng cấu trúc "時間 + 開始 + triệu chứng" để mô tả với bác sĩ: 我昨天開始頭痛，也有一點發燒。`
    };
  }

  // Topic: Banking & ARC
  if (
    lower.includes('ngân hàng') ||
    lower.includes('bưu điện') ||
    lower.includes('mở tài khoản') ||
    lower.includes('thẻ atm') ||
    lower.includes('con dấu') ||
    lower.includes('chuyển tiền') ||
    lower.includes('arc') ||
    lower.includes('cư trú')
  ) {
    return {
      mode: 'guided',
      content: `中文：外籍人士開戶需要攜帶有效居留證（ARC）、護照以及個人印章。\nPinyin: Wàijí rénshì kāihù xūyào xiédài yǒuxiào jūliúzhèng (ARC), hùzhào yǐjí gèrén yìnzhāng.\nTiếng Việt: Người nước ngoài mở tài khoản cần mang theo thẻ cư trú (ARC) còn hạn, hộ chiếu và con dấu cá nhân.\n練習：Gợi ý phản xạ: 我想開戶和辦提款卡，請幫我抽號碼牌。(Tôi muốn mở tài khoản và làm thẻ ATM, xin giúp tôi bốc số thứ tự).`
    };
  }

  // Topic: Workplace / Meeting / Asking for help or leave
  if (
    lower.includes('上班') ||
    lower.includes('開會') ||
    lower.includes('幫忙') ||
    lower.includes('請假') ||
    lower.includes('再說一次') ||
    lower.includes('đi làm') ||
    lower.includes('họp') ||
    lower.includes('nghỉ phép')
  ) {
    return {
      mode: 'guided',
      content: `中文：我們今天下午兩點開會。如果需要幫忙或請假，可以先告訴我。\nPinyin: Wǒmen jīntiān xiàwǔ liǎng diǎn kāihuì. Rúguǒ xūyào bāngmáng huò qǐngjià, kěyǐ xiān gàosu wǒ.\nTiếng Việt: Hai giờ chiều nay chúng ta họp. Nếu cần giúp đỡ hoặc xin nghỉ phép, bạn có thể báo trước cho tôi.\n練習：Khi nghe chưa rõ ở nơi làm việc, hãy lịch sự nói: "不好意思，可以請你再說一次嗎？"`
    };
  }

  // Topic: Job interview & Resume
  if (
    lower.includes('phỏng vấn') ||
    lower.includes('xin việc') ||
    lower.includes('cv') ||
    lower.includes('kinh nghiệm') ||
    lower.includes('lương')
  ) {
    return {
      mode: 'guided',
      content: `中文：請先用中文做一分鐘的簡單自我介紹，說明您的專業專長與過往經驗。\nPinyin: Qǐng xiān yòng zhōngwén zuò yì fēnzhōng de jiǎndān zìwǒ jièshào, shuōmíng nín de zhuānyè zhuāncháng yǔ guòwǎng jīngyàn.\nTiếng Việt: Xin hãy dùng tiếng Hoa giới thiệu ngắn gọn trong 1 phút về chuyên môn và kinh nghiệm đã qua của bạn.\n練習：Gợi ý phản xạ: 經理好！我叫小安，來自越南，有三年的工作經驗。(Chào giám đốc! Tôi tên Tiểu An, đến từ Việt Nam, có 3 năm kinh nghiệm làm việc).`
    };
  }

  // Topic: Asking for translation or meaning
  if (
    lower.includes('nghĩa là gì') ||
    lower.includes('dịch') ||
    lower.includes('nói sao') ||
    lower.includes('nói thế nào')
  ) {
    return {
      mode: 'guided',
      content: `中文：在臺灣，您可以直接說：「請問這個用中文怎麼說？」\nPinyin: Zài Táiwān, nín kěyǐ zhíjiē shuō: "Qǐngwèn zhège yòng zhōngwén zěnme shuō?"\nTiếng Việt: Ở Đài Loan, bạn có thể hỏi trực tiếp: "Xin hỏi câu này tiếng Trung nói thế nào?".\n練習：Bạn có thể gõ câu cần dịch (ví dụ: gọi taxi, tính tiền, cảm ơn) để tôi hướng dẫn chi tiết nhé!`
    };
  }

  // Topic 1 & General Greeting / Self-introduction
  return {
    mode: 'guided',
    content: `中文：你好！很高興認識你。我也很喜歡跟來自越南的朋友一起練習繁體中文！\nPinyin: Nǐ hǎo! Hěn gāoxìng rènshi nǐ. Wǒ yě hěn xǐhuān gēn láizì Yuènán de péngyou yìqǐ liànxí fántǐ zhōngwén!\nTiếng Việt: Xin chào! Rất vui được làm quen với bạn. Tôi rất thích cùng những người bạn đến từ Việt Nam luyện tiếng Hoa Phồn thể!\n練習：Hãy thử giới thiệu tên bằng mẫu câu "我叫 + tên, 我來自越南" hoặc chọn một tình huống nhập vai ở menu phía trên nhé!`
  };
}

type StrokeType = 'H' | 'S' | 'P' | 'N' | 'D' | 'Z' | 'T';

interface HanziProfile {
  char: string;
  strokes: number;
  types?: StrokeType[];
  isCurriculum?: boolean;
}

export const OFFLINE_HANZI_PROFILES: HanziProfile[] = [
  { char: '一', strokes: 1, types: ['H'], isCurriculum: true },
  { char: '乙', strokes: 1, types: ['Z'] },
  { char: '二', strokes: 2, types: ['H', 'H'] },
  { char: '十', strokes: 2, types: ['H', 'S'] },
  { char: '人', strokes: 2, types: ['P', 'N'] },
  { char: '八', strokes: 2, types: ['P', 'N'] },
  { char: '入', strokes: 2, types: ['P', 'N'] },
  { char: '七', strokes: 2, types: ['H', 'Z'] },
  { char: '力', strokes: 2, types: ['Z', 'P'] },
  { char: '刀', strokes: 2, types: ['Z', 'P'] },
  { char: '三', strokes: 3, types: ['H', 'H', 'H'] },
  { char: '口', strokes: 3, types: ['S', 'Z', 'H'], isCurriculum: true },
  { char: '大', strokes: 3, types: ['H', 'P', 'N'] },
  { char: '小', strokes: 3, types: ['S', 'P', 'N'] },
  { char: '子', strokes: 3, types: ['Z', 'S', 'H'], isCurriculum: true },
  { char: '上', strokes: 3, types: ['S', 'H', 'H'], isCurriculum: true },
  { char: '工', strokes: 3, types: ['H', 'S', 'H'] },
  { char: '山', strokes: 3, types: ['S', 'Z', 'S'] },
  { char: '女', strokes: 3, types: ['Z', 'P', 'H'] },
  { char: '千', strokes: 3, types: ['P', 'H', 'S'] },
  { char: '川', strokes: 3, types: ['P', 'S', 'S'] },
  { char: '中', strokes: 4, types: ['S', 'Z', 'H', 'S'] },
  { char: '日', strokes: 4, types: ['S', 'Z', 'H', 'H'] },
  { char: '月', strokes: 4, types: ['P', 'Z', 'H', 'H'] },
  { char: '水', strokes: 4, types: ['S', 'Z', 'P', 'N'], isCurriculum: true },
  { char: '不', strokes: 4, types: ['H', 'P', 'S', 'D'], isCurriculum: true },
  { char: '牛', strokes: 4, types: ['P', 'H', 'H', 'S'], isCurriculum: true },
  { char: '少', strokes: 4, types: ['S', 'P', 'D', 'P'], isCurriculum: true },
  { char: '文', strokes: 4, types: ['D', 'H', 'P', 'N'] },
  { char: '方', strokes: 4, types: ['D', 'H', 'Z', 'P'] },
  { char: '手', strokes: 4, types: ['P', 'H', 'H', 'S'] },
  { char: '心', strokes: 4, types: ['D', 'Z', 'D', 'D'] },
  { char: '天', strokes: 4, types: ['H', 'H', 'P', 'N'] },
  { char: '友', strokes: 4, types: ['H', 'P', 'Z', 'N'] },
  { char: '五', strokes: 4, types: ['H', 'S', 'Z', 'H'] },
  { char: '生', strokes: 5, types: ['P', 'H', 'S', 'H', 'H'] },
  { char: '出', strokes: 5, types: ['Z', 'S', 'S', 'Z', 'S'], isCurriculum: true },
  { char: '半', strokes: 5, types: ['D', 'P', 'H', 'H', 'S'], isCurriculum: true },
  { char: '卡', strokes: 5, types: ['S', 'H', 'H', 'S', 'D'], isCurriculum: true },
  { char: '市', strokes: 5, types: ['D', 'H', 'S', 'Z', 'S'], isCurriculum: true },
  { char: '外', strokes: 5, types: ['P', 'Z', 'D', 'S', 'D'], isCurriculum: true },
  { char: '台', strokes: 5, types: ['Z', 'D', 'S', 'Z', 'H'] },
  { char: '本', strokes: 5, types: ['H', 'S', 'P', 'N', 'H'] },
  { char: '正', strokes: 5, types: ['H', 'S', 'H', 'S', 'H'] },
  { char: '白', strokes: 5, types: ['P', 'S', 'Z', 'H', 'H'] },
  { char: '四', strokes: 5, types: ['S', 'Z', 'P', 'S', 'H'] },
  { char: '好', strokes: 6, isCurriculum: true },
  { char: '字', strokes: 6, isCurriculum: true },
  { char: '名', strokes: 6, isCurriculum: true },
  { char: '吃', strokes: 6, isCurriculum: true },
  { char: '冰', strokes: 6, isCurriculum: true },
  { char: '多', strokes: 6, isCurriculum: true },
  { char: '肉', strokes: 6, isCurriculum: true },
  { char: '年', strokes: 6 },
  { char: '回', strokes: 6 },
  { char: '安', strokes: 6 },
  { char: '有', strokes: 6 },
  { char: '西', strokes: 6 },
  { char: '同', strokes: 6 },
  { char: '車', strokes: 7, types: ['H', 'S', 'Z', 'H', 'H', 'H', 'S'], isCurriculum: true },
  { char: '你', strokes: 7, isCurriculum: true },
  { char: '利', strokes: 7, isCurriculum: true },
  { char: '近', strokes: 7, isCurriculum: true },
  { char: '我', strokes: 7 },
  { char: '見', strokes: 7 },
  { char: '言', strokes: 7 },
  { char: '走', strokes: 7 },
  { char: '作', strokes: 7 },
  { char: '杯', strokes: 8, isCurriculum: true },
  { char: '金', strokes: 8, isCurriculum: true },
  { char: '房', strokes: 8, isCurriculum: true },
  { char: '押', strokes: 8, isCurriculum: true },
  { char: '附', strokes: 8, isCurriculum: true },
  { char: '店', strokes: 8, isCurriculum: true },
  { char: '刷', strokes: 8, isCurriculum: true },
  { char: '夜', strokes: 8, isCurriculum: true },
  { char: '和', strokes: 8 },
  { char: '知', strokes: 8 },
  { char: '門', strokes: 8 },
  { char: '雨', strokes: 8 },
  { char: '朋', strokes: 8 },
  { char: '的', strokes: 8 },
  { char: '茶', strokes: 9, isCurriculum: true },
  { char: '南', strokes: 9, isCurriculum: true },
  { char: '很', strokes: 9, isCurriculum: true },
  { char: '便', strokes: 9, isCurriculum: true },
  { char: '保', strokes: 9, isCurriculum: true },
  { char: '食', strokes: 9 },
  { char: '看', strokes: 9 },
  { char: '前', strokes: 9 },
  { char: '後', strokes: 9 },
  { char: '風', strokes: 9 },
  { char: '高', strokes: 10, isCurriculum: true },
  { char: '租', strokes: 10, isCurriculum: true },
  { char: '站', strokes: 10, isCurriculum: true },
  { char: '班', strokes: 10, isCurriculum: true },
  { char: '珠', strokes: 10, isCurriculum: true },
  { char: '家', strokes: 10 },
  { char: '時', strokes: 10 },
  { char: '真', strokes: 10 },
  { char: '氣', strokes: 10 },
  { char: '捷', strokes: 11, isCurriculum: true },
  { char: '悠', strokes: 11, isCurriculum: true },
  { char: '票', strokes: 11, isCurriculum: true },
  { char: '現', strokes: 11, isCurriculum: true },
  { char: '商', strokes: 11, isCurriculum: true },
  { char: '掛', strokes: 11, isCurriculum: true },
  { char: '健', strokes: 11, isCurriculum: true },
  { char: '假', strokes: 11, isCurriculum: true },
  { char: '問', strokes: 11 },
  { char: '國', strokes: 11 },
  { char: '動', strokes: 11 },
  { char: '常', strokes: 11 },
  { char: '越', strokes: 12, isCurriculum: true },
  { char: '運', strokes: 12, isCurriculum: true },
  { char: '遊', strokes: 12, isCurriculum: true },
  { char: '發', strokes: 12, isCurriculum: true },
  { char: '費', strokes: 12, isCurriculum: true },
  { char: '痛', strokes: 12, isCurriculum: true },
  { char: '舒', strokes: 12, isCurriculum: true },
  { char: '開', strokes: 12, isCurriculum: true },
  { char: '買', strokes: 12 },
  { char: '喜', strokes: 12 },
  { char: '湯', strokes: 12 },
  { char: '街', strokes: 12 },
  { char: '電', strokes: 13, isCurriculum: true },
  { char: '會', strokes: 13, isCurriculum: true },
  { char: '號', strokes: 13, isCurriculum: true },
  { char: '新', strokes: 13 },
  { char: '話', strokes: 13 },
  { char: '想', strokes: 13 },
  { char: '微', strokes: 13 },
  { char: '說', strokes: 14, isCurriculum: true },
  { char: '辣', strokes: 14, isCurriculum: true },
  { char: '漢', strokes: 14 },
  { char: '臺', strokes: 14 },
  { char: '鳳', strokes: 14 },
  { char: '梨', strokes: 11 },
  { char: '請', strokes: 15, isCurriculum: true },
  { char: '樣', strokes: 15 },
  { char: '熱', strokes: 15 },
  { char: '錢', strokes: 16, isCurriculum: true },
  { char: '頭', strokes: 16, isCurriculum: true },
  { char: '燒', strokes: 16, isCurriculum: true },
  { char: '糖', strokes: 16, isCurriculum: true },
  { char: '興', strokes: 16, isCurriculum: true },
  { char: '學', strokes: 16 },
  { char: '融', strokes: 16 },
  { char: '機', strokes: 16 },
  { char: '龍', strokes: 16 },
  { char: '謝', strokes: 17, isCurriculum: true },
  { char: '幫', strokes: 17, isCurriculum: true },
  { char: '講', strokes: 17 },
  { char: '鮮', strokes: 17 },
  { char: '轉', strokes: 18, isCurriculum: true },
  { char: '雞', strokes: 18 },
  { char: '關', strokes: 19 },
  { char: '簽', strokes: 19 },
  { char: '麵', strokes: 20, isCurriculum: true },
  { char: '觀', strokes: 24 },
  { char: '灣', strokes: 25 }
];

function classifySingleStroke(stroke: HandwritingStroke): { type: StrokeType; cy: number } {
  const [xs, ys] = stroke;
  const n = xs.length;
  if (n === 0) return { type: 'H', cy: 0 };
  const x0 = xs[0],
    y0 = ys[0];
  const xEnd = xs[n - 1],
    yEnd = ys[n - 1];
  const dx = xEnd - x0;
  const dy = yEnd - y0;
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;

  if (w < 25 && h < 25) return { type: 'D', cy };
  if (dx > 20 && dy > 20 && xs[Math.floor(n / 2)] > x0 + 10) return { type: 'Z', cy };
  if (Math.abs(dx) >= 1.4 * Math.abs(dy) && dx > 0) return { type: 'H', cy };
  if (Math.abs(dy) >= 1.4 * Math.abs(dx) && dy > 0) return { type: 'S', cy };
  if (dx < -10 && dy > 10) return { type: 'P', cy };
  if (dx > 10 && dy > 10) return { type: 'N', cy };
  if (dx > 10 && dy < -10) return { type: 'T', cy };

  return { type: Math.abs(dx) > Math.abs(dy) ? 'H' : 'S', cy };
}

/**
 * Client-side stroke classifier fallback when handwriting API is offline or returns no candidates.
 */
export function fallbackClientHandwriting(strokes: HandwritingStroke[]): string[] {
  if (!strokes.length) return [];
  const count = strokes.length;
  const classified = strokes.map(classifySingleStroke);
  const types = classified.map(c => c.type);

  const allH = types.every(t => t === 'H');
  const isSortedY = classified.every((c, i) => i === 0 || c.cy >= classified[i - 1].cy - 10);

  const scored = OFFLINE_HANZI_PROFILES.map(item => {
    let score = 0;
    const diff = Math.abs(item.strokes - count);
    if (diff === 0) score += 100;
    else if (diff === 1) score += 55;
    else if (diff === 2) score += 25;
    else if (diff === 3) score += 10;
    else return { char: item.char, score: 0 };

    if (item.types) {
      item.types.slice(0, count).forEach((t, i) => {
        if (t === types[i]) score += 25;
      });
    }

    if (allH && isSortedY) {
      if (count === 1 && item.char === '一') score += 120;
      if (count === 2 && item.char === '二') score += 120;
      if (count === 3 && item.char === '三') score += 120;
    }
    if (
      count === 2 &&
      types[0] === 'P' &&
      types[1] === 'N' &&
      (item.char === '人' || item.char === '八' || item.char === '入')
    ) {
      score += 80;
    }
    if (count === 4 && types.join('').startsWith('SZH') && item.char === '中') {
      score += 90;
    }
    if (item.isCurriculum) score += 15;

    return { char: item.char, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.char)
    .slice(0, 8);
}

/**
 * Validate handwriting strokes data structure.
 */
function isValidStrokeArray(strokes: unknown): strokes is HandwritingStroke[] {
  if (!Array.isArray(strokes) || strokes.length === 0) return false;
  return strokes.every(stroke => {
    if (!Array.isArray(stroke) || stroke.length < 2) return false;
    const [xs, ys] = stroke;
    return (
      Array.isArray(xs) &&
      Array.isArray(ys) &&
      xs.length === ys.length &&
      xs.every(x => typeof x === 'number' && Number.isFinite(x)) &&
      ys.every(y => typeof y === 'number' && Number.isFinite(y))
    );
  });
}

/**
 * Recognize handwritten Chinese characters from stroke coordinate arrays.
 * Supports AbortSignal and gracefully falls back to client handwriting recognizer.
 */
export async function recognizeHandwriting(
  strokes: HandwritingStroke[],
  signal?: AbortSignal
): Promise<string[]>;

export async function recognizeHandwriting(
  strokes: HandwritingStroke[],
  options?: HandwritingOptions,
  signal?: AbortSignal
): Promise<string[]>;

export async function recognizeHandwriting(
  strokes: HandwritingStroke[],
  width?: number,
  height?: number,
  signal?: AbortSignal
): Promise<string[]>;

export async function recognizeHandwriting(
  strokes: HandwritingStroke[],
  widthOrOptionsOrSignal?: number | HandwritingOptions | AbortSignal,
  heightOrSignal?: number | AbortSignal,
  explicitSignal?: AbortSignal
): Promise<string[]> {
  return (await recognizeHandwritingDetailed(strokes, widthOrOptionsOrSignal, heightOrSignal, explicitSignal)).candidates;
}

export interface HandwritingRecognitionResult {
  candidates: string[];
  source: 'online' | 'local_fallback';
}

/** Detailed counterpart for UIs that must identify geometric fallback honestly. */
export async function recognizeHandwritingDetailed(
  strokes: HandwritingStroke[],
  widthOrOptionsOrSignal?: number | HandwritingOptions | AbortSignal,
  heightOrSignal?: number | AbortSignal,
  explicitSignal?: AbortSignal
): Promise<HandwritingRecognitionResult> {
  if (!isValidStrokeArray(strokes)) {
    return { candidates: [], source: 'local_fallback' };
  }

  let width = 300;
  let height = 300;
  let language = 'zh-TW';
  let signal: AbortSignal | undefined;

  if (widthOrOptionsOrSignal instanceof AbortSignal) {
    signal = widthOrOptionsOrSignal;
  } else if (typeof widthOrOptionsOrSignal === 'object' && widthOrOptionsOrSignal !== null) {
    const opts = widthOrOptionsOrSignal as HandwritingOptions;
    if (typeof opts.width === 'number') width = opts.width;
    if (typeof opts.height === 'number') height = opts.height;
    if (typeof opts.language === 'string') language = opts.language;
    signal = opts.signal || (heightOrSignal instanceof AbortSignal ? heightOrSignal : undefined);
  } else if (typeof widthOrOptionsOrSignal === 'number') {
    width = widthOrOptionsOrSignal;
    if (typeof heightOrSignal === 'number') {
      height = heightOrSignal;
    }
    signal = explicitSignal || (heightOrSignal instanceof AbortSignal ? heightOrSignal : undefined);
  }

  if (signal?.aborted) {
    throw new DOMException('The operation was aborted', 'AbortError');
  }

  try {
    const res = await apiFetch('/api/handwriting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strokes, width, height, language }),
      signal
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as Partial<HandwritingResponse>;
        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
          return { candidates: data.candidates, source: data.source === 'local_fallback' ? 'local_fallback' : 'online' };
        }
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw err;
    }
    // Upstream or network error: fall back to client recognizer
  }

  return { candidates: fallbackClientHandwriting(strokes), source: 'local_fallback' };
}
