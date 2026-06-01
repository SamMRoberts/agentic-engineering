#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyCli = path.join(root, 'skills/ux-gremlin/scripts/ux-gremlin.mjs');
const skillScripts = {
  'test-strategy-advisor': 'skills/test-strategy-advisor/scripts/test-strategy-advisor.mjs',
  'plan-gremlins': 'skills/plan-gremlins/scripts/plan-gremlins.mjs',
  'validate-plan': 'skills/validate-plan/scripts/validate-plan.mjs',
  'generate-playwright': 'skills/generate-playwright/scripts/generate-playwright.mjs',
  'execute-tests': 'skills/execute-tests/scripts/execute-tests.mjs',
  'report-gremlins': 'skills/report-gremlins/scripts/report-gremlins.mjs'
};

function statMtime(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return -1;
  }
}

function detectNextSkill(cwd) {
  const sessionDir = path.join(cwd, '.agent/session');
  const yamlPlan = path.join(sessionDir, 'ux-gremlin-plan.yaml');
  const jsonPlan = path.join(sessionDir, 'ux-gremlin-plan.json');
  const marker = path.join(sessionDir, 'ux-gremlin-plan.check.ok');
  const spec = path.join(cwd, '.agent/generated/ux-gremlin.spec.ts');
  const results = path.join(sessionDir, 'ux-gremlin-results.json');
  const report = path.join(cwd, '.agent/reports/ux-gremlin/report.md');

  if (!fs.existsSync(sessionDir)) {
    return {
      skill: 'test-strategy-advisor',
      reason: 'No .agent/session/ directory exists yet.'
    };
  }

  const plan = fs.existsSync(yamlPlan) ? yamlPlan : (fs.existsSync(jsonPlan) ? jsonPlan : null);
  if (!plan) {
    return {
      skill: 'plan-gremlins',
      reason: 'No UX Gremlin plan artifact exists yet.'
    };
  }

  if (statMtime(marker) < statMtime(plan)) {
    return {
      skill: 'validate-plan',
      reason: 'The plan exists but there is no fresh validation success marker.'
    };
  }

  if (!fs.existsSync(spec)) {
    return {
      skill: 'generate-playwright',
      reason: 'The plan is validated but no generated Playwright spec exists.'
    };
  }

  if (!fs.existsSync(results)) {
    return {
      skill: 'execute-tests',
      reason: 'The generated spec exists but no ingested results JSON exists yet.'
    };
  }

  if (!fs.existsSync(report)) {
    return {
      skill: 'report-gremlins',
      reason: 'Results exist but report artifacts have not been created yet.'
    };
  }

  return {
    skill: 'report-gremlins',
    reason: 'Primary artifacts already exist; refresh reporting or inspect downstream analysis skills next.',
    complete: true
  };
}

const args = process.argv.slice(2);
if (args[0] === 'auto') {
  const dryRun = args.includes('--dry-run');
  const route = detectNextSkill(process.cwd());
  const script = skillScripts[route.skill];
  console.log(`Next skill: ${route.skill}`);
  console.log(`Reason: ${route.reason}`);
  console.log(`Command: node ${script}`);
  if (dryRun) process.exit(0);
  const result = spawnSync(process.execPath, [path.join(root, script)], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  process.exit(result.status ?? 1);
}

const result = spawnSync(process.execPath, [legacyCli, ...args], {
  cwd: process.cwd(),
  stdio: 'inherit'
});
process.exit(result.status ?? 1);
