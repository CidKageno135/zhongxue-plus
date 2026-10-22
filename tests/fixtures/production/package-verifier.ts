/**
 * tests/fixtures/production/package-verifier.ts
 *
 * Production Package Verification Fixture for ZhongXue V2.
 * Owned by Subagent T14 (Independent Production Package Tester).
 *
 * Invariant G6 & Finding F07 verification helpers:
 * 1. Checks package.json dependencies vs scripts.start requirements.
 * 2. Detects forbidden runtime dependencies on devDependencies (e.g. vite-node, vitest).
 * 3. Probes standalone Node.js production server execution without dev transpilers.
 * 4. Spawns server in isolated clean-room environment (simulating npm ci --omit=dev).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '../../..');

export interface PackageJsonShape {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: string;
}

/**
 * Reads and parses the project package.json.
 */
export function readProjectPackageJson(projectRoot = PROJECT_ROOT): PackageJsonShape {
  const pkgPath = path.resolve(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json not found at: ${pkgPath}`);
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

export interface DependencyAuditResult {
  hasStartScript: boolean;
  startScript: string;
  usesViteNode: boolean;
  viteNodeInDependencies: boolean;
  viteNodeInDevDependencies: boolean;
  missingRuntimeDependencies: string[];
}

/**
 * Audits whether the start script requires dev-only packages.
 */
export function auditProductionDependencies(projectRoot = PROJECT_ROOT): DependencyAuditResult {
  const pkg = readProjectPackageJson(projectRoot);
  const startScript = pkg.scripts?.start || '';
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});

  const usesViteNode = /\bvite-node\b/.test(startScript);
  const viteNodeInDependencies = deps.includes('vite-node');
  const viteNodeInDevDependencies = devDeps.includes('vite-node');

  const knownDevTools = ['vite-node', 'vitest', 'ts-node', 'tsx', 'typescript', 'eslint'];
  const missingRuntimeDependencies: string[] = [];

  for (const tool of knownDevTools) {
    if (new RegExp(`\\b${tool}\\b`).test(startScript) && !deps.includes(tool)) {
      missingRuntimeDependencies.push(tool);
    }
  }

  return {
    hasStartScript: Boolean(pkg.scripts?.start),
    startScript,
    usesViteNode,
    viteNodeInDependencies,
    viteNodeInDevDependencies,
    missingRuntimeDependencies
  };
}

export interface SpawnProductionOptions {
  port?: number;
  env?: Record<string, string | undefined>;
  projectRoot?: string;
  omitDevSimulated?: boolean;
  timeoutMs?: number;
}

export interface SpawnedProcessResult {
  child: ChildProcess;
  port: number;
  baseUrl: string;
  stdout: string[];
  stderr: string[];
  stop: () => Promise<void>;
  waitReady: () => Promise<void>;
}

/**
 * Attempts to spawn the production server process using the configured start script.
 * If omitDevSimulated is true, strips devDependencies binary paths from PATH to simulate
 * an environment where only production dependencies were installed (npm ci --omit=dev).
 */
export function spawnProductionProcess(options: SpawnProductionOptions = {}): Promise<SpawnedProcessResult> {
  const projectRoot = options.projectRoot || PROJECT_ROOT;
  const port = options.port ?? 3999;
  const timeoutMs = options.timeoutMs ?? 5000;

  return new Promise((resolve, reject) => {
    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];
    let isExited = false;
    let isReady = false;

    // Build environment
    const processEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...options.env,
      NODE_ENV: 'production',
      PORT: String(port),
      HOST: '127.0.0.1'
    };

    if (options.omitDevSimulated) {
      // Remove node_modules/.bin from PATH to simulate omitted devDependencies
      const currentPath = processEnv.PATH || processEnv.Path || '';
      const sanitizedPath = currentPath
        .split(path.delimiter)
        .filter((entry) => !entry.includes(path.join('node_modules', '.bin')))
        .join(path.delimiter);

      processEnv.PATH = sanitizedPath;
      processEnv.Path = sanitizedPath;
      // Also disallow vitest/vite-node auto-resolution
      delete processEnv.VITEST;
    }

    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';

    const child = spawn(npmCmd, ['start'], {
      cwd: projectRoot,
      env: processEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows
    });

    const stop = (): Promise<void> => {
      return new Promise((resStop) => {
        if (isExited) {
          resStop();
          return;
        }
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!isExited) {
            child.kill('SIGKILL');
          }
          resStop();
        }, 1500).unref();
      });
    };

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdoutLines.push(text);
      if (text.includes('is running!') || text.includes('listening') || text.includes('http://')) {
        isReady = true;
      }
    });

    child.stderr?.on('data', (chunk) => {
      stderrLines.push(chunk.toString());
    });

    child.on('error', (err) => {
      isExited = true;
      reject(err);
    });

    child.on('exit', (code, signal) => {
      isExited = true;
      if (!isReady) {
        const errorMsg = [
          `Production server exited prematurely with code ${code} (signal ${signal}).`,
          `STDERR: ${stderrLines.join('').trim() || '(none)'}`,
          `STDOUT: ${stdoutLines.join('').trim() || '(none)'}`
        ].join('\n');
        reject(new Error(errorMsg));
      }
    });

    const timer = setTimeout(() => {
      if (!isReady && !isExited) {
        stop().finally(() => {
          reject(new Error(
            `Timeout waiting for production server to start (${timeoutMs}ms).\n` +
            `STDERR: ${stderrLines.join('').trim()}\n` +
            `STDOUT: ${stdoutLines.join('').trim()}`
          ));
        });
      } else if (isReady) {
        resolve({
          child,
          port,
          baseUrl: `http://127.0.0.1:${port}`,
          stdout: stdoutLines,
          stderr: stderrLines,
          stop,
          waitReady: async () => {}
        });
      }
    }, timeoutMs);

    // Check periodically for ready flag
    const checkInterval = setInterval(() => {
      if (isReady) {
        clearInterval(checkInterval);
        clearTimeout(timer);
        resolve({
          child,
          port,
          baseUrl: `http://127.0.0.1:${port}`,
          stdout: stdoutLines,
          stderr: stderrLines,
          stop,
          waitReady: async () => {}
        });
      }
    }, 100);
  });
}
