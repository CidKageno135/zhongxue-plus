/**
 * server/index.ts
 *
 * Standalone Production HTTP Server Entry Point for ZhongXue V2.
 * Owned by Subagent A02 (Production Server Lead).
 *
 * Runs via standard node:http.
 * - Reads PORT (default 3000) and HOST (default '127.0.0.1')
 * - Initializes dictionary engine before or during startup
 * - Registers graceful shutdown handlers (SIGINT, SIGTERM)
 * - Listens and prints ready banner
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppHandler } from './app.ts';
import { dictionaryEngine } from './dictionary.ts';
import { getServerKeyForModel } from './security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expose __dirname and __filename globally so bundled modules (e.g. dictionary engine)
// can resolve paths seamlessly when running as an ESM standalone server bundle.
if (typeof (globalThis as Record<string, unknown>).__dirname === 'undefined') {
  (globalThis as Record<string, unknown>).__dirname = __dirname;
}
if (typeof (globalThis as Record<string, unknown>).__filename === 'undefined') {
  (globalThis as Record<string, unknown>).__filename = __filename;
}

/**
 * Loads .env and .env.local files if present in workspace root or project folder.
 */
export function loadEnvFiles(): void {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, '.env.local'),
    path.resolve(cwd, 'projects/zhongxue-new/.env'),
    path.resolve(cwd, 'projects/zhongxue-new/.env.local'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../.env.local')
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
          if (match) {
            const key = match[1];
            let val = match[2] || '';
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val.trim();
            }
          }
        }
      } catch {
        // Silently continue if env file cannot be read
      }
    }
  }
}

export interface StartServerOptions {
  port?: number;
  host?: string;
  distPath?: string;
  dictPath?: string;
}

export interface RunningServer {
  server: http.Server;
  port: number;
  host: string;
  close: () => Promise<void>;
}

/**
 * Starts the production HTTP server.
 */
export async function startServer(options: StartServerOptions = {}): Promise<RunningServer> {
  if (!process.env.VITEST) {
    loadEnvFiles();
  }

  const port = options.port ?? parseInt(process.env.PORT || '3000', 10);
  const host = options.host ?? (process.env.HOST || '127.0.0.1');

  // 1. Initialize dictionary engine
  try {
    await dictionaryEngine.init(options.dictPath || process.env.DICT_PATH);
  } catch (err) {
    console.warn('[zhongxue-server] Dictionary initialization warning:', err);
  }

  // 2. Create app handler
  const appHandler = createAppHandler({
    distPath: options.distPath,
    dictPath: options.dictPath
  });

  const server = http.createServer(appHandler);

  let isClosing = false;
  const close = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (isClosing) return resolve();
      isClosing = true;
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // 3. Graceful shutdown handler
  const handleSignal = (sig: string) => {
    console.log(`\n[zhongxue-server] Received ${sig}, initiating graceful shutdown...`);
    close()
      .then(() => {
        console.log('[zhongxue-server] Server successfully stopped.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('[zhongxue-server] Error during shutdown:', err);
        process.exit(1);
      });

    // Forced exit safeguard after 5 seconds
    setTimeout(() => {
      console.error('[zhongxue-server] Forcefully shutting down after timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));

  // 4. Start listening
  await new Promise<void>((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const actualAddress = server.address();
  const actualPort =
    typeof actualAddress === 'object' && actualAddress ? actualAddress.port : port;

  const totalEntries = dictionaryEngine.getTotal();
  const loadTime = dictionaryEngine.getLoadTimeMs();
  const hasKey = Boolean(getServerKeyForModel());

  console.log('====================================================');
  console.log('  ZhongXue+ Production Server v2.0.0 is running!     ');
  console.log(`  Address:    http://${host}:${actualPort}           `);
  console.log(`  Dictionary: ${totalEntries} entries loaded (${loadTime}ms)`);
  console.log(`  AI Status:  ${hasKey ? 'Configured' : 'Local Guided Fallback'}`);
  console.log('====================================================');

  return {
    server,
    port: actualPort,
    host,
    close
  };
}

// Auto-run if executed directly and not inside Vitest runner
const isVitest = Boolean(process.env.VITEST);
if (!isVitest) {
  startServer().catch((err) => {
    console.error('[zhongxue-server] Fatal startup error:', err);
    process.exit(1);
  });
}
