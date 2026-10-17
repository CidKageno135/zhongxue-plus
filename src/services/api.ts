/**
 * ZhongXue+ API Client Service
 * Connects the frontend to the PGlite 122k database and OpenRouter AI conversation backend.
 */

import { searchWords } from '../domain/learning';
import type { Word } from '../types';

export interface DbDictionaryResult {
  id: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
}

export interface SearchResponse {
  results: DbDictionaryResult[];
  total: number;
  count: number;
  offset: number;
  source: 'database' | 'local';
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationReply {
  mode: 'ai' | 'guided';
  content: string;
  thread?: {
    id: number;
    messages: ConversationTurn[];
  };
}

const BACKEND_BASE = 'http://127.0.0.1:3001';

/** Helper to try proxy URL first, then direct backend port if needed */
async function fetchWithFallback(urlPath: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(urlPath, options);
    if (res.ok) return res;
  } catch {
    // Ignore and try direct backend port
  }

  // Try direct backend port
  const fullUrl = `${BACKEND_BASE}${urlPath}`;
  return fetch(fullUrl, options);
}

/** Check if the PGlite backend database is accessible */
export async function checkBackendHealth(): Promise<{ online: boolean; totalEntries: number }> {
  try {
    const res = await fetchWithFallback('/api/health');
    if (res.ok) {
      return { online: true, totalEntries: 122595 };
    }
  } catch {
    // offline
  }
  return { online: false, totalEntries: 40 };
}

/** Search the real 122k PGlite Chinese-Vietnamese dictionary */
export async function searchDictionary(
  query: string,
  mode: 'all' | 'hanzi' | 'pinyin' | 'vi' = 'all',
  offset = 0
): Promise<SearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      results: [],
      total: 0,
      count: 122595,
      offset: 0,
      source: 'database',
    };
  }

  try {
    const url = `/api/dictionary?q=${encodeURIComponent(trimmed)}&mode=${mode}&offset=${offset}`;
    const res = await fetchWithFallback(url);
    if (res.ok) {
      const data = await res.json();
      return {
        results: data.results || [],
        total: data.total || 0,
        count: data.count || 122595,
        offset: data.offset || 0,
        source: 'database',
      };
    }
  } catch {
    // Fallback to local
  }

  // Local fallback from lesson words
  const localMatches = searchWords(trimmed);
  const results: DbDictionaryResult[] = localMatches.map((w: Word) => ({
    id: w.id,
    traditional: w.hanzi,
    simplified: w.hanzi,
    pinyin: w.pinyin,
    definitions: [w.meaning, w.exampleMeaning].filter(Boolean),
  }));

  return {
    results,
    total: results.length,
    count: 40,
    offset: 0,
    source: 'local',
  };
}

/** Get details of a single dictionary entry */
export async function getDictionaryDetail(id: string): Promise<DbDictionaryResult | null> {
  try {
    const res = await fetchWithFallback(`/api/dictionary?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    //
  }
  return null;
}

/** Send message to AI Conversation partner (OpenRouter or smart Guided Tutor) */
export async function sendAiMessage(
  message: string,
  unitId = 1,
  history: ConversationTurn[] = [],
  threadId?: number
): Promise<ConversationReply> {
  const userMsg: ConversationTurn = { role: 'user', content: message.trim() };
  const allMessages = [...history, userMsg];

  try {
    const res = await fetchWithFallback('/api/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unitId,
        threadId,
        messages: allMessages.slice(-10),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        mode: data.mode || 'ai',
        content: data.content,
        thread: data.thread,
      };
    }
  } catch {
    //
  }

  // Intelligent local simulation if server is temporarily unreachable
  return simulateLocalAiReply(message, unitId);
}

/** Simulated intelligent tutor response following TOCFL A1-A2 Taiwan standards */
function simulateLocalAiReply(userText: string, unitId: number): ConversationReply {
  const lower = userText.toLowerCase();

  if (lower.includes('trà sữa') || lower.includes('奶茶')) {
    return {
      mode: 'guided',
      content: `中文：你要喝珍珠奶茶還是紅茶？甜度和冰塊要怎麼調？\nPinyin: Nǐ yào hē zhēnzhū nǎichá háishì hóngchá? Tiándù hé bīngkuài yào zěnme tiáo?\nTiếng Việt: Bạn muốn uống trà sữa trân châu hay hồng trà? Độ ngọt và độ đá điều chỉnh thế nào?\n練習：Rất tốt! Ở Đài Loan người ta thường chọn "微糖微冰" (wēitáng wēibīng - ít đường ít đá). Hãy thử trả lời: 我要微糖微冰。`,
    };
  }

  if (lower.includes('mrt') || lower.includes('捷運') || lower.includes('ga') || lower.includes('站')) {
    return {
      mode: 'guided',
      content: `中文：最近的捷運站就在前面右轉，走路大概三分鐘。\nPinyin: Zuìjìn de jiéyùn zhàn jiù zài qiánmiàn yòuzhuǎn, zǒulù dàgài sān fēnzhōng.\nTiếng Việt: Ga MRT gần nhất ở ngay phía trước rẽ phải, đi bộ khoảng 3 phút.\n練習：Từ "捷運" (jiéyùn) là từ vựng rất phổ biến ở Đài Loan. Bạn có thẻ EasyCard (悠遊卡 - Yōuyóukǎ) chưa?`,
    };
  }

  if (lower.includes('bao nhiêu') || lower.includes('tiền') || lower.includes('多少錢') || lower.includes('錢')) {
    return {
      mode: 'guided',
      content: `中文：這一份小吃是六十五塊新台幣。\nPinyin: Zhè yī fèn xiǎochī shì liùshíwǔ kuài xīntáibì.\nTiếng Việt: Phần đồ ăn vặt này là 65 Đài tệ.\n練習：Người Đài Loan thường dùng từ "塊" (kuài) để chỉ đồng tiền (元 - yuán). Hãy thử hỏi: 可以刷卡嗎？(Có thể quẹt thẻ không?)`,
    };
  }

  return {
    mode: 'guided',
    content: `中文：你好！很高興和你用中文練習。今天過得怎麼樣？\nPinyin: Nǐ hǎo! Hěn gāoxìng hé nǐ yòng zhōngwén liànxí. Jīntiān guò de zěnmeyàng?\nTiếng Việt: Xin chào! Rất vui được luyện tập tiếng Trung cùng bạn. Hôm nay của bạn thế nào?\n練習：Hãy thử dùng câu đơn giản: 我很好，謝謝！(Tôi rất khỏe, cảm ơn!) hoặc chia sẻ điều bạn muốn học hôm nay nhé.`,
  };
}
