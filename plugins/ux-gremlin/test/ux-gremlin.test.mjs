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
const resultsExample = path.join(pluginRoot, "skills/ux-gremlin/examples/results.example.yaml");

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
  const jsonPath = path.join(dir, ".agent/reports/ux-gremlin/report.json");
  const htmlPath = path.join(dir, ".agent/reports/ux-gremlin/report.html");
  assert.equal(fs.existsSync(reportPath), true);
  assert.equal(fs.existsSync(jsonPath), true);
  assert.equal(fs.existsSync(htmlPath), true);
  assert.match(fs.readFileSync(reportPath, "utf-8"), /# UX Gremlin Report/);
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  assert.equal(json.source.has_results, false);
  assert.equal(json.summary.status_counts.not_run, 8);
});

test("report with results writes markdown, json, and escaped html", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const report = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);

  const reportDir = path.join(dir, ".agent/reports/ux-gremlin");
  const markdown = fs.readFileSync(path.join(reportDir, "report.md"), "utf-8");
  const json = JSON.parse(fs.readFileSync(path.join(reportDir, "report.json"), "utf-8"));
  const html = fs.readFileSync(path.join(reportDir, "report.html"), "utf-8");

  assert.match(markdown, /Confirm remains enabled while the save request is pending/);
  assert.match(markdown, /Duplicate entity creation is possible/);
  assert.match(markdown, /POST \/api\/pages returned 409/);
  assert.match(markdown, /Manual cleanup removed the extra prefixed page/);
  assert.match(markdown, /npx playwright test \.agent\/generated\/ux-gremlin\.spec\.ts/);

  assert.equal(json.source.has_results, true);
  assert.equal(json.summary.status_counts.failed, 1);
  assert.equal(json.summary.status_counts.passed, 1);
  assert.equal(json.summary.status_counts.needs_review, 1);
  assert.equal(json.summary.status_counts.not_run, 5);
  assert.equal(json.summary.severity_counts.high, 1);
  assert.equal(json.summary.severity_counts.low, 1);
  assert.equal(json.summary.severity_counts.medium, 1);
  assert.equal(json.summary.finding_count, 2);
  assert.equal(json.summary.suspected_bug_count, 1);
  assert.equal(json.evidence.screenshots.length, 3);
  assert.ok(json.artifacts.markdown.endsWith("report.md"));

  assert.match(html, /UX Gremlin Report/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test("report writes all artifacts to custom out-dir", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const outDir = path.join(dir, "custom-report");
  const report = run(["report", "--plan", validPlan, "--results", resultsExample, "--out-dir", outDir], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  assert.equal(fs.existsSync(path.join(outDir, "report.md")), true);
  assert.equal(fs.existsSync(path.join(outDir, "report.json")), true);
  assert.equal(fs.existsSync(path.join(outDir, "report.html")), true);
});

test("report fails with actionable missing and malformed results errors", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const missing = run(["report", "--plan", validPlan, "--results", "missing-results.yaml"], { cwd: dir });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /ERROR: results file is missing/);

  const malformedResults = path.join(dir, "malformed-results.yaml");
  fs.writeFileSync(malformedResults, `version: "1.0"
run:
  executor: "manual"
scenario_results:
  - scenario_id: "double-submit-confirm"
    status: "maybe"
`, "utf-8");
  const malformed = run(["report", "--plan", validPlan, "--results", malformedResults], { cwd: dir });
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /ERROR: scenario result double-submit-confirm status must be one of/);
});
