/**
 * api/index.ts
 *
 * Vercel Serverless Function Adapter for ZhongXue+ V2 Backend API.
 * Dispatches all /api/* requests to the unified server handler in server/app.ts.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { handleApiRequest } from '../server/app.ts';
import { dictionaryEngine } from '../server/dictionary.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as Record<string, unknown>).__dirname === 'undefined') {
  (globalThis as Record<string, unknown>).__dirname = __dirname;
}
if (typeof (globalThis as Record<string, unknown>).__filename === 'undefined') {
  (globalThis as Record<string, unknown>).__filename = __filename;
}

// Explicit static path reference so @vercel/nft bundles data/dictionary/CVDICT.u8.gz
const BUNDLED_DICTIONARY_PATH = path.join(process.cwd(), 'data', 'dictionary', 'CVDICT.u8.gz');
if (!process.env.DICT_PATH && fs.existsSync(BUNDLED_DICTIONARY_PATH)) {
  process.env.DICT_PATH = BUNDLED_DICTIONARY_PATH;
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
    parsedUrl.pathname === '/api/index' ||
    parsedUrl.pathname === '/api/index.ts' ||
    parsedUrl.pathname === '/api/index.js'
  ) {
    const subPath = parsedUrl.searchParams.get('__zhongxue_path') || '';
    const cleanSubPath = subPath.replace(/^\/+/, '');
    parsedUrl.pathname = cleanSubPath ? `/api/${cleanSubPath}` : '/api';
  }

  parsedUrl.searchParams.delete('__zhongxue_path');

  await handleApiRequest(req, res, parsedUrl);
}
