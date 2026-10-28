/**
 * server/vercel.ts
 *
 * Source entrypoint for the pre-bundled Vercel Serverless Function (compiled to api/vercel.js).
 * Bundled via Vite SSR so that runtime execution on Vercel uses pure ESM JavaScript
 * with zero .ts extension imports and automatic dictionary initialization.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { handleApiRequest } from './app.ts';
import { dictionaryEngine } from './dictionary.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as Record<string, unknown>).__dirname === 'undefined') {
  (globalThis as Record<string, unknown>).__dirname = __dirname;
}
if (typeof (globalThis as Record<string, unknown>).__filename === 'undefined') {
  (globalThis as Record<string, unknown>).__filename = __filename;
}

// Explicit static path references so @vercel/nft traces and bundles data/dictionary/CVDICT.u8.gz
const DICT_CANDIDATES = [
  path.join(process.cwd(), 'data', 'dictionary', 'CVDICT.u8.gz'),
  path.resolve(__dirname, '../data/dictionary/CVDICT.u8.gz'),
  fileURLToPath(new URL('../data/dictionary/CVDICT.u8.gz', import.meta.url))
];

if (!process.env.DICT_PATH) {
  for (const candidate of DICT_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      process.env.DICT_PATH = candidate;
      break;
    }
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function vercelApiHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!dictionaryEngine.isReady()) {
    try {
      await dictionaryEngine.init(process.env.DICT_PATH);
    } catch {
      // Handled gracefully by downstream routes
    }
  }

  const host = req.headers.host || '127.0.0.1';
  const parsedUrl = new URL(req.url || '/api', `http://${host}`);

  if (
    parsedUrl.pathname === '/api/vercel' ||
    parsedUrl.pathname === '/api/vercel.js' ||
    parsedUrl.pathname === '/api/index' ||
    parsedUrl.pathname === '/api/index.ts' ||
    parsedUrl.pathname === '/api/index.js'
  ) {
    const subPath = parsedUrl.searchParams.get('__zhongxue_path') || '';
    const cleanSubPath = subPath.replace(/^\/+/, '');
    if (cleanSubPath && cleanSubPath !== '$1' && cleanSubPath !== ':path*') {
      parsedUrl.pathname = `/api/${cleanSubPath}`;
    } else {
      parsedUrl.pathname = '/api';
    }
  } else if (!parsedUrl.pathname.startsWith('/api')) {
    const cleanPath = parsedUrl.pathname.replace(/^\/+/, '');
    parsedUrl.pathname = cleanPath ? `/api/${cleanPath}` : '/api';
  }

  parsedUrl.searchParams.delete('__zhongxue_path');

  await handleApiRequest(req, res, parsedUrl);
}
