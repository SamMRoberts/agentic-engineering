import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const pluginRoot = path.resolve(import.meta.dirname, "..");
const script = path.join(pluginRoot, "skills/ux-gremlin/scripts/ux-gremlin.mjs");
const validPlan = path.join(pluginRoot, "skills/ux-gremlin/examples/valid-plan.yaml");
const invalidPlan = path.join(pluginRoot, "skills/ux-gremlin/examples/invalid-plan.yaml");

function run(args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd ?? pluginRoot,
    encoding: "utf-8"
  });
}

test("valid example passes check", () => {
  const result = run(["check", "--plan", validPlan]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK:/);
});

test("invalid example fails with actionable errors", () => {
  const result = run(["check", "--plan", invalidPlan]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ERROR: mode must be one of/);
  assert.match(result.stderr, /ERROR: baseline flow has no steps/);
  assert.match(result.stderr, /ERROR: verification commands are empty/);
});

test("generate-playwright and report write expected artifacts", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const generate = run(["generate-playwright", "--plan", validPlan], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  const specPath = path.join(dir, ".agent/generated/ux-gremlin.spec.ts");
  assert.equal(fs.existsSync(specPath), true);
  assert.match(fs.readFileSync(specPath, "utf-8"), /baseline happy path/);

  const report = run(["report", "--plan", validPlan], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  const reportPath = path.join(dir, ".agent/reports/ux-gremlin/report.md");
  assert.equal(fs.existsSync(reportPath), true);
  assert.match(fs.readFileSync(reportPath, "utf-8"), /# UX Gremlin Report/);
});
