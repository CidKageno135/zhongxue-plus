import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { handleApiRequest } from '../server/app.ts';
import { dictionaryEngine } from '../server/dictionary.ts';
import type { DbDictionaryResult } from './types.ts';

export type { DbDictionaryResult };

function resolveDictionaryPath(): string | undefined {
  const cwd = process.cwd();
  const candidates = [
    process.env.DICT_PATH,
    path.resolve(cwd, 'data/dictionary/CVDICT.u8.gz'),
    path.resolve(cwd, 'projects/zhongxue-new/data/dictionary/CVDICT.u8.gz')
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return undefined;
}

/**
 * Vite Dev & Preview Plugin Adapter for ZhongXue V2.
 *
 * Implements Zero-Divergence Architecture by delegating all /api/* requests
 * directly to the unified production request router (server/app.ts).
 *
 * Removes duplicate mock logic and eliminates all legacy credential leak vulnerabilities.
 */
export function zhongxueApiPlugin(): Plugin {
  return {
    name: 'zhongxue-api-adapter',
    configureServer(server) {
      // Initialize dictionary engine when Vite dev server starts
      const dictPath = resolveDictionaryPath();
      dictionaryEngine.init(dictPath).catch(err => {
        console.error('[zhongxue-dev] Failed to initialize dictionary engine:', err);
      });

      // Mount unified API dispatcher before Vite SPA fallback
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleApiRequest(req, res);
          if (!handled) {
            next();
          }
        } catch (err) {
          next(err);
        }
      });
    },
    configurePreviewServer(server) {
      // Ensure preview mode (vite preview) also serves real API endpoints with Zero-Divergence
      const dictPath = resolveDictionaryPath();
      dictionaryEngine.init(dictPath).catch(err => {
        console.error('[zhongxue-preview] Failed to initialize dictionary engine:', err);
      });

      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleApiRequest(req, res);
          if (!handled) {
            next();
          }
        } catch (err) {
          next(err);
        }
      });
    }
  };
}

export default zhongxueApiPlugin;
