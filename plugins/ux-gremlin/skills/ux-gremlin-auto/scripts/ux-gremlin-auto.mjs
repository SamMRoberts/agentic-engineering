#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dispatcher = path.join(root, 'scripts/ux-gremlin.mjs');
const result = spawnSync(process.execPath, [dispatcher, 'auto', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit'
});
process.exit(result.status ?? 1);
