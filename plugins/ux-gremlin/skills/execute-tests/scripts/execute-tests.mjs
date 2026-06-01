#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const legacyCli = path.join(root, 'skills/ux-gremlin/scripts/ux-gremlin.mjs');
const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const inputPath = inputIndex >= 0 && inputIndex + 1 < args.length ? args[inputIndex + 1].trim() : '';

if (inputPath) {
  for (const command of [
    ['workflow-status', '--phase', 'ingest', '--input', inputPath],
    ['ingest', ...args]
  ]) {
    const result = spawnSync(process.execPath, [legacyCli, ...command], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  }
  process.exit(0);
}

const gate = spawnSync(process.execPath, [legacyCli, 'workflow-status', '--phase', 'execute', ...args], {
  cwd: process.cwd(),
  stdio: 'inherit'
});
if ((gate.status ?? 1) !== 0) process.exit(gate.status ?? 1);
console.log('Next: run Playwright with a JSON reporter, then rerun this command with --input <playwright-report.json> to ingest results.');
