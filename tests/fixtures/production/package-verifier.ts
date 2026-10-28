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
 * 4. Probes HTTP health with development binary paths removed (a startup smoke check).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';

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
 * Runs the plain Node entry directly so cleanup owns the real server process.
 * PATH sanitization is a smoke check, not a clean omit-dev installation.
 */
export async function spawnProductionProcess(options: SpawnProductionOptions = {}): Promise<SpawnedProcessResult> {
  const projectRoot = options.projectRoot || PROJECT_ROOT;
  const timeoutMs = options.timeoutMs ?? 30000;
  const startScript = readProjectPackageJson(projectRoot).scripts?.start || '';
  const entry = /^node\s+([\w./-]+\.m?js)$/.exec(startScript)?.[1];
  if (!entry) throw new Error('Production harness requires a plain node <entry.js> start script.');
  const port = options.port ?? await new Promise<number>((resolve, reject) => {
    const reservation = net.createServer();
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', () => {
      const address = reservation.address();
      if (!address || typeof address === 'string') return reservation.close(() => reject(new Error('No TCP port allocated')));
      reservation.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
  const processEnv: NodeJS.ProcessEnv = {
    ...process.env, ...options.env, NODE_ENV: 'production', PORT: String(port), HOST: '127.0.0.1'
  };
  if (options.omitDevSimulated) {
    for (const key of Object.keys(processEnv).filter((key) => key.toLowerCase() === 'path')) {
      processEnv[key] = (processEnv[key] || '').split(path.delimiter)
        .filter((part) => !/[\\/]node_modules[\\/]\.bin(?:[\\/]|$)/i.test(part)).join(path.delimiter);
    }
    delete processEnv.VITEST;
  }
  const stdout: string[] = [];
  const stderr: string[] = [];
  const child = spawn(process.execPath, [entry], {
    cwd: projectRoot, env: processEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  child.stdout?.on('data', (chunk) => stdout.push(String(chunk)));
  child.stderr?.on('data', (chunk) => stderr.push(String(chunk)));
  let spawnError: Error | undefined;
  child.once('error', (error) => { spawnError = error; });
  let stopping: Promise<void> | undefined;
  const stop = (): Promise<void> => stopping ??= new Promise<void>((resolve, reject) => {
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) return resolve();
    child.once('close', () => resolve());
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.once('error', reject);
      killer.once('close', (code) => {
        if (code !== 0 && child.exitCode === null && child.signalCode === null) reject(new Error('Could not terminate owned production process tree'));
      });
    } else {
      child.kill('SIGTERM');
      const escalation = setTimeout(() => child.kill('SIGKILL'), 1500);
      child.once('close', () => clearTimeout(escalation));
    }
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const diagnostics = () => `STDERR: ${stderr.join('')}\nSTDOUT: ${stdout.join('')}`;
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Production server exited prematurely with code ${child.exitCode}.\n${diagnostics()}`);
      }
      try {
        const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(Math.min(500, Math.max(1, deadline - Date.now()))) });
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          await response.json();
          return { child, port, baseUrl, stdout, stderr, stop, waitReady: async () => {} };
        }
        await response.body?.cancel();
      } catch { /* Not listening yet, or health is not ready. */ }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timeout waiting for production health (${timeoutMs}ms).\n${diagnostics()}`);
  } catch (error) {
    await stop();
    throw error;
  }
}
