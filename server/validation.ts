import type { IncomingMessage } from 'node:http';
import {
  badRequest,
  payloadTooLarge,
  unsupportedMediaType
} from './errors.ts';
import type {
  ConversationAction,
  ConversationRequestBody,
  ConversationTurn,
  HandwritingRequestBody,
  HandwritingStroke
} from '../src/types.ts';

/**
 * Size constants (in bytes)
 */
export const MAX_BODY_SIZE_CHAT = 512 * 1024; // 512 KB
export const MAX_BODY_SIZE_CONVERSATION = 100 * 1024; // 100 KB
export const MAX_BODY_SIZE_HANDWRITING = 1024 * 1024; // 1 MB
export const MAX_BODY_SIZE_DEFAULT = 512 * 1024; // 512 KB

export const MAX_QUERY_LENGTH = 200; // max length for 'q'
export const MAX_ID_LENGTH = 100; // max length for 'id'
export const MAX_MESSAGES_COUNT = 50; // max number of messages
export const MAX_MESSAGE_CONTENT_LENGTH = 4000; // max chars per message
export const MAX_STROKES_COUNT = 50; // max number of strokes
export const MAX_POINTS_PER_STROKE = 1000; // max points per stroke
export const MIN_STROKE_COORD = -500;
export const MAX_STROKE_COORD = 2000;

/**
 * Valid search modes for /api/dictionary
 */
export const VALID_DICTIONARY_MODES = ['all', 'hanzi', 'pinyin', 'vi'] as const;
export type DictionarySearchMode = (typeof VALID_DICTIONARY_MODES)[number];

/**
 * Valid message roles for /api/conversation
 */
export const VALID_MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;

/**
 * Valid conversation actions
 */
export const VALID_CONVERSATION_ACTIONS: ConversationAction[] = ['chat', 'ping', 'health'];

/**
 * Validated dictionary query result
 */
export interface ValidatedDictionaryQuery {
  q?: string;
  id?: string;
  mode: DictionarySearchMode;
  offset: number;
  limit: number;
}

/**
 * Parse and validate JSON string or Buffer into a non-null JSON object
 */
export function parseJsonBody<T = unknown>(raw: string | Buffer): T {
  const text = typeof raw === 'string' ? raw.trim() : raw.toString('utf-8').trim();
  if (!text) {
    throw badRequest('Request body cannot be empty', undefined, 'BAD_REQUEST');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw badRequest('Malformed JSON in request body', undefined, 'INVALID_JSON');
  }

  return parsed as T;
}

/**
 * Ensure parsed JSON is a plain JavaScript object (not an array, not a primitive, not null)
 */
export function validateJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw badRequest('Request body must be a JSON object', undefined, 'BAD_REQUEST');
  }
  return value as Record<string, unknown>;
}

/**
 * Validate Content-Type header to ensure it specifies application/json
 */
export function validateJsonContentType(contentType?: string): void {
  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    throw unsupportedMediaType('Content-Type must be application/json');
  }
}

/**
 * Validate payload size limit
 */
export function validatePayloadSize(sizeInBytes: number, maxBytes: number): void {
  if (sizeInBytes > maxBytes) {
    throw payloadTooLarge(
      `Request body size (${sizeInBytes} bytes) exceeds limit of ${maxBytes} bytes`,
      { size: sizeInBytes, max: maxBytes }
    );
  }
}

/**
 * Validate and sanitize /api/dictionary query parameters
 */
