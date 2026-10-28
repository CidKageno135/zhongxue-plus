/**
 * tests/acceptance/production-package.test.ts
 *
 * Independent Production Package Acceptance Test Suite for ZhongXue V2.
 * Owned by Subagent T14 (Independent Production Package Tester).
 *
 * Invariant G6 & Finding F07 Acceptance Criteria:
 * - F07: Sản phẩm production phải khởi động được khi cài npm ci --omit=dev mà không cần vite-node.
 * - Runtime start script ("npm start") must NOT depend on tools declared only in devDependencies.
 * - Production server entry must be pure JavaScript executable by standard Node.js.
 * - Production build artifact must generate both frontend assets and runnable backend server.
 * - Built server must boot and respond to /api/health with development binary paths removed.
 *   This smoke test does not substitute for a separate clean npm ci --omit=dev check.
 *
 * BASELINE STATUS: These tests MUST FAIL (RED) on baseline, proving and reproducing F07.
 * B06 (Runtime Builder) will modify package.json and server build in Batch 1 to turn them GREEN.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  readProjectPackageJson,
  auditProductionDependencies,
  spawnProductionProcess,
  PROJECT_ROOT
} from '../fixtures/production/package-verifier.ts';

describe('Production Package Acceptance Tests (T14 Invariant G6 / Finding F07)', () => {
  const pkg = readProjectPackageJson(PROJECT_ROOT);
  const audit = auditProductionDependencies(PROJECT_ROOT);

  // ==========================================================================
  // 1. Contract: Start Script & Runtime Dependencies (Finding F07)
  // ==========================================================================
  describe('1. Production Start Script Contract (Finding F07)', () => {
    it('1.1 should have a "start" script defined in package.json', () => {
      expect(pkg.scripts?.start).toBeDefined();
      expect(typeof pkg.scripts?.start).toBe('string');
      expect(pkg.scripts?.start?.length).toBeGreaterThan(0);
    });

    it('1.2 should NOT rely on "vite-node" in production start script without vite-node in dependencies', () => {
      // Invariant G6 / Finding F07:
      // When deployed with `npm ci --omit=dev`, devDependencies are NOT installed.
      // Therefore, `scripts.start` must NOT invoke `vite-node` unless `vite-node` is in production `dependencies`.
      // (Alternatively, `scripts.start` should run a compiled JS bundle using standard `node`).
      const usesViteNode = audit.usesViteNode;
      const viteNodeInDeps = audit.viteNodeInDependencies;

      if (usesViteNode) {
        expect(
          viteNodeInDeps,
          `F07 VIOLATION: package.json "start" script uses "vite-node" (${audit.startScript}), ` +
          `but "vite-node" is NOT declared in "dependencies". It will fail in npm ci --omit=dev!`
        ).toBe(true);
      } else {
        expect(usesViteNode).toBe(false);
      }
    });

    it('1.3 should NOT have any missing runtime dependencies required by start script', () => {
      // Invariant G6: No tool invoked by `npm start` can be missing from production `dependencies`
      expect(
        audit.missingRuntimeDependencies,
        `F07 VIOLATION: Start script requires dev-only tools: ${audit.missingRuntimeDependencies.join(', ')}`
      ).toEqual([]);
    });
  });

  // ==========================================================================
  // 2. Production Server Runnable via Standard Node.js
  // ==========================================================================
  describe('2. Standalone Production Entry Execution (Invariant G6)', () => {
    it('2.1 should provide a compiled production JavaScript server entry (dist/server or build artifact)', () => {
      // Invariant G6:
      // A production package must produce a standard JavaScript entry file that can be
      // executed by `node` directly, without requiring an on-the-fly TypeScript transpiler.
      const candidatePaths = [
        path.resolve(PROJECT_ROOT, 'dist/server/index.js'),
        path.resolve(PROJECT_ROOT, 'dist/server/index.mjs'),
        path.resolve(PROJECT_ROOT, 'dist/server.js'),
        path.resolve(PROJECT_ROOT, 'dist/index.js'),
        path.resolve(PROJECT_ROOT, 'server/index.js')
      ];

      const foundCompiledEntry = candidatePaths.some((p) => fs.existsSync(p));

      expect(
        foundCompiledEntry,
        'F07 VIOLATION: No compiled JavaScript server entry found (e.g. dist/server/index.js). ' +
        'server/index.ts is uncompiled TypeScript and cannot run with standard "node" in production.'
      ).toBe(true);
    });

    it('2.2 package.json build script should compile both client and server artifacts', () => {
      // Invariant G6:
      // `npm run build` must build the server artifact in addition to the Vite frontend bundle.
      const buildScript = pkg.scripts?.build || '';
      const buildsServer =
        buildScript.includes('server') ||
        Boolean(pkg.scripts?.['build:server']) ||
        Boolean(pkg.scripts?.['build:prod']);

      expect(
        buildsServer,
        'F07 VIOLATION: "build" script only builds client SPA. It must compile the server for production deployment.'
      ).toBe(true);
    });
  });

  // ==========================================================================
  // 3. PATH-sanitized production startup smoke check (Reproducing F07)
  // ==========================================================================
  describe('3. PATH-sanitized production startup smoke check (Reproducing F07)', () => {
    it('3.1 should start the built production entry with development binary paths removed', async () => {
      // Invariant G6:
      // Production server MUST successfully start on a dynamically allocated port
      // with development binary directories removed from PATH.
      // This does not hide installed node_modules and is not clean-install evidence.
      // On baseline, this will fail immediately with code != 0 because `vite-node` is missing or fails.
      let spawned;
      try {
        spawned = await spawnProductionProcess({
          omitDevSimulated: true,
          timeoutMs: 30000
        });

        expect(spawned).toBeDefined();
        expect(spawned.port).toBeGreaterThan(0);

        // Server should be reachable via health probe
        const res = await fetch(`${spawned.baseUrl}/api/health`);
        expect(res.status).toBe(200);
      } finally {
        if (spawned) {
          await spawned.stop();
        }
      }
    }, 35000);
  });
});
