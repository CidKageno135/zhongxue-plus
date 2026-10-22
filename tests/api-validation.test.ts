import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
  payloadTooLarge,
  unsupportedMediaType,
  badGateway,
  serviceUnavailable,
  gatewayTimeout,
  internalError,
  sendJson,
  sendError,
  sanitizeString,
  sanitizeDetails,
  type HttpResponseLike
} from '../server/errors.ts';
import {
  parseJsonBody,
  validateJsonObject,
  validateJsonContentType,
  validatePayloadSize,
  validateDictionaryQuery,
  validateConversationBody,
  validateHandwritingBody,
  readAndValidateJsonBody,
  MAX_BODY_SIZE_CHAT,
  MAX_BODY_SIZE_HANDWRITING
} from '../server/validation.ts';

// Helper mock response factory
function createMockResponse(): HttpResponseLike & {
  body: string;
  headers: Record<string, string | number>;
} {
  return {
    statusCode: 200,
    body: '',
    headers: {},
    writableEnded: false,
    setHeader(name: string, value: string | number) {
      this.headers[name.toLowerCase()] = value;
    },
    end(chunk?: unknown) {
      if (chunk !== undefined) {
        this.body = typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf-8');
      }
      this.writableEnded = true;
    }
  };
}

// Helper mock IncomingMessage stream
function createMockRequest(
  chunks: (string | Buffer)[],
  headers: Record<string, string> = {}
): IncomingMessage {
  const stream = new Readable({
    read() {
      for (const chunk of chunks) {
        this.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf-8'));
      }
      this.push(null);
    }
  });
  // Attach headers
  (stream as unknown as { headers: Record<string, string> }).headers = headers;
  return stream as unknown as IncomingMessage;
}

