#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const legacyCli = path.join(root, 'skills/ux-gremlin/scripts/ux-gremlin.mjs');
const args = process.argv.slice(2);
const markerPath = path.join(process.cwd(), '.agent/session/ux-gremlin-plan.check.ok');
const commands = [
  ['workflow-status', '--phase', 'plan', ...args],
  ['check', ...args],
  ['coverage', ...args]
];

for (const command of commands) {
  const result = spawnSync(process.execPath, [legacyCli, ...command], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  if ((result.status ?? 1) !== 0) {
    fs.rmSync(markerPath, { force: true });
    process.exit(result.status ?? 1);
  }
}

fs.mkdirSync(path.dirname(markerPath), { recursive: true });
const planArgIndex = args.indexOf('--plan');
const plan = planArgIndex >= 0 ? args[planArgIndex + 1] : '.agent/session/ux-gremlin-plan.yaml';
fs.writeFileSync(markerPath, `${JSON.stringify({ validated_at: new Date().toISOString(), plan }, null, 2)}\n`, 'utf-8');
console.log(`Wrote ${path.relative(process.cwd(), markerPath)}`);
