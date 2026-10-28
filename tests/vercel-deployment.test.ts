import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedOrigin, getCorsHeaders } from '../server/security.ts';
import vercelHandler, { config as vercelConfig } from '../server/vercel.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

function invokeServerlessHandler(
  urlPath: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{ status: number; headers: Record<string, string>; json: () => unknown; text: () => string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      vercelHandler(req, res).catch(reject);
    });

    server.listen(0, '127.0.0.1', async () => {
      try {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        const response = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
          method: options.method || 'GET',
          headers: options.headers,
          body: options.body
        });
        const textBody = await response.text();
        const headersObj: Record<string, string> = {};
        response.headers.forEach((v, k) => {
          headersObj[k.toLowerCase()] = v;
        });
        resolve({
          status: response.status,
          headers: headersObj,
          text: () => textBody,
          json: () => JSON.parse(textBody)
        });
      } catch (err) {
        reject(err);
      } finally {
        server.closeAllConnections?.();
        server.close();
      }
    });
  });
}

describe('Vercel Deployment & Serverless Readiness', () => {
  describe('1. Origin & CORS Support for Vercel Domains', () => {
    it('automatically allows origins matching VERCEL_URL, VERCEL_BRANCH_URL, and VERCEL_PROJECT_PRODUCTION_URL', () => {
      const vercelEnv = {
        VERCEL: '1',
        VERCEL_URL: 'zhongxue-plus-9x8y7z.vercel.app',
        VERCEL_BRANCH_URL: 'zhongxue-plus-git-feat-zhongxue-greenfield-cidkageno135.vercel.app',
        VERCEL_PROJECT_PRODUCTION_URL: 'zhongxue-plus.vercel.app'
      };

      expect(isAllowedOrigin('https://zhongxue-plus-9x8y7z.vercel.app', vercelEnv)).toBe(true);
      expect(
        isAllowedOrigin(
          'https://zhongxue-plus-git-feat-zhongxue-greenfield-cidkageno135.vercel.app',
          vercelEnv
        )
      ).toBe(true);
      expect(isAllowedOrigin('https://zhongxue-plus.vercel.app', vercelEnv)).toBe(true);

      const cors = getCorsHeaders('https://zhongxue-plus.vercel.app', vercelEnv);
      expect(cors['Access-Control-Allow-Origin']).toBe('https://zhongxue-plus.vercel.app');
      expect(cors['Access-Control-Allow-Origin']).not.toBe('*');

      // Spoofed or attacker origins must still be strictly rejected
      expect(isAllowedOrigin('https://zhongxue-plus.vercel.app.evil.com', vercelEnv)).toBe(false);
      expect(isAllowedOrigin('https://evil-attacker.com', vercelEnv)).toBe(false);
      expect(isAllowedOrigin('http://zhongxue-plus.vercel.app', vercelEnv)).toBe(false);
    });
  });

  describe('2. vercel.json & Pure ESM Serverless Bundle Contract', () => {
    it('defines valid vercel.json with dist outputDirectory, dictionary includeFiles, and regex $1 rewrites', () => {
      const vercelJsonPath = path.resolve(PROJECT_ROOT, 'vercel.json');
      expect(fs.existsSync(vercelJsonPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
      expect(config.outputDirectory).toBe('dist');
      expect(JSON.stringify(config.functions)).toContain('data/dictionary/**');
      expect(Array.isArray(config.rewrites)).toBe(true);
      expect(config.rewrites[0].destination).toBe('/api/vercel?__zhongxue_path=$1');
    });

    it('bundles api/vercel.js as self-contained pure JavaScript with zero .ts import specifiers', () => {
      const compiledBundlePath = path.resolve(PROJECT_ROOT, 'api/vercel.js');
      expect(fs.existsSync(compiledBundlePath)).toBe(true);

      const code = fs.readFileSync(compiledBundlePath, 'utf-8');
      expect(code).not.toMatch(/from\s+['"][^'"]+\.ts['"]/);
      expect(code).toContain('vercelApiHandler');
    });

    it('exports bodyParser: false in server/vercel.ts config so raw request stream validation remains intact', () => {
      expect(vercelConfig?.api?.bodyParser).toBe(false);
    });
  });

  describe('3. Serverless Entrypoint Route Dispatching', () => {
    it('serves GET /api/health via direct and Vercel-rewritten paths', async () => {
      const directRes = await invokeServerlessHandler('/api/health');
      expect(directRes.status).toBe(200);
      const directData = directRes.json() as { status: string; dictionary: { loaded: boolean; totalEntries: number } };
      expect(directData.status).toBe('ok');
      expect(directData.dictionary.loaded).toBe(true);
      expect(directData.dictionary.totalEntries).toBeGreaterThan(100000);

      const rewrittenRes = await invokeServerlessHandler('/api/vercel?__zhongxue_path=health');
      expect(rewrittenRes.status).toBe(200);
      const rewrittenData = rewrittenRes.json() as { status: string };
      expect(rewrittenData.status).toBe('ok');
    });

    it('serves GET /api/dictionary search via Vercel-rewritten path preserving query parameters', async () => {
      const res = await invokeServerlessHandler(
        '/api/vercel?__zhongxue_path=dictionary&q=%E5%AD%B8%E7%94%9F&mode=all&limit=5'
      );
      expect(res.status).toBe(200);
      const data = res.json() as { results: Array<{ traditional: string }>; totalMatches: number };
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.totalMatches).toBeGreaterThan(0);
    });

    it('serves POST /api/conversation via Vercel-rewritten path and enforces CORS policy', async () => {
      const prevVercelUrl = process.env.VERCEL_URL;
      process.env.VERCEL_URL = 'zhongxue-plus.vercel.app';
      try {
        const okRes = await invokeServerlessHandler('/api/vercel?__zhongxue_path=conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://zhongxue-plus.vercel.app'
          },
          body: JSON.stringify({
            action: 'chat',
            roleId: 'tea',
            messages: [{ role: 'user', content: '你好，我要一杯珍珠奶茶' }]
          })
        });
        expect(okRes.status).toBe(200);
        const okData = okRes.json() as { content: string; mode: string };
        expect(typeof okData.content).toBe('string');
        expect(okData.content.length).toBeGreaterThan(0);

        const forbiddenRes = await invokeServerlessHandler('/api/vercel?__zhongxue_path=conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://evil-attacker.com'
          },
          body: JSON.stringify({
            action: 'chat',
            messages: [{ role: 'user', content: 'attack' }]
          })
        });
        expect(forbiddenRes.status).toBe(403);
      } finally {
        if (prevVercelUrl === undefined) {
          delete process.env.VERCEL_URL;
        } else {
          process.env.VERCEL_URL = prevVercelUrl;
        }
      }
    });

    it('returns JSON 404 for unknown /api/* routes via rewritten path', async () => {
      const res = await invokeServerlessHandler('/api/vercel?__zhongxue_path=does-not-exist');
      expect(res.status).toBe(404);
      const data = res.json() as { error?: { code?: string } };
      expect(data.error?.code).toBe('NOT_FOUND');
    });
  });
});
