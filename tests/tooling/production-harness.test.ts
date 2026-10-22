import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnProductionProcess } from '../fixtures/production/package-verifier.ts';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function project(source: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhongxue-harness-'));
  directories.push(directory);
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ type: 'module', scripts: { start: 'node server.js' } }));
  fs.writeFileSync(path.join(directory, 'server.js'), source);
  return directory;
}

describe('production startup harness', () => {
  it('waits for HTTP health rather than a premature ready banner and owns its process', async () => {
    const projectRoot = project(`import http from 'node:http';
console.log('http://ready-but-not-listening');
setTimeout(() => http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
}).listen(Number(process.env.PORT), '127.0.0.1'), 400);`);
    const started = Date.now();
    const server = await spawnProductionProcess({ projectRoot, timeoutMs: 5000 });
    try {
      expect(Date.now() - started).toBeGreaterThanOrEqual(350);
      expect(server.port).toBeGreaterThan(0);
      expect((await fetch(`${server.baseUrl}/api/health`)).status).toBe(200);
    } finally {
      await server.stop();
    }
    expect(server.child.exitCode !== null || server.child.signalCode !== null).toBe(true);
    await expect(fetch(`${server.baseUrl}/api/health`)).rejects.toThrow();
  });

  it('rejects an early exit promptly with diagnostics', async () => {
    const projectRoot = project("console.error('fixture startup failure'); process.exit(7);");
    await expect(spawnProductionProcess({ projectRoot, timeoutMs: 5000 })).rejects.toThrow(/fixture startup failure/);
  });

  it('terminates an unready child when the startup deadline expires', async () => {
    const projectRoot = project("import fs from 'node:fs'; fs.writeFileSync('pid.txt', String(process.pid)); setInterval(() => {}, 1000);");
    await expect(spawnProductionProcess({ projectRoot, timeoutMs: 700 })).rejects.toThrow(/Timeout/);
    const pid = Number(fs.readFileSync(path.join(projectRoot, 'pid.txt'), 'utf8'));
    expect(() => process.kill(pid, 0)).toThrow();
  });
});
