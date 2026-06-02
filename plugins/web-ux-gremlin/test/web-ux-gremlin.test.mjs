import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const pluginRoot = path.resolve(import.meta.dirname, "..");
const script = path.join(pluginRoot, "skills/web-ux-gremlin/scripts/web-ux-gremlin.mjs");
const validPlan = path.join(pluginRoot, "skills/web-ux-gremlin/examples/valid-plan.yaml");
const invalidPlan = path.join(pluginRoot, "skills/web-ux-gremlin/examples/invalid-plan.yaml");
const resultsExample = path.join(pluginRoot, "skills/web-ux-gremlin/examples/results.example.yaml");
const playwrightExample = path.join(pluginRoot, "skills/web-ux-gremlin/examples/playwright-report.example.json");

// Minimal but schema-complete plan used to exercise coverage enforcement.
function minimalFormPlan(extra = {}) {
  return {
    version: "1.0",
    name: "Coverage test",
    target: { url: "http://localhost:3000", app_area: "test", environment: "local" },
    mode: "playwright_cli",
    safety: { destructive_actions_allowed: false, test_data_prefix: "ux", cleanup_required: true },
    baseline_flow: { name: "baseline", steps: ["open"], expected_result: "ok" },
    gremlin_scenarios: [
      {
        id: "invalid-fields",
        name: "Invalid fields",
        category: "invalid_required_fields",
        risk_level: "medium",
        purpose: "p",
        steps: ["s"],
        expected_behavior: "b",
        assertions: ["a"],
        recovery_expectation: "r"
      }
    ],
    accessibility_checks: {},
    assertions: ["a"],
    bug_indicators: ["b"],
    recovery_expectations: ["r"],
    verification_commands: ["c"],
    reporting: { output_dir: ".agent/reports/web-ux-gremlin" },
    ...extra
  };
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd ?? pluginRoot,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    encoding: "utf-8"
  });
}