describe('server/errors.ts', () => {
  describe('HttpError class', () => {
    it('creates an instance of HttpError and Error with proper fields', () => {
      const err = new HttpError(400, 'BAD_REQUEST', 'Invalid syntax', { field: 'name' });
      expect(err).toBeInstanceOf(HttpError);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('HttpError');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('Invalid syntax');
      expect(err.details).toEqual({ field: 'name' });
    });
  });

  describe('Factory helpers', () => {
    it('badRequest() returns 400 BAD_REQUEST', () => {
      const err = badRequest('Bad param', { field: 'q' });
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('Bad param');
      expect(err.details).toEqual({ field: 'q' });
    });

    it('unauthorized() returns 401 UNAUTHORIZED', () => {
      const err = unauthorized('No token');
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('No token');
    });

    it('forbidden() returns 403 FORBIDDEN', () => {
      const err = forbidden('Forbidden origin');
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('notFound() returns 404 NOT_FOUND', () => {
      const err = notFound('Route not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('methodNotAllowed() returns 405 METHOD_NOT_ALLOWED', () => {
      const err = methodNotAllowed('Use POST');
      expect(err.statusCode).toBe(405);
      expect(err.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('payloadTooLarge() returns 413 PAYLOAD_TOO_LARGE', () => {
      const err = payloadTooLarge('Too big', { size: 1000000 });
      expect(err.statusCode).toBe(413);
      expect(err.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('unsupportedMediaType() returns 415 UNSUPPORTED_MEDIA_TYPE', () => {
      const err = unsupportedMediaType('Expected JSON');
      expect(err.statusCode).toBe(415);
      expect(err.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('badGateway() returns 502 BAD_GATEWAY', () => {
      const err = badGateway('Upstream failed');
      expect(err.statusCode).toBe(502);
      expect(err.code).toBe('BAD_GATEWAY');
    });

    it('serviceUnavailable() returns 503 SERVICE_UNAVAILABLE', () => {
      const err = serviceUnavailable('Dictionary loading');
      expect(err.statusCode).toBe(503);
      expect(err.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('gatewayTimeout() returns 504 GATEWAY_TIMEOUT', () => {
      const err = gatewayTimeout('AI timeout');
      expect(err.statusCode).toBe(504);
      expect(err.code).toBe('GATEWAY_TIMEOUT');
    });

    it('internalError() returns 500 INTERNAL_ERROR', () => {
      const err = internalError('Server crash');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('sendJson()', () => {
    it('sets statusCode, Content-Type and ends with JSON payload', () => {
      const res = createMockResponse();
      sendJson(res, 200, { ok: true, count: 5 });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(JSON.parse(res.body)).toEqual({ ok: true, count: 5 });
      expect(res.writableEnded).toBe(true);
    });

    it('does nothing if response has already ended', () => {
      const res = createMockResponse();
      res.writableEnded = true;
      sendJson(res, 200, { ok: true });
      expect(res.body).toBe('');
    });
  });

  describe('Sanitization & Security Redaction', () => {
    it('redacts Windows file paths', () => {
      const raw = 'Failed to load file C:\\Users\\Administrator\\secret\\file.txt on server';
      const clean = sanitizeString(raw);
      expect(clean).not.toContain('C:\\Users');
      expect(clean).toContain('[REDACTED_PATH]');
    });

    it('redacts Unix file paths', () => {
      const raw = 'Error loading /Users/thanh/projects/zhongxue/keys.env';
      const clean = sanitizeString(raw);
      expect(clean).not.toContain('/Users/thanh');
      expect(clean).toContain('[REDACTED_PATH]');
    });

    it('redacts Bearer tokens', () => {
      const raw = 'Auth failed for header Bearer sk-secret1234567890abcdef123';
      const clean = sanitizeString(raw);
      expect(clean).not.toContain('sk-secret1234567890abcdef123');
      expect(clean).toContain('Bearer [REDACTED]');
    });

    it('redacts API keys and hash secrets', () => {
      const raw = 'Upstream key sk-99887766554433221100 was invalid';
      const clean = sanitizeString(raw);
      expect(clean).not.toContain('sk-99887766554433221100');
      expect(clean).toContain('[REDACTED_SECRET]');
    });

    it('redacts sensitive fields in details object', () => {
      const details = {
        name: 'test',
        apiKey: 'super-secret-key-12345',
        secretToken: 'secret-tok',
        stack: 'Error at /app/index.js:10:5',
        nested: {
          userPassword: 'my-password',
          safeField: 'hello'
        }
      };
      const cleaned = sanitizeDetails(details) as Record<string, unknown>;
      expect(cleaned.name).toBe('test');
      expect(cleaned.apiKey).toBe('[REDACTED]');
      expect(cleaned.secretToken).toBe('[REDACTED]');
      expect(cleaned.stack).toBe('[REDACTED]');
      const nested = cleaned.nested as Record<string, unknown>;
      expect(nested.userPassword).toBe('[REDACTED]');
      expect(nested.safeField).toBe('hello');
    });
  });

  describe('sendError()', () => {
    it('sends standardized error response from HttpError', () => {
      const res = createMockResponse();
      const err = badRequest('Invalid offset param', { offset: -1 });
      sendError(res, err);

      expect(res.statusCode).toBe(400);
      const parsed = JSON.parse(res.body);
      expect(parsed).toEqual({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid offset param',
          details: { offset: -1 }
        }
      });
    });

    it('sends standardized error response from status code and parameters', () => {
      const res = createMockResponse();
      sendError(res, 404, 'NOT_FOUND', 'Word not found', { id: 'dict-999' });

      expect(res.statusCode).toBe(404);
      const parsed = JSON.parse(res.body);
      expect(parsed).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Word not found',
          details: { id: 'dict-999' }
        }
      });
    });

    it('defaults generic unhandled Error to 500 INTERNAL_ERROR without leaking system error message or stack', () => {
      const res = createMockResponse();
      const err = new Error('ENOENT: no such file or directory, open C:\\secrets\\db.sqlite');
      sendError(res, err);

      expect(res.statusCode).toBe(500);
      const parsed = JSON.parse(res.body);
      expect(parsed.error.code).toBe('INTERNAL_ERROR');
      expect(parsed.error.message).toBe('Internal Server Error');
      expect(parsed.error.stack).toBeUndefined();
      expect(res.body).not.toContain('ENOENT');
      expect(res.body).not.toContain('secrets');
    });

    it('sanitizes file paths in custom error messages', () => {
      const res = createMockResponse();
      const err = notFound('File at C:\\Users\\Secret\\test.txt was not found');
      sendError(res, err);

      expect(res.statusCode).toBe(404);
      const parsed = JSON.parse(res.body);
      expect(parsed.error.message).not.toContain('C:\\Users');
      expect(parsed.error.message).toContain('[REDACTED_PATH]');
    });

    it('does nothing if response is already writableEnded', () => {
      const res = createMockResponse();
      res.writableEnded = true;
      sendError(res, badRequest('test'));
      expect(res.body).toBe('');
    });
  });
});

describe('server/validation.ts', () => {
  describe('parseJsonBody()', () => {
    it('parses valid JSON string', () => {
      const result = parseJsonBody<{ count: number }>('{"count": 10}');
      expect(result).toEqual({ count: 10 });
    });

    it('parses valid JSON Buffer', () => {
      const buf = Buffer.from(JSON.stringify({ active: true }), 'utf-8');
      const result = parseJsonBody<{ active: boolean }>(buf);
      expect(result).toEqual({ active: true });
    });

    it('throws 400 INVALID_JSON on malformed JSON string', () => {
      expect(() => parseJsonBody('{invalid}')).toThrowError(HttpError);
      try {
        parseJsonBody('{key: value}');
      } catch (e) {
        const err = e as HttpError;
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('INVALID_JSON');
      }
    });

    it('throws 400 BAD_REQUEST on empty body', () => {
      expect(() => parseJsonBody('')).toThrowError(HttpError);
      expect(() => parseJsonBody('   ')).toThrowError(HttpError);
      expect(() => parseJsonBody(Buffer.alloc(0))).toThrowError(HttpError);
    });
  });

  describe('validateJsonObject()', () => {
    it('accepts valid object', () => {
      const obj = { name: 'ZhongXue' };
      expect(validateJsonObject(obj)).toBe(obj);
    });

    it('rejects primitive types and null and arrays with 400 BAD_REQUEST', () => {
      const invalids = [123, 'string', true, false, null, undefined, [1, 2, 3]];
      for (const val of invalids) {
        expect(() => validateJsonObject(val)).toThrowError(HttpError);
        try {
          validateJsonObject(val);
        } catch (e) {
          expect((e as HttpError).statusCode).toBe(400);
          expect((e as HttpError).code).toBe('BAD_REQUEST');
        }
      }
    });
  });

  describe('validateJsonContentType()', () => {
    it('accepts application/json content types', () => {
      expect(() => validateJsonContentType('application/json')).not.toThrow();
      expect(() => validateJsonContentType('application/json; charset=utf-8')).not.toThrow();
      expect(() => validateJsonContentType('APPLICATION/JSON')).not.toThrow();
    });

    it('throws 415 UNSUPPORTED_MEDIA_TYPE for invalid or missing Content-Type', () => {
      const badTypes = [undefined, '', 'text/plain', 'text/html', 'multipart/form-data', 'application/xml'];
      for (const ct of badTypes) {
        expect(() => validateJsonContentType(ct)).toThrowError(HttpError);
        try {
          validateJsonContentType(ct);
        } catch (e) {
          expect((e as HttpError).statusCode).toBe(415);
          expect((e as HttpError).code).toBe('UNSUPPORTED_MEDIA_TYPE');
        }
      }
    });
  });

  describe('validatePayloadSize()', () => {
    it('allows sizes within limits and defines proper size constants', () => {
      expect(MAX_BODY_SIZE_CHAT).toBe(512 * 1024);
      expect(MAX_BODY_SIZE_HANDWRITING).toBe(1024 * 1024);
      expect(() => validatePayloadSize(100, 1000)).not.toThrow();
      expect(() => validatePayloadSize(1000, 1000)).not.toThrow();
    });

    it('throws 413 PAYLOAD_TOO_LARGE when size exceeds limit', () => {
      expect(() => validatePayloadSize(1001, 1000)).toThrowError(HttpError);
      try {
        validatePayloadSize(2000, 1000);
      } catch (e) {
        expect((e as HttpError).statusCode).toBe(413);
        expect((e as HttpError).code).toBe('PAYLOAD_TOO_LARGE');
      }
    });
  });

  describe('validateDictionaryQuery() (/api/dictionary)', () => {
    it('validates and trims search query "q" with default pagination', () => {
      const res = validateDictionaryQuery({ q: '  學生  ' });
      expect(res.q).toBe('學生');
      expect(res.mode).toBe('all');
      expect(res.offset).toBe(0);
      expect(res.limit).toBe(50);
    });

    it('validates search by "id"', () => {
      const res = validateDictionaryQuery({ id: 'dict-1234' });
      expect(res.id).toBe('dict-1234');
      expect(res.q).toBeUndefined();
      expect(res.mode).toBe('all');
    });

    it('validates custom mode, offset, and limit', () => {
      const res = validateDictionaryQuery({
        q: 'xuesheng',
        mode: 'pinyin',
        offset: '20',
        limit: '10'
      });
      expect(res.q).toBe('xuesheng');
      expect(res.mode).toBe('pinyin');
      expect(res.offset).toBe(20);
      expect(res.limit).toBe(10);
    });

    it('works seamlessly with URLSearchParams', () => {
      const params = new URLSearchParams('q=học+sinh&mode=vi&offset=15&limit=25');
      const res = validateDictionaryQuery(params);
      expect(res.q).toBe('học sinh');
      expect(res.mode).toBe('vi');
      expect(res.offset).toBe(15);
      expect(res.limit).toBe(25);
    });

    it('throws 400 when both "q" and "id" are missing or empty', () => {
      expect(() => validateDictionaryQuery({})).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: '   ', id: '  ' })).toThrowError(HttpError);
      try {
        validateDictionaryQuery({});
      } catch (e) {
        expect((e as HttpError).statusCode).toBe(400);
      }
    });

    it('throws 400 when "q" exceeds 200 characters', () => {
      const hugeQ = 'a'.repeat(201);
      expect(() => validateDictionaryQuery({ q: hugeQ })).toThrowError(HttpError);
    });

    it('throws 400 on invalid search mode', () => {
      expect(() => validateDictionaryQuery({ q: 'test', mode: 'japanese' })).toThrowError(HttpError);
    });

    it('throws 400 on negative offset', () => {
      expect(() => validateDictionaryQuery({ q: 'test', offset: '-1' })).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: 'test', offset: '-100' })).toThrowError(HttpError);
    });

    it('throws 400 on NaN or non-integer offset', () => {
      expect(() => validateDictionaryQuery({ q: 'test', offset: 'abc' })).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: 'test', offset: '2.5' })).toThrowError(HttpError);
    });

    it('throws 400 on limit <= 0 or limit > 100 or huge numbers', () => {
      expect(() => validateDictionaryQuery({ q: 'test', limit: '0' })).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: 'test', limit: '-5' })).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: 'test', limit: '101' })).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: 'test', limit: '999999' })).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: 'test', limit: 'not-a-number' })).toThrowError(HttpError);
      expect(() => validateDictionaryQuery({ q: 'test', limit: '15.5' })).toThrowError(HttpError);
    });
  });

  describe('validateConversationBody() (/api/conversation)', () => {
    it('validates standard chat payload with valid messages', () => {
      const body = {
        action: 'chat',
        unitId: 1,
        threadId: 10,
        roleId: 'factory',
        messages: [
          { role: 'user', content: 'Xin chào, tôi là công nhân mới.' },
          { role: 'assistant', content: '你好！很高興認識你。' }
        ],
        model: 'gpt-6.1-sol',
        timeoutMs: 15000
      };

      const res = validateConversationBody(body);
      expect(res.action).toBe('chat');
      expect(res.unitId).toBe(1);
      expect(res.threadId).toBe(10);
      expect(res.roleId).toBe('factory');
      expect(res.messages).toHaveLength(2);
      expect(res.model).toBe('gpt-6.1-sol');
      expect(res.timeoutMs).toBe(15000);
    });

    it('validates ping and health actions', () => {
      const pingRes = validateConversationBody({ action: 'ping', model: 'deepseek-v4-flash' });
      expect(pingRes.action).toBe('ping');

      const healthRes = validateConversationBody({ action: 'health' });
      expect(healthRes.action).toBe('health');
    });

    it('caps timeoutMs strictly between 1000ms and 30000ms', () => {
      // Clamps low values to 1000ms
      const lowRes = validateConversationBody({ timeoutMs: 500 });
      expect(lowRes.timeoutMs).toBe(1000);

      // Clamps high values to 30000ms
      const highRes = validateConversationBody({ timeoutMs: 999999 });
      expect(highRes.timeoutMs).toBe(30000);

      // Default timeoutMs is 12000ms
      const defaultRes = validateConversationBody({});
      expect(defaultRes.timeoutMs).toBe(12000);
    });

    it('throws 400 on invalid action', () => {
      expect(() => validateConversationBody({ action: 'delete_all' })).toThrowError(HttpError);
    });

    it('throws 400 on invalid timeoutMs (NaN)', () => {
      expect(() => validateConversationBody({ timeoutMs: 'unlimited' })).toThrowError(HttpError);
    });

    it('throws 400 on non-array messages', () => {
      expect(() => validateConversationBody({ messages: 'hello' })).toThrowError(HttpError);
      expect(() => validateConversationBody({ messages: { text: 'hi' } })).toThrowError(HttpError);
    });

    it('throws 400 on oversized messages history (> 50 messages)', () => {
      const messages = Array.from({ length: 51 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`
      }));
      expect(() => validateConversationBody({ messages })).toThrowError(HttpError);
    });

    it('throws 400 on invalid message role', () => {
      const body = {
        messages: [{ role: 'hacker', content: 'payload' }]
      };
      expect(() => validateConversationBody(body)).toThrowError(HttpError);
    });

    it('throws 400 on non-string message content', () => {
      const body = {
        messages: [{ role: 'user', content: 12345 }]
      };
      expect(() => validateConversationBody(body)).toThrowError(HttpError);
    });

    it('throws 400 on oversized message content (> 4000 characters)', () => {
      const hugeContent = 'x'.repeat(4001);
      const body = {
        messages: [{ role: 'user', content: hugeContent }]
      };
      expect(() => validateConversationBody(body)).toThrowError(HttpError);
    });

    it('throws 400 on non-string model or baseUrl or apiKey', () => {
      expect(() => validateConversationBody({ model: 123 })).toThrowError(HttpError);
      expect(() => validateConversationBody({ baseUrl: ['http://example.com'] })).toThrowError(HttpError);
      expect(() => validateConversationBody({ apiKey: { key: '123' } })).toThrowError(HttpError);
    });
  });

  describe('validateHandwritingBody() (/api/handwriting)', () => {
    it('validates Format 1 (Google IME coordinate arrays: [xCoords, yCoords, tCoords])', () => {
      const body = {
        strokes: [
          [
            [10, 20, 30],
            [40, 50, 60],
            [0, 10, 20]
          ]
        ],
        width: 400,
        height: 400,
        language: 'zh-TW'
      };

      const res = validateHandwritingBody(body);
      expect(res.strokes).toHaveLength(1);
      expect(res.strokes[0][0]).toEqual([10, 20, 30]);
      expect(res.strokes[0][1]).toEqual([40, 50, 60]);
      expect(res.strokes[0][2]).toEqual([0, 10, 20]);
      expect(res.width).toBe(400);
      expect(res.height).toBe(400);
      expect(res.language).toBe('zh-TW');
    });

    it('validates Format 2 (Point pairs: [[x1, y1], [x2, y2]]) and normalizes to [x[], y[], t[]]', () => {
      const body = {
        strokes: [
          [
            [15, 25],
            [35, 45],
            [55, 65]
          ]
        ]
      };

      const res = validateHandwritingBody(body);
      expect(res.strokes).toHaveLength(1);
      expect(res.strokes[0][0]).toEqual([15, 35, 55]);
      expect(res.strokes[0][1]).toEqual([25, 45, 65]);
      expect(res.strokes[0][2]).toEqual([0, 10, 20]);
      expect(res.width).toBe(300);
      expect(res.height).toBe(300);
      expect(res.language).toBe('zh-TW');
    });

    it('validates Format 2 (Point objects: [{x, y}, ...])', () => {
      const body = {
        strokes: [
          [
            { x: 100, y: 150 },
            { x: 120, y: 180 }
          ]
        ]
      };

      const res = validateHandwritingBody(body);
      expect(res.strokes).toHaveLength(1);
      expect(res.strokes[0][0]).toEqual([100, 120]);
      expect(res.strokes[0][1]).toEqual([150, 180]);
    });

    it('throws 400 when strokes field is missing or not array', () => {
      expect(() => validateHandwritingBody({})).toThrowError(HttpError);
      expect(() => validateHandwritingBody({ strokes: 'lines' })).toThrowError(HttpError);
    });

    it('throws 400 when strokes array is empty', () => {
      expect(() => validateHandwritingBody({ strokes: [] })).toThrowError(HttpError);
    });

    it('throws 400 when strokes count exceeds 50', () => {
      const strokes = Array.from({ length: 51 }, () => [
        [10, 20],
        [30, 40]
      ]);
      expect(() => validateHandwritingBody({ strokes })).toThrowError(HttpError);
    });

    it('throws 400 when a stroke exceeds 1000 points', () => {
      const hugeX = Array.from({ length: 1001 }, (_, i) => i);
      const hugeY = Array.from({ length: 1001 }, (_, i) => i);
      const body = {
        strokes: [[hugeX, hugeY]]
      };
      expect(() => validateHandwritingBody(body)).toThrowError(HttpError);
    });

    it('throws 400 when X and Y coordinates have mismatched length in Format 1', () => {
      const body = {
        strokes: [
          [
            [10, 20, 30],
            [10, 20]
          ]
        ]
      };
      expect(() => validateHandwritingBody(body)).toThrowError(HttpError);
    });

    it('throws 400 on coordinates out of bounds ([-500, 2000])', () => {
      // Under -500
      expect(() =>
        validateHandwritingBody({
          strokes: [
            [
              [-501, 10],
              [0, 10]
            ]
          ]
        })
      ).toThrowError(HttpError);

      // Over 2000
      expect(() =>
        validateHandwritingBody({
          strokes: [
            [
              [10, 2500],
              [10, 20]
            ]
          ]
        })
      ).toThrowError(HttpError);
    });

    it('throws 400 on NaN or non-finite coordinates', () => {
      expect(() =>
        validateHandwritingBody({
          strokes: [
            [
              [NaN, 10],
              [0, 10]
            ]
          ]
        })
      ).toThrowError(HttpError);
    });

    it('throws 400 on invalid width or height bounds', () => {
      expect(() => validateHandwritingBody({ strokes: [[[1, 2], [3, 4]]], width: 5 })).toThrowError(HttpError);
      expect(() => validateHandwritingBody({ strokes: [[[1, 2], [3, 4]]], width: 9999 })).toThrowError(HttpError);
      expect(() => validateHandwritingBody({ strokes: [[[1, 2], [3, 4]]], height: -5 })).toThrowError(HttpError);
    });
  });

  describe('readAndValidateJsonBody() stream reader', () => {
    it('reads and parses valid JSON from incoming request stream', async () => {
      const payload = JSON.stringify({ message: 'hello', model: 'test' });
      const req = createMockRequest([payload], {
        'content-type': 'application/json',
        'content-length': String(Buffer.byteLength(payload))
      });

      const body = await readAndValidateJsonBody<{ message: string; model: string }>(req);
      expect(body).toEqual({ message: 'hello', model: 'test' });
    });

    it('throws 415 when Content-Type is missing or not application/json', async () => {
      const req = createMockRequest(['{"key": "val"}'], {
        'content-type': 'text/plain'
      });
      await expect(readAndValidateJsonBody(req)).rejects.toThrowError(HttpError);
    });

    it('throws 413 PAYLOAD_TOO_LARGE when declared Content-Length exceeds limit', async () => {
      const req = createMockRequest(['{"key": "val"}'], {
        'content-type': 'application/json',
        'content-length': '2000000'
      });
      try {
        await readAndValidateJsonBody(req, MAX_BODY_SIZE_CHAT);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(HttpError);
        expect((e as HttpError).statusCode).toBe(413);
        expect((e as HttpError).code).toBe('PAYLOAD_TOO_LARGE');
      }
    });

    it('throws 413 PAYLOAD_TOO_LARGE when actual stream chunk bytes exceed limit', async () => {
      const chunk1 = 'a'.repeat(600);
      const chunk2 = 'b'.repeat(600);
      const req = createMockRequest([chunk1, chunk2], {
        'content-type': 'application/json'
      });

      try {
        await readAndValidateJsonBody(req, 1000);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(HttpError);
        expect((e as HttpError).statusCode).toBe(413);
        expect((e as HttpError).code).toBe('PAYLOAD_TOO_LARGE');
      }
    });
  });
});
