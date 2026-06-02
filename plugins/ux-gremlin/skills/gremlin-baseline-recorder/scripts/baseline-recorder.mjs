#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const replacement = 'gremlin-plan';
const replacementScript = path.join(root, 'skills/gremlin-plan/scripts/plan-gremlins.mjs');

console.error('[ux-gremlin:gremlin-baseline-recorder] Deprecated: use ' + replacement + ' instead.');
const result = spawnSync(process.execPath, [replacementScript, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit'
});
process.exit(result.status ?? 1);