export function validateDictionaryQuery(
  rawQuery: Record<string, unknown> | URLSearchParams | unknown
): ValidatedDictionaryQuery {
  let getVal: (k: string) => string | undefined;

  if (rawQuery instanceof URLSearchParams) {
    getVal = (k: string) => rawQuery.get(k) ?? undefined;
  } else if (rawQuery && typeof rawQuery === 'object') {
    const qObj = rawQuery as Record<string, unknown>;
    getVal = (k: string) => {
      const v = qObj[k];
      if (v === undefined || v === null) return undefined;
      if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : String(v[0]);
      return typeof v === 'string' ? v : String(v);
    };
  } else {
    throw badRequest('Invalid query parameters', undefined, 'BAD_REQUEST');
  }

  const rawQ = getVal('q');
  const rawId = getVal('id');
  const rawMode = getVal('mode');
  const rawOffset = getVal('offset');
  const rawLimit = getVal('limit');

  const q = rawQ !== undefined ? rawQ.trim() : undefined;
  const id = rawId !== undefined ? rawId.trim() : undefined;

  if (q && q.length > MAX_QUERY_LENGTH) {
    throw badRequest(`Query parameter "q" cannot exceed ${MAX_QUERY_LENGTH} characters`);
  }

  if (id && id.length > MAX_ID_LENGTH) {
    throw badRequest(`Query parameter "id" cannot exceed ${MAX_ID_LENGTH} characters`);
  }

  if (!q && !id) {
    throw badRequest('Either "q" or "id" query parameter is required');
  }

  let mode: DictionarySearchMode = 'all';
  if (rawMode !== undefined && rawMode.trim() !== '') {
    const trimmedMode = rawMode.trim().toLowerCase() as DictionarySearchMode;
    if (!VALID_DICTIONARY_MODES.includes(trimmedMode)) {
      throw badRequest(`Invalid mode "${rawMode}". Allowed modes: ${VALID_DICTIONARY_MODES.join(', ')}`);
    }
    mode = trimmedMode;
  }

  let offset = 0;
  if (rawOffset !== undefined && rawOffset.trim() !== '') {
    const parsedOffset = Number(rawOffset);
    if (isNaN(parsedOffset) || !Number.isInteger(parsedOffset) || parsedOffset < 0 || parsedOffset > Number.MAX_SAFE_INTEGER) {
      throw badRequest('Query parameter "offset" must be a non-negative integer');
    }
    offset = parsedOffset;
  }

  let limit = 50;
  if (rawLimit !== undefined && rawLimit.trim() !== '') {
    const parsedLimit = Number(rawLimit);
    if (isNaN(parsedLimit) || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw badRequest('Query parameter "limit" must be an integer between 1 and 100');
    }
    limit = parsedLimit;
  }

  return {
    ...(q ? { q } : {}),
    ...(id ? { id } : {}),
    mode,
    offset,
    limit
  };
}

/**
 * Validate chat messages array strictly.
 * Ensures messages is an array, each item is an object with valid role and string content.
 */
export function validateChatMessages(messages: unknown): ConversationTurn[] {
  if (!Array.isArray(messages)) {
    throw badRequest('messages must be an array');
  }
  if (messages.length > MAX_MESSAGES_COUNT) {
    throw badRequest(`messages array cannot exceed ${MAX_MESSAGES_COUNT} items`);
  }

  const result: ConversationTurn[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      throw badRequest(`Message at index ${i} must be a JSON object`);
    }
    const role = (msg as { role?: unknown }).role;
    const content = (msg as { content?: unknown }).content;

    if (typeof role !== 'string' || !VALID_MESSAGE_ROLES.includes(role as typeof VALID_MESSAGE_ROLES[number])) {
      throw badRequest(
        `Invalid message role "${role}" at index ${i}. Allowed roles: ${VALID_MESSAGE_ROLES.join(', ')}`
      );
    }

    if (typeof content !== 'string') {
      throw badRequest(`Message content at index ${i} must be a string`);
    }

    if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      throw badRequest(
        `Message content at index ${i} exceeds maximum limit of ${MAX_MESSAGE_CONTENT_LENGTH} characters`
      );
    }

    result.push({
      role: role as ConversationTurn['role'],
      content
    });
  }
  return result;
}

/**
 * Validate /api/conversation request body
 */