function copyPlanToDir(dir, source = validPlan) {
  const planPath = path.join(dir, ".agent/session/web-ux-gremlin-plan.yaml");
  ensureDirectory(path.dirname(planPath));
  fs.copyFileSync(source, planPath);
  return planPath;
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeSafeSpec(dir) {
  const specPath = path.join(dir, ".agent/generated/web-ux-gremlin.spec.ts");
  ensureDirectory(path.dirname(specPath));
  const source = "import { test } from '@playwright/test';\n\ntest('baseline happy path', async () => {});\n";
  fs.writeFileSync(specPath, source, "utf-8");
  return specPath;
}

function writeMockRunCommand(commandPath) {
  const mockReport = JSON.stringify({
    suites: [
      {
        title: "web-ux-gremlin",
        specs: [
          {
            title: "baseline happy path",
            tests: [
              {
                status: "expected",
                annotations: [{ type: "web-ux-gremlin-baseline", description: "true" }],
                results: []
              }
            ]
          },
          {
            title: "double-submit-confirm: simulated",
            tests: [
              {
                status: "unexpected",
                annotations: [
                  { type: "web-ux-gremlin-scenario", description: "double-submit-confirm" },
                  { type: "web-ux-gremlin-risk", description: "high" }
                ],
                results: [{ message: "simulated duplicate submit" }]
              }
            ]
          }
        ]
      }
    ]
  });
  const source = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const reporterArg = args.find((value) => String(value).startsWith("json:"));
const reportPath = reporterArg ? reporterArg.slice(5) : null;
if (reportPath) {
  fs.writeFileSync(reportPath, ${JSON.stringify(mockReport)}, "utf-8");
}
process.exit(0);
`;
  ensureDirectory(path.dirname(commandPath));
  fs.writeFileSync(commandPath, source, "utf-8");
  fs.chmodSync(commandPath, 0o755);
}

test("valid example passes check", () => {
  const result = run(["check", "--plan", validPlan]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK:/);
});

test("check validates workflow mode input", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = copyPlanToDir(dir);
  const result = run(["check", "--plan", planPath, "--workflow", "invalid"], { cwd: dir });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--workflow must be one of:/);
});

test("check accepts hyphenated Playwright execution mode aliases", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = copyPlanToDir(dir);
  const source = fs.readFileSync(planPath, "utf-8").replace('mode: "cli"', 'mode: "playwright-mcp"');
  fs.writeFileSync(planPath, source, "utf-8");

  const result = run(["check", "--plan", planPath], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Execution mode: mcp/);
});

test("invalid example fails with actionable errors", () => {
  const result = run(["check", "--plan", invalidPlan]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ERROR: mode must be one of/);
  assert.match(result.stderr, /ERROR: baseline flow has no steps/);
  assert.match(result.stderr, /ERROR: verification commands are empty/);
});

test("workflow-status enforces monotonic phase transitions", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const first = run(["workflow-status", "--phase", "plan"], { cwd: dir });
  assert.equal(first.status, 0, first.stderr);

  const backward = run(["workflow-status", "--phase", "init"], { cwd: dir });
  assert.equal(backward.status, 2);
  assert.match(backward.stderr, /cannot move workflow phase backwards/);
});

test("generate-playwright and report write expected artifacts", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const generate = run(["generate-playwright", "--plan", validPlan], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  const specPath = path.join(dir, ".agent/generated/web-ux-gremlin.spec.ts");
  assert.equal(fs.existsSync(specPath), true);
  assert.match(fs.readFileSync(specPath, "utf-8"), /baseline happy path/);

  const report = run(["report", "--plan", validPlan], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  const reportPath = path.join(dir, ".agent/reports/web-ux-gremlin/report.md");
  const jsonPath = path.join(dir, ".agent/reports/web-ux-gremlin/report.json");
  const htmlPath = path.join(dir, ".agent/reports/web-ux-gremlin/report.html");
  assert.equal(fs.existsSync(reportPath), true);
  assert.equal(fs.existsSync(jsonPath), true);
  assert.equal(fs.existsSync(htmlPath), true);
  assert.match(fs.readFileSync(reportPath, "utf-8"), /# UX Gremlin Report/);
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  assert.equal(json.source.has_results, false);
  assert.equal(json.summary.status_counts.not_run, 8);
});

test("report with results writes markdown, json, and escaped html", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const report = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);

  const reportDir = path.join(dir, ".agent/reports/web-ux-gremlin");
  const markdown = fs.readFileSync(path.join(reportDir, "report.md"), "utf-8");
  const json = JSON.parse(fs.readFileSync(path.join(reportDir, "report.json"), "utf-8"));
  const html = fs.readFileSync(path.join(reportDir, "report.html"), "utf-8");

  assert.match(markdown, /Confirm remains enabled while the save request is pending/);
  assert.match(markdown, /Duplicate entity creation is possible/);
  assert.match(markdown, /POST \/api\/pages returned 409/);
  assert.match(markdown, /Manual cleanup removed the extra prefixed page/);
  assert.match(markdown, /npx playwright test \.agent\/generated\/web-ux-gremlin\.spec\.ts/);

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

test("run command supports workflow-aware dry-run mode and command builders", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = copyPlanToDir(dir);
  const generated = run(["generate", "--plan", planPath], { cwd: dir });
  assert.equal(generated.status, 0, generated.stderr);

  const cliDryRun = run(["run", "--plan", planPath, "--dry-run", "--mode", "cli"], { cwd: dir });
  assert.equal(cliDryRun.status, 0, cliDryRun.stderr);
  assert.match(cliDryRun.stdout, /Would run \(cli\):/);
  assert.match(cliDryRun.stdout, /\"npx\"/);
  assert.match(cliDryRun.stdout, /\"playwright\"/);
  assert.match(cliDryRun.stdout, /\"test\"/);

  const playwrightCliDryRun = run(["run", "--plan", planPath, "--dry-run", "--mode", "playwright-cli"], { cwd: dir });
  assert.equal(playwrightCliDryRun.status, 0, playwrightCliDryRun.stderr);
  assert.match(playwrightCliDryRun.stdout, /Would run \(cli\):/);
  assert.match(playwrightCliDryRun.stdout, /\"npx\"/);
  assert.match(playwrightCliDryRun.stdout, /\"playwright\"/);
  assert.match(playwrightCliDryRun.stdout, /\"test\"/);

  const mcpStatePath = path.join(dir, ".agent/session/web-ux-gremlin-mcp-state.json");
  const mcpCommandPath = path.join(dir, "bin", "mcp-runner");
  const mcpDryRun = run(
    [
      "run",
      "--plan",
      planPath,
      "--dry-run",
      "--mode",
      "mcp",
      "--mcp-state",
      mcpStatePath,
      "--mcp-command",
      mcpCommandPath
    ],
    { cwd: dir }
  );
  assert.equal(mcpDryRun.status, 0, mcpDryRun.stderr);
  assert.match(mcpDryRun.stdout, /Would run \(mcp\):/);
  assert.match(mcpDryRun.stdout, new RegExp(mcpCommandPath));

  const playwrightMcpDryRun = run(
    [
      "run",
      "--plan",
      planPath,
      "--dry-run",
      "--mode",
      "playwright-mcp",
      "--mcp-state",
      mcpStatePath,
      "--mcp-command",
      mcpCommandPath
    ],
    { cwd: dir }
  );
  assert.equal(playwrightMcpDryRun.status, 0, playwrightMcpDryRun.stderr);
  assert.match(playwrightMcpDryRun.stdout, /Would run \(mcp\):/);
  assert.match(playwrightMcpDryRun.stdout, new RegExp(mcpCommandPath));
});

test("run rejects unimplemented placeholders before execution", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = copyPlanToDir(dir);
  const generate = run(["generate-playwright", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);

  const blocked = run(["run", "--plan", planPath], { cwd: dir });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /generated spec contains unimplemented placeholders/);
});

test("report writes all artifacts to custom out-dir", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const outDir = path.join(dir, "custom-report");
  const report = run(["report", "--plan", validPlan, "--results", resultsExample, "--out-dir", outDir], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  assert.equal(fs.existsSync(path.join(outDir, "report.md")), true);
  assert.equal(fs.existsSync(path.join(outDir, "report.json")), true);
  assert.equal(fs.existsSync(path.join(outDir, "report.html")), true);
});

test("report fails with actionable missing and malformed results errors", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
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

test("generated spec is failing-by-default with scenario annotations", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const generate = run(["generate-playwright", "--plan", validPlan], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  const spec = fs.readFileSync(path.join(dir, ".agent/generated/web-ux-gremlin.spec.ts"), "utf-8");
  assert.match(spec, /function requireImplementation/);
  assert.match(spec, /throw new Error\(`UX Gremlin: implement assertions/);
  assert.match(spec, /type: 'web-ux-gremlin-scenario', description: "double-submit-confirm"/);
  assert.match(spec, /type: 'web-ux-gremlin-risk', description: "high"/);
});

