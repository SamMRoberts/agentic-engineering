#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const legacyCli = path.join(root, 'skills/ux-gremlin/scripts/ux-gremlin.mjs');
const result = spawnSync(process.execPath, [legacyCli, 'init', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit'
});
if ((result.status ?? 1) === 0) {
  console.log('Next: fill in .agent/session/ux-gremlin-plan.yaml, then run validate-plan.');
}
process.exit(result.status ?? 1);