export function validateConversationBody(rawBody: unknown): ConversationRequestBody & {
  timeoutMs: number;
  messages: ConversationTurn[];
} {
  const obj = validateJsonObject(rawBody);

  let action: ConversationAction = 'chat';
  if (obj.action !== undefined) {
    if (typeof obj.action !== 'string' || !VALID_CONVERSATION_ACTIONS.includes(obj.action as ConversationAction)) {
      throw badRequest(`Invalid action. Allowed actions: ${VALID_CONVERSATION_ACTIONS.join(', ')}`);
    }
    action = obj.action as ConversationAction;
  }

  let unitId: number | undefined = undefined;
  if (obj.unitId !== undefined) {
    const u = Number(obj.unitId);
    if (isNaN(u) || !Number.isInteger(u) || u < 1 || u > 100) {
      throw badRequest('unitId must be an integer between 1 and 100');
    }
    unitId = u;
  }

  let threadId: number | undefined = undefined;
  if (obj.threadId !== undefined) {
    const t = Number(obj.threadId);
    if (isNaN(t) || !Number.isInteger(t) || t < 0) {
      throw badRequest('threadId must be a non-negative integer');
    }
    threadId = t;
  }

  let roleId: string | undefined = undefined;
  if (obj.roleId !== undefined) {
    if (typeof obj.roleId !== 'string' || obj.roleId.length > 100) {
      throw badRequest('roleId must be a string up to 100 characters');
    }
    roleId = obj.roleId.trim();
  }

  let model: string | undefined = undefined;
  if (obj.model !== undefined) {
    if (typeof obj.model !== 'string' || obj.model.length > 200) {
      throw badRequest('model must be a string up to 200 characters');
    }
    model = obj.model.trim();
  }

  let baseUrl: string | undefined = undefined;
  if (obj.baseUrl !== undefined) {
    if (typeof obj.baseUrl !== 'string' || obj.baseUrl.length > 1000) {
      throw badRequest('baseUrl must be a string up to 1000 characters');
    }
    baseUrl = obj.baseUrl.trim();
  }

  let apiKey: string | undefined = undefined;
  if (obj.apiKey !== undefined) {
    if (typeof obj.apiKey !== 'string' || obj.apiKey.length > 500) {
      throw badRequest('apiKey must be a string up to 500 characters');
    }
    apiKey = obj.apiKey.trim();
  }

  // timeoutMs: cap between 1000ms and 30000ms, default 12000ms
  let timeoutMs = 12000;
  if (obj.timeoutMs !== undefined) {
    const t = Number(obj.timeoutMs);
    if (isNaN(t) || !Number.isFinite(t)) {
      throw badRequest('timeoutMs must be a valid number');
    }
    timeoutMs = Math.min(30000, Math.max(1000, Math.round(t)));
  }

  const messages: ConversationTurn[] = [];
  if (obj.messages !== undefined) {
    messages.push(...validateChatMessages(obj.messages));
  }

  return {
    action,
    ...(unitId !== undefined ? { unitId } : {}),
    ...(threadId !== undefined ? { threadId } : {}),
    ...(roleId ? { roleId } : {}),
    ...(model ? { model } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
    timeoutMs,
    messages
  };
}

export const validateConversationRequest = validateConversationBody;

/**
 * Validate /api/handwriting request body
 */
export function validateHandwritingBody(rawBody: unknown): HandwritingRequestBody & {
  strokes: HandwritingStroke[];
  width: number;
  height: number;
  language: string;
} {
  const obj = validateJsonObject(rawBody);

  if (!('strokes' in obj) || !Array.isArray(obj.strokes)) {
    throw badRequest('strokes field is required and must be an array');
  }

  if (obj.strokes.length === 0) {
    throw badRequest('strokes array cannot be empty');
  }

  if (obj.strokes.length > MAX_STROKES_COUNT) {
    throw badRequest(`strokes array cannot exceed ${MAX_STROKES_COUNT} strokes`);
  }

  const normalizedStrokes: HandwritingStroke[] = [];

  for (let sIdx = 0; sIdx < obj.strokes.length; sIdx++) {
    const rawStroke = obj.strokes[sIdx];

    if (!Array.isArray(rawStroke) || rawStroke.length === 0) {
      throw badRequest(`Stroke at index ${sIdx} must be a non-empty array`);
    }

    // Determine whether this stroke is Format 2 (Array of points [[x, y], ...] or [{x, y}, ...])
    // or Format 1 (Coordinate channels [xCoords[], yCoords[], tCoords[]?])
    const isFormat2 =
      rawStroke.length > 3 ||
      (rawStroke.length > 0 &&
        typeof rawStroke[0] === 'object' &&
        rawStroke[0] !== null &&
        !Array.isArray(rawStroke[0])) ||
      (rawStroke.length > 0 &&
        Array.isArray(rawStroke[0]) &&
        rawStroke[0].length === 2 &&
        rawStroke.every((p) => Array.isArray(p) && p.length === 2));

    if (!isFormat2) {
      // Format 1: [xCoords[], yCoords[], timeOffsets[]?]
      if (rawStroke.length >= 2 && Array.isArray(rawStroke[0]) && Array.isArray(rawStroke[1]) && rawStroke.length <= 3) {
        const xArr = rawStroke[0] as unknown[];
        const yArr = rawStroke[1] as unknown[];
        const tArr = (rawStroke[2] as unknown[]) || [];

        if (xArr.length !== yArr.length) {
          throw badRequest(`Stroke at index ${sIdx} has mismatched X and Y coordinates count`);
        }

        if (xArr.length === 0) {
          throw badRequest(`Stroke at index ${sIdx} must contain at least 1 point`);
        }

        if (xArr.length > MAX_POINTS_PER_STROKE) {
          throw badRequest(`Stroke at index ${sIdx} exceeds maximum ${MAX_POINTS_PER_STROKE} points`);
        }

        const validX: number[] = [];
        const validY: number[] = [];
        const validT: number[] = [];

        for (let pIdx = 0; pIdx < xArr.length; pIdx++) {
          const x = Number(xArr[pIdx]);
          const y = Number(yArr[pIdx]);
          const t = tArr[pIdx] !== undefined ? Number(tArr[pIdx]) : pIdx * 10;

          if (isNaN(x) || !Number.isFinite(x) || x < MIN_STROKE_COORD || x > MAX_STROKE_COORD) {
            throw badRequest(`Stroke ${sIdx} point ${pIdx}: X coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
          }
          if (isNaN(y) || !Number.isFinite(y) || y < MIN_STROKE_COORD || y > MAX_STROKE_COORD) {
            throw badRequest(`Stroke ${sIdx} point ${pIdx}: Y coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
          }

          validX.push(x);
          validY.push(y);
          validT.push(isNaN(t) ? pIdx * 10 : t);
        }

        normalizedStrokes.push([validX, validY, validT]);
        continue;
      }
    }

    // Format 2: Array of points: [[x1, y1], [x2, y2], ...] or [{x, y}, ...]
    if (rawStroke.length > MAX_POINTS_PER_STROKE) {
      throw badRequest(`Stroke at index ${sIdx} exceeds maximum ${MAX_POINTS_PER_STROKE} points`);
    }

    const validX: number[] = [];
    const validY: number[] = [];
    const validT: number[] = [];

    for (let pIdx = 0; pIdx < rawStroke.length; pIdx++) {
      const pt = rawStroke[pIdx];
      let x: number;
      let y: number;
      let t: number;

      if (Array.isArray(pt)) {
        if (pt.length < 2) {
          throw badRequest(`Stroke ${sIdx} point ${pIdx} must contain at least [x, y] coordinates`);
        }
        x = Number(pt[0]);
        y = Number(pt[1]);
        t = pt[2] !== undefined ? Number(pt[2]) : pIdx * 10;
      } else if (pt && typeof pt === 'object') {
        const ptObj = pt as { x?: unknown; y?: unknown; t?: unknown };
        x = Number(ptObj.x);
        y = Number(ptObj.y);
        t = ptObj.t !== undefined ? Number(ptObj.t) : pIdx * 10;
      } else {
        throw badRequest(`Stroke ${sIdx} point ${pIdx} is invalid`);
      }

      if (isNaN(x) || !Number.isFinite(x) || x < MIN_STROKE_COORD || x > MAX_STROKE_COORD) {
        throw badRequest(`Stroke ${sIdx} point ${pIdx}: X coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
      }
      if (isNaN(y) || !Number.isFinite(y) || y < MIN_STROKE_COORD || y > MAX_STROKE_COORD) {
        throw badRequest(`Stroke ${sIdx} point ${pIdx}: Y coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
      }

      validX.push(x);
      validY.push(y);
      validT.push(isNaN(t) ? pIdx * 10 : t);
    }

    normalizedStrokes.push([validX, validY, validT]);
  }

  let width = 300;
  if (obj.width !== undefined) {
    const w = Number(obj.width);
    if (isNaN(w) || w < 10 || w > 5000) {
      throw badRequest('width must be a number between 10 and 5000');
    }
    width = w;
  }

  let height = 300;
  if (obj.height !== undefined) {
    const h = Number(obj.height);
    if (isNaN(h) || h < 10 || h > 5000) {
      throw badRequest('height must be a number between 10 and 5000');
    }
    height = h;
  }

  let language = 'zh-TW';
  if (obj.language !== undefined) {
    if (typeof obj.language !== 'string' || obj.language.length > 20) {
      throw badRequest('language must be a string up to 20 characters');
    }
    language = obj.language.trim();
  }

  return {
    strokes: normalizedStrokes,
    width,
    height,
    language
  };
}

/**
 * Stream reader helper that reads an HTTP request body with content-type checking and max size enforcement
 */
export async function readAndValidateJsonBody<T = unknown>(
  req: IncomingMessage,
  maxBytes = MAX_BODY_SIZE_DEFAULT
): Promise<T> {
  const contentType = req.headers['content-type'];
  validateJsonContentType(contentType);

  const contentLengthHeader = req.headers['content-length'];
  if (contentLengthHeader) {
    const declaredSize = parseInt(contentLengthHeader, 10);
    if (!isNaN(declaredSize)) {
      validatePayloadSize(declaredSize, maxBytes);
    }
  }

  let bytesRead = 0;
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytesRead += buf.length;
    if (bytesRead > maxBytes) {
      throw payloadTooLarge(
        `Request body size (${bytesRead} bytes) exceeds limit of ${maxBytes} bytes`,
        { bytesRead, maxBytes }
      );
    }
    chunks.push(buf);
  }

  const rawString = Buffer.concat(chunks).toString('utf-8');
  return parseJsonBody<T>(rawString);
}