test("check enforces flow_type coverage with actionable errors", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(minimalFormPlan({ flow_type: "form" })), "utf-8");
  const result = run(["check", "--plan", planPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /flow_type "form" requires a scenario in category: partial_form_completion/);
  assert.match(result.stderr, /interrupted_save/);
});

test("check rejects invalid flow_type values", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(minimalFormPlan({ flow_type: ["made_up"] })), "utf-8");
  const result = run(["check", "--plan", planPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /flow_type has invalid value: made_up/);
});

test("check warns on declared conditions without covering scenarios", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(
    planPath,
    JSON.stringify(minimalFormPlan({ network_conditions: { include_offline_recovery: true } })),
    "utf-8"
  );
  const result = run(["check", "--plan", planPath]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /WARN: declared network_conditions.include_offline_recovery/);
});

test("coverage command reports gaps and clean coverage", () => {
  const clean = run(["coverage", "--plan", validPlan]);
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /All declared flow types are covered/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(minimalFormPlan({ flow_type: "form" })), "utf-8");
  const gaps = run(["coverage", "--plan", planPath]);
  assert.equal(gaps.status, 0, gaps.stderr);
  assert.match(gaps.stdout, /form: add a scenario in category duplicate_entity_creation/);
});

test("report includes executive summary, risk score, and top issues", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const report = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  const reportDir = path.join(dir, ".agent/reports/web-ux-gremlin");
  const json = JSON.parse(fs.readFileSync(path.join(reportDir, "report.json"), "utf-8"));
  const markdown = fs.readFileSync(path.join(reportDir, "report.md"), "utf-8");
  const html = fs.readFileSync(path.join(reportDir, "report.html"), "utf-8");

  assert.equal(json.executive_summary.verdict, "Fail");
  assert.equal(json.executive_summary.pass_rate, 33);
  assert.equal(json.executive_summary.suspected_bug_count, 1);
  assert.equal(json.executive_summary.accessibility_blocker_count, 2);
  assert.equal(json.executive_summary.highest_open_severity, "high");
  assert.ok(json.top_issues.length >= 1);
  assert.equal(json.top_issues[0].id, "double-submit-confirm");
  assert.ok(json.top_issues[0].recommended_action.length > 0);

  assert.match(markdown, /## Executive Summary/);
  assert.match(markdown, /Verdict: \*\*Fail\*\*/);
  assert.match(markdown, /## Top Issues & Recommended Actions/);
  assert.doesNotMatch(markdown, /Status counts: \{/);

  assert.match(html, /verdict-fail/);
  assert.match(html, /Executive Summary/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test("report writes junit and pr-comment artifacts", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const report = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  const reportDir = path.join(dir, ".agent/reports/web-ux-gremlin");
  const junit = fs.readFileSync(path.join(reportDir, "report.junit.xml"), "utf-8");
  const pr = fs.readFileSync(path.join(reportDir, "report.pr.md"), "utf-8");

  assert.match(junit, /<testsuites name="web-ux-gremlin" tests="8" failures="1"/);
  assert.match(junit, /<failure message="Duplicate entity creation is possible/);
  assert.doesNotMatch(junit, /<script>alert/);
  assert.match(pr, /UX Gremlin: . Fail/);
  assert.match(pr, /Pass rate: 33%/);
});

test("run executes against a mocked CLI runner and writes results metadata", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = copyPlanToDir(dir);
  const generate = run(["generate", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  writeSafeSpec(dir);

  const mockBin = path.join(dir, "mock-bin");
  const mockNpx = path.join(mockBin, "npx");
  writeMockRunCommand(mockNpx);
  const runReportPath = path.join(dir, ".agent/session/web-ux-gremlin-run-report.json");
  const resultPath = path.join(dir, ".agent/session/web-ux-gremlin-results.json");
  const result = run(
    [
      "run",
      "--plan",
      planPath,
      "--run-report",
      runReportPath,
      "--out",
      resultPath,
      "--mode",
      "cli"
    ],
    {
      cwd: dir,
      env: { PATH: `${mockBin}:${process.env.PATH}` }
    }
  );
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
  assert.equal(payload.run.mode, "cli");
  const byScenario = new Map(payload.scenario_results.map((entry) => [entry.scenario_id, entry]));
  assert.equal(byScenario.get("double-submit-confirm").status, "failed");
});

test("run executes against a mocked MCP command and persists mode", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = copyPlanToDir(dir);
  const generate = run(["generate", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  writeSafeSpec(dir);

  const mcpPath = path.join(dir, "mcp-runner");
  writeMockRunCommand(mcpPath);
  const runReportPath = path.join(dir, ".agent/session/web-ux-gremlin-run-report.json");
  const resultPath = path.join(dir, ".agent/session/web-ux-gremlin-results.json");
  const statePath = path.join(dir, ".agent/session/web-ux-gremlin-mcp-state.json");
  const result = run(
    [
      "run",
      "--plan",
      planPath,
      "--mode",
      "mcp",
      "--mcp-command",
      mcpPath,
      "--mcp-state",
      statePath,
      "--run-report",
      runReportPath,
      "--out",
      resultPath
    ],
    { cwd: dir }
  );
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
  assert.equal(payload.run.mode, "mcp");
});

test("run executes playwright-mcp alias against the MCP command", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const planPath = copyPlanToDir(dir);
  const generate = run(["generate", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  writeSafeSpec(dir);

  const mcpPath = path.join(dir, "mcp-runner");
  writeMockRunCommand(mcpPath);
  const runReportPath = path.join(dir, ".agent/session/web-ux-gremlin-run-report.json");
  const resultPath = path.join(dir, ".agent/session/web-ux-gremlin-results.json");
  const statePath = path.join(dir, ".agent/session/web-ux-gremlin-mcp-state.json");
  const result = run(
    [
      "run",
      "--plan",
      planPath,
      "--mode",
      "playwright-mcp",
      "--mcp-command",
      mcpPath,
      "--mcp-state",
      statePath,
      "--run-report",
      runReportPath,
      "--out",
      resultPath
    ],
    { cwd: dir }
  );
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
  assert.equal(payload.run.mode, "mcp");
});

test("report --fail-on gates on highest open severity", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const failing = run(["report", "--plan", validPlan, "--results", resultsExample, "--fail-on", "high"], { cwd: dir });
  assert.equal(failing.status, 1);
  assert.match(failing.stderr, /GATE FAIL: highest open severity high/);
  // Artifacts are still written before the gate fails.
  assert.equal(fs.existsSync(path.join(dir, ".agent/reports/web-ux-gremlin/report.md")), true);

  const passing = run(["report", "--plan", validPlan, "--results", resultsExample, "--fail-on", "critical"], { cwd: dir });
  assert.equal(passing.status, 0, passing.stderr);
  assert.match(passing.stdout, /GATE PASS/);
});

test("gate command exits non-zero at or above threshold", () => {
  const fail = run(["gate", "--plan", validPlan, "--results", resultsExample, "--fail-on", "high"]);
  assert.equal(fail.status, 1);
  assert.match(fail.stderr, /GATE FAIL/);

  const pass = run(["gate", "--plan", validPlan, "--results", resultsExample, "--fail-on", "critical"]);
  assert.equal(pass.status, 0, pass.stderr);
});

test("ingest converts a Playwright JSON report into results", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const outPath = path.join(dir, "results.json");
  const ingest = run(["ingest", "--plan", validPlan, "--input", playwrightExample, "--out", outPath]);
  assert.equal(ingest.status, 0, ingest.stderr);
  const results = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  const byId = new Map(results.scenario_results.map((r) => [r.scenario_id, r]));
  assert.equal(byId.get("double-submit-confirm").status, "failed");
  assert.equal(byId.get("double-submit-confirm").severity, "high");
  assert.match(byId.get("double-submit-confirm").findings[0], /Expected count 1 but received 2/);
  assert.equal(byId.get("reload-mid-flow").status, "passed");
  assert.equal(byId.get("keyboard-only-create").status, "needs_review");
  assert.equal(results.run.commit, "abc1234");

  // The ingested results feed report generation without validation errors.
  const report = run(["report", "--plan", validPlan, "--results", outPath], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
});

test("ingest blocks mutations when the baseline fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const pwReport = path.join(dir, "pw.json");
  fs.writeFileSync(
    pwReport,
    JSON.stringify({
      suites: [
        {
          title: "s",
          specs: [
            {
              title: "baseline happy path",
              tests: [
                {
                  status: "unexpected",
                  annotations: [{ type: "web-ux-gremlin-baseline", description: "true" }],
                  results: [{ status: "failed", error: { message: "baseline broke" } }]
                }
              ]
            },
            {
              title: "double-submit-confirm: x",
              tests: [
                {
                  status: "expected",
                  annotations: [{ type: "web-ux-gremlin-scenario", description: "double-submit-confirm" }],
                  results: [{ status: "passed" }]
                }
              ]
            }
          ]
        }
      ]
    }),
    "utf-8"
  );
  const outPath = path.join(dir, "results.json");
  const ingest = run(["ingest", "--plan", validPlan, "--input", pwReport, "--out", outPath]);
  assert.equal(ingest.status, 0, ingest.stderr);
  assert.match(ingest.stdout, /baseline failed; mutations blocked/);
  const results = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  assert.equal(results.scenario_results[0].status, "blocked");
  assert.match(results.open_risks[0], /Baseline happy path failed/);
});

test("report records a trend across runs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "web-ux-gremlin-"));
  const first = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(first.status, 0, first.stderr);
  const firstJson = JSON.parse(
    fs.readFileSync(path.join(dir, ".agent/reports/web-ux-gremlin/report.json"), "utf-8")
  );
  assert.equal(firstJson.trend, null);

  const second = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(second.status, 0, second.stderr);
  const secondJson = JSON.parse(
    fs.readFileSync(path.join(dir, ".agent/reports/web-ux-gremlin/report.json"), "utf-8")
  );
  assert.ok(secondJson.trend);
  assert.equal(secondJson.trend.suspected_bug_delta, 0);
  assert.equal(secondJson.trend.pass_rate_delta, 0);
});
