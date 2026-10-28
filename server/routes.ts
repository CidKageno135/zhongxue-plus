/**
 * server/routes.ts
 *
 * Production API Route Handlers for ZhongXue V2.
 * Owned by Subagent A02 (Production Server Lead).
 *
 * Implements route handlers for:
 * 1. GET /api/health: Real status from dictionary engine and security config.
 * 2. GET /api/dictionary: Validates query and performs search or ID lookup.
 * 3. GET/POST /api/conversation: Delegates to handleConversationRoute from server/ai.ts.
 * 4. POST /api/handwriting: Validates payload, proxies to Google IME with timeout, falls back safely.
 * 5. Unknown /api/*: Returns JSON 404 with standard error envelope.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { dictionaryEngine } from './dictionary.ts';
import {
  getServerKeyForModel,
  getDefaultBaseUrl
} from './security.ts';
import {
  validateDictionaryQuery,
  validateHandwritingBody,
  readAndValidateJsonBody,
  MAX_BODY_SIZE_HANDWRITING
} from './validation.ts';
import {
  sendJson,
  sendError,
  notFound,
  methodNotAllowed,
  serviceUnavailable
} from './errors.ts';
import { handleConversationRoute } from './ai.ts';
import type {
  HealthResponse,
  DictionarySearchResponse,
  HandwritingResponse
} from '../src/types.ts';

/**
 * Handler for GET /api/health
 * Returns server readiness, dictionary entry count, and AI configuration status.
 */
export async function handleHealthRoute(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/health`));
    return;
  }

  const isLoaded = dictionaryEngine.isReady();
  const totalEntries = dictionaryEngine.getTotal();
  const loadTimeMs = dictionaryEngine.getLoadTimeMs();

  const serverKey = getServerKeyForModel();
  const configured = Boolean(serverKey);
  const baseUrl = getDefaultBaseUrl();

  let provider = 'none';
  if (configured) {
    if (baseUrl.includes('openrouter')) {
      provider = 'openrouter';
    } else if (baseUrl.includes('agentrouter')) {
      provider = 'agentrouter';
    } else {
      provider = 'custom';
    }
  }

  const model = process.env.AI_MODEL || (baseUrl.includes('agentrouter') ? 'gpt-6.1-sol' : 'google/gemini-2.0-flash-001');

  const healthData: HealthResponse = {
    status: isLoaded ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dictionary: {
      loaded: isLoaded,
      totalEntries,
      loadTimeMs
    },
    ai: {
      configured,
      provider,
      model
    },
    version: '2.0.0'
  };

  const statusCode = isLoaded ? 200 : 503;

  if (method === 'HEAD') {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }

  sendJson(res, statusCode, healthData);
}

/**
 * Handler for GET /api/dictionary
 * Supports exact ID lookup (?id=...) and multi-tier search (?q=...&mode=...&offset=...&limit=...).
 */
export async function handleDictionaryRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/dictionary`));
    return;
  }

  // Ensure dictionary engine is initialized
  if (!dictionaryEngine.isReady()) {
    try {
      await dictionaryEngine.init();
    } catch {
      // Ignored: isReady() check below handles readiness reporting
    }
  }

  if (!dictionaryEngine.isReady()) {
    sendError(res, serviceUnavailable('Dictionary engine is not ready or failed to load'));
    return;
  }

  let validated;
  try {
    validated = validateDictionaryQuery(url.searchParams);
  } catch (err) {
    sendError(res, err);
    return;
  }

  // Case 1: ID lookup
  if (validated.id) {
    const entry = dictionaryEngine.getById(validated.id);
    if (!entry) {
      sendError(res, notFound(`Dictionary entry not found for id: ${validated.id}`, { id: validated.id }));
      return;
    }

    if (method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end();
      return;
    }

    sendJson(res, 200, entry);
    return;
  }

  // Case 2: Multi-tier search
  const queryStr = validated.q ?? '';
  const searchResult = dictionaryEngine.search(
    queryStr,
    validated.mode,
    validated.offset,
    validated.limit
  );

  const dictionaryTotal = dictionaryEngine.getTotal();
  const totalMatches = searchResult.total;
  const pageCount = searchResult.results.length;

  const response: DictionarySearchResponse & {
    dictionaryTotal: number;
    totalMatches: number;
    pageCount: number;
  } = {
    results: searchResult.results,
    total: totalMatches,
    count: pageCount,
    dictionaryTotal,
    totalMatches,
    pageCount,
    offset: validated.offset,
    limit: validated.limit,
    query: queryStr,
    mode: validated.mode,
    source: 'database'
  };

  if (method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end();
    return;
  }

  sendJson(res, 200, response);
}

/**
 * Handler for POST /api/handwriting
 * Proxies strokes to Google Input Tools with 4-second timeout, falling back safely.
 */
export async function handleHandwritingRoute(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const method = (req.method || 'POST').toUpperCase();
  if (method !== 'POST') {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/handwriting`));
    return;
  }

  let validBody;
  try {
    const rawBody = await readAndValidateJsonBody(req, MAX_BODY_SIZE_HANDWRITING);
    validBody = validateHandwritingBody(rawBody);
  } catch (err) {
    sendError(res, err);
    return;
  }

  const googlePayload = {
    requests: [
      {
        writing_guide: {
          writing_area_width: validBody.width,
          writing_area_height: validBody.height
        },
        ink: validBody.strokes
      }
    ]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  const onClose = () => controller.abort();
  req.on('close', onClose);

  try {
    const gRes = await fetch(
      'https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=translate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googlePayload),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    req.off('close', onClose);

    if (gRes.ok) {
      const gData = await gRes.json();
      if (Array.isArray(gData) && gData[0] === 'SUCCESS' && gData[1]?.[0]?.[1]) {
        const candidates: string[] = gData[1][0][1];
        const successResp: HandwritingResponse = {
          candidates,
          source: 'google'
        };
        sendJson(res, 200, successResp);
        return;
      }
    }
  } catch {
    clearTimeout(timeoutId);
    req.off('close', onClose);
  }

  // Graceful fallback response: allows client-side geometric stroke classifier to take over
  const fallbackResp: HandwritingResponse = {
    candidates: [],
    source: 'local_fallback'
  };
  sendJson(res, 200, fallbackResp);
}

/**
 * Master dispatcher for all /api/* requests.
 * Routes matching known endpoints are dispatched to their respective handlers.
 * Any unknown /api/* route returns JSON 404 (NEVER returns HTML).
 */
export async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url?: URL
): Promise<void> {
  const host = req.headers.host || '127.0.0.1';
  const parsedUrl = url || new URL(req.url || '/', `http://${host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/health') {
    await handleHealthRoute(req, res);
    return;
  }

  if (pathname === '/api/dictionary') {
    await handleDictionaryRoute(req, res, parsedUrl);
    return;
  }

  if (pathname === '/api/conversation') {
    await handleConversationRoute(req, res);
    return;
  }

  if (pathname === '/api/handwriting') {
    await handleHandwritingRoute(req, res);
    return;
  }

  // All other /api/* routes must return JSON 404
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    sendError(res, notFound('API endpoint not found', { path: pathname }));
    return;
  }
}
