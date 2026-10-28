/**
 * server/app.ts
 *
 * Unified Request Handler & Dispatcher for ZhongXue V2.
 * Owned by Subagent A02 (Production Server Lead).
 *
 * Implements:
 * 1. Global CORS and origin security validation via server/security.ts.
 * 2. OPTIONS preflight handling with 204 No Content.
 * 3. Route dispatching:
 *    - /api/* dispatched to server/routes.ts
 *    - Non-API requests dispatched to server/static.ts (with SPA fallback)
 * 4. Can be reused by both standalone Node.js production server (server/index.ts)
 *    and Vite dev plugin adapter (src/viteApiPlugin.ts).
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { isAllowedOrigin, getCorsHeaders } from './security.ts';
import { handleApiRoute } from './routes.ts';
import { createStaticHandler } from './static.ts';
import { sendError, forbidden } from './errors.ts';

export interface AppHandlerOptions {
  distPath?: string;
  dictPath?: string;
}

export type AppRequestHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;

/**
 * Creates the unified request handler / dispatcher.
 * Used by standalone Node production server.
 */
export function createAppHandler(options: AppHandlerOptions = {}): AppRequestHandler {
  const staticHandler = createStaticHandler(options.distPath);

  return async function appHandler(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      // 1. Origin & CORS verification
      const origin = req.headers.origin;
      if (origin) {
        if (!isAllowedOrigin(origin)) {
          sendError(
            res,
            forbidden('Origin not allowed by CORS policy', { origin }, 'FORBIDDEN_ORIGIN')
          );
          return;
        }

        const corsHeaders = getCorsHeaders(origin);
        for (const [key, value] of Object.entries(corsHeaders)) {
          res.setHeader(key, value);
        }
      }

      // 2. Handle HTTP OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // 3. Parse request URL
      const host = req.headers.host || '127.0.0.1';
      const parsedUrl = new URL(req.url || '/', `http://${host}`);
      const pathname = parsedUrl.pathname;

      // 4. API Request Dispatching
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        await handleApiRoute(req, res, parsedUrl);
        return;
      }

      // 5. Static File & SPA Fallback Dispatching
      await staticHandler(req, res, parsedUrl);
    } catch (err) {
      if (!res.writableEnded) {
        sendError(res, err);
      }
    }
  };
}

/**
 * Handles API routes only.
 * Specifically exported for Vite dev plugin adapter (src/viteApiPlugin.ts)
 * where Vite handles frontend assets and only /api/* needs backend routing.
 *
 * Returns true if the request was an API request and handled; false otherwise.
 */
export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url?: URL
): Promise<boolean> {
  const host = req.headers.host || '127.0.0.1';
  const parsedUrl = url || new URL(req.url || '/', `http://${host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    try {
      // Validate CORS
      const origin = req.headers.origin;
      if (origin) {
        if (!isAllowedOrigin(origin)) {
          sendError(
            res,
            forbidden('Origin not allowed by CORS policy', { origin }, 'FORBIDDEN_ORIGIN')
          );
          return true;
        }

        const corsHeaders = getCorsHeaders(origin);
        for (const [key, value] of Object.entries(corsHeaders)) {
          res.setHeader(key, value);
        }
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return true;
      }

      await handleApiRoute(req, res, parsedUrl);
    } catch (err) {
      if (!res.writableEnded) {
        sendError(res, err);
      }
    }
    return true;
  }

  return false;
}
