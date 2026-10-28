import type { ServerResponse } from 'node:http';
import type { ApiErrorBody } from '../src/types.ts';

/**
 * Standard structured HTTP Error class with status code, error code, message and optional details.
 */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Helper factory functions for standard HTTP status codes */
export function badRequest(message = 'Bad Request', details?: unknown, code = 'BAD_REQUEST'): HttpError {
  return new HttpError(400, code, message, details);
}

export function unauthorized(message = 'Unauthorized', details?: unknown, code = 'UNAUTHORIZED'): HttpError {
  return new HttpError(401, code, message, details);
}

export function forbidden(message = 'Forbidden', details?: unknown, code = 'FORBIDDEN'): HttpError {
  return new HttpError(403, code, message, details);
}

export function notFound(message = 'Not Found', details?: unknown, code = 'NOT_FOUND'): HttpError {
  return new HttpError(404, code, message, details);
}

export function methodNotAllowed(message = 'Method Not Allowed', details?: unknown, code = 'METHOD_NOT_ALLOWED'): HttpError {
  return new HttpError(405, code, message, details);
}

export function payloadTooLarge(message = 'Payload Too Large', details?: unknown, code = 'PAYLOAD_TOO_LARGE'): HttpError {
  return new HttpError(413, code, message, details);
}

export function unsupportedMediaType(message = 'Unsupported Media Type', details?: unknown, code = 'UNSUPPORTED_MEDIA_TYPE'): HttpError {
  return new HttpError(415, code, message, details);
}

export function badGateway(message = 'Bad Gateway', details?: unknown, code = 'BAD_GATEWAY'): HttpError {
  return new HttpError(502, code, message, details);
}

export function serviceUnavailable(message = 'Service Unavailable', details?: unknown, code = 'SERVICE_UNAVAILABLE'): HttpError {
  return new HttpError(503, code, message, details);
}

export function gatewayTimeout(message = 'Gateway Timeout', details?: unknown, code = 'GATEWAY_TIMEOUT'): HttpError {
  return new HttpError(504, code, message, details);
}

export function internalError(message = 'Internal Server Error', details?: unknown, code = 'INTERNAL_ERROR'): HttpError {
  return new HttpError(500, code, message, details);
}

/**
 * Interface representing minimal response capabilities needed by sendJson and sendError
 */
export interface HttpResponseLike {
  statusCode: number;
  setHeader(name: string, value: string | number): void;
  end(chunk?: unknown): void;
  writableEnded?: boolean;
  headersSent?: boolean;
}

/**
 * Send JSON response with appropriate headers
 */
export function sendJson(res: HttpResponseLike | ServerResponse, statusCode: number, data: unknown): void {
  if (res.writableEnded || ('destroyed' in res && (res as { destroyed?: boolean }).destroyed)) return;
  try {
    const json = JSON.stringify(data);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(json));
    res.end(json);
  } catch {
    // Ignore write errors if socket closed concurrently
  }
}

/**
 * Regular expressions for sanitizing sensitive data (credentials, file paths, etc.)
 */
const SENSITIVE_KEY_PATTERN = /key|secret|token|password|auth|credential/i;
const WINDOWS_PATH_PATTERN = /[a-zA-Z]:\\[^\s"'\n\r]+/g;
const UNIX_PATH_PATTERN = /\/(Users|home|var|app|etc|tmp|projects)\/[^\s"'\n\r]+/g;
const BEARER_TOKEN_PATTERN = /Bearer\s+[\w.-]+/gi;
const API_KEY_PATTERN = /\b(sk-[a-zA-Z0-9_-]{8,}|[a-zA-Z0-9_-]{24,})\b/g;

/**
 * Sanitize strings to prevent leaking system paths and credentials
 */
export function sanitizeString(str: string): string {
  return str
    .replace(WINDOWS_PATH_PATTERN, '[REDACTED_PATH]')
    .replace(UNIX_PATH_PATTERN, '[REDACTED_PATH]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]')
    .replace(API_KEY_PATTERN, (match) => {
      if (/^[a-f0-9]{32,}$/i.test(match) || match.startsWith('sk-') || match.startsWith('sol-')) {
        return '[REDACTED_SECRET]';
      }
      return match;
    });
}

/**
 * Deep sanitization of objects to prevent leaking stack traces or sensitive fields
 */
export function sanitizeDetails(val: unknown, depth = 0): unknown {
  if (depth > 5) return '[TRUNCATED]';
  if (typeof val === 'string') {
    return sanitizeString(val);
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeDetails(item, depth + 1));
  }
  if (val && typeof val === 'object') {
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === 'stack' || SENSITIVE_KEY_PATTERN.test(k)) {
        output[k] = '[REDACTED]';
      } else {
        output[k] = sanitizeDetails(v, depth + 1);
      }
    }
    return output;
  }
  return val;
}

/**
 * Standardized error sender that guarantees:
 * 1. Output format: `{ error: { code, message, details? } }`
 * 2. Proper HTTP status code
 * 3. Never leaks stack traces, file paths, or credentials
 * 4. Supports both `sendError(res, err)` and `sendError(res, statusCode, code, message, details?)`
 */
export function sendError(res: HttpResponseLike | ServerResponse, err: unknown): void;
export function sendError(
  res: HttpResponseLike | ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void;
export function sendError(
  res: HttpResponseLike | ServerResponse,
  arg1: unknown,
  arg2?: string,
  arg3?: string,
  arg4?: unknown
): void {
  if (res.writableEnded || ('destroyed' in res && (res as { destroyed?: boolean }).destroyed)) return;

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal Server Error';
  let details: unknown = undefined;

  if (typeof arg1 === 'number') {
    statusCode = arg1;
    code = arg2 || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
    message = arg3 || (statusCode >= 500 ? 'Internal Server Error' : 'Request Error');
    details = arg4;
  } else if (arg1 instanceof HttpError) {
    statusCode = arg1.statusCode;
    code = arg1.code;
    message = arg1.message;
    details = arg1.details;
  } else if (arg1 && typeof arg1 === 'object') {
    const errObj = arg1 as {
      statusCode?: number;
      code?: string;
      message?: string;
      details?: unknown;
    };
    if (typeof errObj.statusCode === 'number' && Number.isInteger(errObj.statusCode)) {
      statusCode = errObj.statusCode;
    }
    if (typeof errObj.code === 'string') {
      code = errObj.code;
    }
    if (typeof errObj.message === 'string') {
      message = statusCode >= 500 ? 'Internal Server Error' : errObj.message;
    }
    details = errObj.details;
  }

  const sanitizedMessage = sanitizeString(message);
  const sanitizedDetails = details !== undefined ? sanitizeDetails(details) : undefined;

  const errorBody: ApiErrorBody = {
    error: {
      code,
      message: sanitizedMessage,
      ...(sanitizedDetails !== undefined ? { details: sanitizedDetails } : {})
    }
  };

  sendJson(res, statusCode, errorBody);
}
