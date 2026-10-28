/**
 * server/static.ts
 *
 * Production Static File Server & SPA Fallback for ZhongXue V2.
 * Owned by Subagent A02 (Production Server Lead).
 *
 * Enforces:
 * 1. Safe static asset delivery from dist/ directory.
 * 2. Strict directory traversal protection (blocks '../', '%2e%2e', null bytes).
 * 3. Sensitive file protection (blocks .env*, .git*, node_modules*, package.json, etc.).
 * 4. Content-Type header resolution with proper charset.
 * 5. Caching policy:
 *    - Immutable long-term caching for hashed assets in dist/assets/
 *    - Strict no-cache for index.html (and SPA fallback)
 *    - Short revalidation caching for other assets
 * 6. SPA fallback: If path is not found in dist/ and does NOT start with /api/, serve dist/index.html.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  badRequest,
  forbidden,
  notFound,
  methodNotAllowed,
  sendError
} from './errors.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Comprehensive MIME type map */
export const STATIC_MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.manifest': 'application/manifest+json',
  '.gz': 'application/gzip'
};

/** Patterns for forbidden sensitive paths */
export const SENSITIVE_PATH_PATTERNS = [
  /(^|[/\\])\.env/i,
  /(^|[/\\])\.git/i,
  /(^|[/\\])node_modules/i,
  /(^|[/\\])package\.json/i,
  /(^|[/\\])package-lock\.json/i,
  /(^|[/\\])tsconfig.*\.json/i,
  /(^|[/\\])\.DS_Store/i,
  /(^|[/\\])server([/\\]|$)/i
];

/**
 * Resolves the canonical dist/ directory path.
 */
export function resolveDistDirectory(customDistPath?: string): string {
  if (customDistPath) return path.resolve(customDistPath);
  if (process.env.DIST_PATH) return path.resolve(process.env.DIST_PATH);

  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, 'dist'),
    path.resolve(cwd, 'projects/zhongxue-new/dist'),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../dist'),
    path.resolve(__dirname, '../../dist')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(cwd, 'dist');
}

/**
 * Serves static files and handles SPA fallback for non-API requests.
 */
export async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  distDir: string,
  url: URL
): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  // 1. Only GET and HEAD methods allowed for static assets
  if (method !== 'GET' && method !== 'HEAD') {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed for static files`));
    return;
  }

  // 2. Reject null bytes in raw URL before decoding
  const rawUrl = req.url || '';
  if (rawUrl.includes('\0') || rawUrl.includes('%00')) {
    sendError(res, forbidden('Access denied: null byte prohibited in request URL'));
    return;
  }

  // 3. Decode URI components safely
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    sendError(res, badRequest('Malformed URI sequence in request path'));
    return;
  }

  // 4. Directory traversal check against raw and decoded sequences
  if (
    decodedPath.includes('/../') ||
    decodedPath.includes('\\..\\') ||
    decodedPath.endsWith('/..') ||
    decodedPath.endsWith('\\..') ||
    rawUrl.includes('%2e%2e') ||
    rawUrl.includes('%2E%2E')
  ) {
    sendError(res, forbidden('Directory traversal attempt forbidden'));
    return;
  }

  // 5. Sensitive file check on requested path
  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pattern.test(decodedPath)) {
      sendError(res, forbidden('Access to sensitive file or directory is forbidden'));
      return;
    }
  }

  // 6. Safe path resolution and containment check
  const normalizedRelative = path.normalize(decodedPath).replace(/^[\\/]+/, '');
  const absoluteFilePath = path.resolve(distDir, normalizedRelative);

  const relativeToDist = path.relative(distDir, absoluteFilePath);
  if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
    sendError(res, forbidden('Access denied: requested path resolves outside dist directory'));
    return;
  }

  // Double check sensitive patterns on resolved path
  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pattern.test(absoluteFilePath)) {
      sendError(res, forbidden('Access to sensitive file or directory is forbidden'));
      return;
    }
  }

  // 7. Verify dist directory exists
  if (!fs.existsSync(distDir)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Production build not found. Please run "npm run build" first.');
    return;
  }

  // 8. Stat target file or directory
  let targetFile = absoluteFilePath;
  let stat: fs.Stats | null = null;

  try {
    stat = fs.statSync(targetFile);
    if (stat.isDirectory()) {
      const dirIndex = path.join(targetFile, 'index.html');
      if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
        targetFile = dirIndex;
        stat = fs.statSync(dirIndex);
      } else {
        stat = null;
      }
    }
  } catch {
    stat = null;
  }

  // 9. SPA Fallback:
  // If static file does not exist, and path is NOT under /api/, serve dist/index.html
  if (!stat || !stat.isFile()) {
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      sendError(res, notFound('API endpoint not found', { path: url.pathname }));
      return;
    }

    const spaIndex = path.join(distDir, 'index.html');
    if (fs.existsSync(spaIndex)) {
      targetFile = spaIndex;
      stat = fs.statSync(spaIndex);
    } else {
      sendError(res, notFound('Asset not found and index.html is missing in dist directory'));
      return;
    }
  }

  // 10. Headers & Caching Strategy
  const ext = path.extname(targetFile).toLowerCase();
  const contentType = STATIC_MIME_TYPES[ext] || 'application/octet-stream';

  const isHtml = ext === '.html' || targetFile.endsWith('index.html');
  const isHashedAsset =
    targetFile.includes(path.join('dist', 'assets')) ||
    targetFile.includes('/assets/') ||
    targetFile.includes('\\assets\\');

  let cacheControl = 'public, max-age=3600';
  if (isHtml) {
    // Single page app root must never be cached aggressively to allow instant updates
    cacheControl = 'no-cache, no-store, must-revalidate';
  } else if (isHashedAsset) {
    // Vite hashed production bundles can be cached immutably for 1 year
    cacheControl = 'public, max-age=31536000, immutable';
  }

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(stat.size),
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  };

  if (isHtml) {
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  }

  // 11. HEAD request ends immediately after sending headers
  if (method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return;
  }

  // 12. GET request streams file content to client
  res.writeHead(200, headers);
  const stream = fs.createReadStream(targetFile);

  stream.on('error', (err) => {
    if (!res.headersSent) {
      sendError(res, err);
    } else {
      res.destroy();
    }
  });

  stream.pipe(res);
}

/**
 * Creates a static handler middleware bound to the specified dist directory.
 */
export function createStaticHandler(customDistPath?: string) {
  const distDir = resolveDistDirectory(customDistPath);

  return async function staticHandler(
    req: IncomingMessage,
    res: ServerResponse,
    url?: URL
  ): Promise<void> {
    const host = req.headers.host || '127.0.0.1';
    const parsedUrl = url || new URL(req.url || '/', `http://${host}`);
    await serveStatic(req, res, distDir, parsedUrl);
  };
}
