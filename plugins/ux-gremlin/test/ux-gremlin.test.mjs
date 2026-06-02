import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const pluginRoot = path.resolve(import.meta.dirname, "..");
const script = path.join(pluginRoot, "scripts/ux-gremlin-core.mjs");
const routerScript = path.join(pluginRoot, "scripts/ux-gremlin.mjs");
const pluginManifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, "plugin.json"), "utf-8"));
const validPlan = path.join(pluginRoot, "examples/valid-plan.yaml");
const invalidPlan = path.join(pluginRoot, "examples/invalid-plan.yaml");
const resultsExample = path.join(pluginRoot, "examples/results.example.yaml");
const playwrightExample = path.join(pluginRoot, "examples/playwright-report.example.json");
const expectedVersion = pluginManifest.metadata.version;
const focusedSkills = pluginManifest.metadata.skills.map((skillPath) => path.basename(path.dirname(skillPath)));

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
    reporting: { output_dir: ".agent/reports/ux-gremlin" },
    ...extra
  };
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd ?? pluginRoot,
    encoding: "utf-8"
  });
}

function runRouter(args, options = {}) {
  return spawnSync(process.execPath, [routerScript, ...args], {
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

test("generated spec is failing-by-default with scenario annotations", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const generate = run(["generate-playwright", "--plan", validPlan], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  const spec = fs.readFileSync(path.join(dir, ".agent/generated/ux-gremlin.spec.ts"), "utf-8");
  assert.match(spec, /function requireImplementation/);
  assert.match(spec, /throw new Error\(`UX Gremlin: implement assertions/);
  assert.match(spec, /type: 'ux-gremlin-scenario', description: "double-submit-confirm"/);
  assert.match(spec, /type: 'ux-gremlin-risk', description: "high"/);
});

test("check enforces flow_type coverage with actionable errors", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(minimalFormPlan({ flow_type: "form" })), "utf-8");
  const result = run(["check", "--plan", planPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /flow_type "form" requires a scenario in category: partial_form_completion/);
  assert.match(result.stderr, /interrupted_save/);
});

test("check rejects invalid flow_type values", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(minimalFormPlan({ flow_type: ["made_up"] })), "utf-8");
  const result = run(["check", "--plan", planPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /flow_type has invalid value: made_up/);
});

test("check warns on declared conditions without covering scenarios", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
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

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(minimalFormPlan({ flow_type: "form" })), "utf-8");
  const gaps = run(["coverage", "--plan", planPath]);
  assert.equal(gaps.status, 0, gaps.stderr);
  assert.match(gaps.stdout, /form: add a scenario in category duplicate_entity_creation/);
});

test("workflow-status plan and generate gates use plan validation", () => {
  const planReady = run(["workflow-status", "--phase", "plan", "--plan", validPlan]);
  assert.equal(planReady.status, 0, planReady.stderr);
  assert.match(planReady.stdout, /workflow plan gate passed/);

  const generateReady = run(["workflow-status", "--phase", "generate", "--plan", validPlan]);
  assert.equal(generateReady.status, 0, generateReady.stderr);
  assert.match(generateReady.stdout, /workflow generate gate passed/);

  const invalid = run(["workflow-status", "--phase", "generate", "--plan", invalidPlan]);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /ERROR: mode must be one of/);
  assert.match(invalid.stderr, /NEXT: Create or repair/);
});

test("workflow-status execute fails when generated spec is missing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const result = run(["workflow-status", "--phase", "execute", "--plan", validPlan], { cwd: dir });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ERROR: generated Playwright spec is missing/);
  assert.match(result.stderr, /NEXT: Run generate-playwright/);
});

test("workflow-status execute fails when generated spec is still incomplete", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const generate = run(["generate-playwright", "--plan", validPlan], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);

  const result = run(["workflow-status", "--phase", "execute", "--plan", validPlan], { cwd: dir });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ERROR: generated Playwright spec still contains TODO placeholders/);
  assert.match(result.stderr, /ERROR: generated Playwright spec still contains \d+ active requireImplementation/);
  assert.match(result.stderr, /NEXT: Replace generated TODO step comments/);
});

test("workflow-status execute passes after generated spec is implemented", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const specPath = path.join(dir, ".agent/generated/ux-gremlin.spec.ts");
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  const scenarioIds = [
    "double-submit-confirm",
    "reload-mid-flow",
    "keyboard-only-create",
    "invalid-required-fields",
    "expired-auth-confirm",
    "slow-network-create",
    "browser-back-forward",
    "duplicate-entity"
  ];
  const scenarioTests = scenarioIds.map((scenarioId) => `  test('${scenarioId}: implemented', {
    annotation: [{ type: 'ux-gremlin-scenario', description: '${scenarioId}' }]
  }, async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/./);
  });`).join("\n");
  fs.writeFileSync(specPath, `import { test, expect } from '@playwright/test';

test.describe('Implemented UX Gremlin spec', () => {
  test('baseline happy path', {
    annotation: [{ type: 'ux-gremlin-baseline', description: 'true' }]
  }, async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/./);
  });

${scenarioTests}
});
`, "utf-8");

  const result = run(["workflow-status", "--phase", "execute", "--plan", validPlan], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /workflow execute gate passed/);
});

test("report includes executive summary, risk score, and top issues", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const report = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  const reportDir = path.join(dir, ".agent/reports/ux-gremlin");
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
  assert.match(html, /<section id="executive-summary" class="hero verdict-fail">/);
  assert.match(html, /<nav class="report-nav" aria-label="Report sections">/);
  assert.match(html, /href="#top-issues"/);
  assert.match(html, /href="#scenario-index"/);
  assert.match(html, /href="#evidence-library"/);
  assert.match(html, /<p class="decision-line">Fail \| 33% pass rate \| 2 top issue\(s\)<\/p>/);
  assert.match(html, /<div class="metric-grid" aria-label="Executive metrics">/);
  assert.match(html, /<section id="top-issues" class="panel-section">/);
  assert.match(html, /<section id="scenario-index" class="panel-section">/);
  assert.match(html, /<section id="evidence-library" class="panel-section">/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test("report writes junit and pr-comment artifacts", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const report = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  const reportDir = path.join(dir, ".agent/reports/ux-gremlin");
  const junit = fs.readFileSync(path.join(reportDir, "report.junit.xml"), "utf-8");
  const pr = fs.readFileSync(path.join(reportDir, "report.pr.md"), "utf-8");

  assert.match(junit, /<testsuites name="ux-gremlin" tests="8" failures="1"/);
  assert.match(junit, /<failure message="Duplicate entity creation is possible/);
  assert.doesNotMatch(junit, /<script>alert/);
  assert.match(pr, /UX Gremlin: . Fail/);
  assert.match(pr, /Pass rate: 33%/);
});

test("report --fail-on gates on highest open severity", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const failing = run(["report", "--plan", validPlan, "--results", resultsExample, "--fail-on", "high"], { cwd: dir });
  assert.equal(failing.status, 1);
  assert.match(failing.stderr, /GATE FAIL: highest open severity high/);
  // Artifacts are still written before the gate fails.
  assert.equal(fs.existsSync(path.join(dir, ".agent/reports/ux-gremlin/report.md")), true);

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
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

test("ingest copies Playwright attachments into evidence and reports link them safely", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const attachmentDir = path.join(dir, "playwright-artifacts");
  fs.mkdirSync(attachmentDir, { recursive: true });
  const screenshotPath = path.join(attachmentDir, "failure screenshot.png");
  const tracePath = path.join(attachmentDir, "trace.zip");
  const genericPath = path.join(attachmentDir, "network quote.txt");
  fs.writeFileSync(screenshotPath, "png-bytes", "utf-8");
  fs.writeFileSync(tracePath, "zip-bytes", "utf-8");
  fs.writeFileSync(genericPath, "network-bytes", "utf-8");

  const pwReport = path.join(dir, "playwright-report.json");
  fs.writeFileSync(
    pwReport,
    JSON.stringify({
      suites: [
        {
          title: "ux-gremlin.spec.ts",
          specs: [
            {
              title: "baseline happy path",
              tests: [
                {
                  status: "expected",
                  annotations: [{ type: "ux-gremlin-baseline", description: "true" }],
                  results: [{ status: "passed" }]
                }
              ]
            },
            {
              title: "double-submit-confirm: Double-submit final confirmation",
              tests: [
                {
                  status: "unexpected",
                  annotations: [
                    { type: "ux-gremlin-scenario", description: "double-submit-confirm" },
                    { type: "ux-gremlin-risk", description: "high" }
                  ],
                  results: [
                    {
                      status: "failed",
                      error: { message: "Expected count 1 but received 2\n    at spec.ts:42" },
                      attachments: [
                        {
                          name: "failure screenshot <script>alert(1)</script>",
                          contentType: "image/png",
                          path: screenshotPath
                        },
                        { name: "trace archive", contentType: "application/zip", path: tracePath },
                        { name: "network \"quote\" log", contentType: "text/plain", path: genericPath },
                        {
                          name: "missing screenshot",
                          contentType: "image/png",
                          path: path.join(attachmentDir, "missing.png")
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }, null, 2),
    "utf-8"
  );

  const outPath = path.join(dir, ".agent/session/ux-gremlin-results.json");
  const ingest = run(["ingest", "--plan", validPlan, "--input", pwReport, "--out", outPath], { cwd: dir });
  assert.equal(ingest.status, 0, ingest.stderr);
  const results = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  const scenario = results.scenario_results.find((item) => item.scenario_id === "double-submit-confirm");
  assert.ok(scenario);
  assert.equal(scenario.screenshots.length, 1);
  assert.equal(scenario.traces.length, 1);
  assert.equal(scenario.evidence_artifacts.length, 1);
  assert.match(scenario.screenshots[0], /^\.agent\/evidence\/ux-gremlin\/double-submit-confirm\//);
  assert.match(scenario.traces[0], /^\.agent\/evidence\/ux-gremlin\/double-submit-confirm\//);
  assert.match(scenario.evidence_artifacts[0], /^\.agent\/evidence\/ux-gremlin\/double-submit-confirm\//);
  assert.equal(fs.existsSync(path.join(dir, scenario.screenshots[0])), true);
  assert.equal(fs.existsSync(path.join(dir, scenario.traces[0])), true);
  assert.equal(fs.existsSync(path.join(dir, scenario.evidence_artifacts[0])), true);
  assert.match(results.open_risks.join("\n"), /missing screenshot/);

  const report = run(["report", "--plan", validPlan, "--results", outPath], { cwd: dir });
  assert.equal(report.status, 0, report.stderr);
  const reportDir = path.join(dir, ".agent/reports/ux-gremlin");
  const markdown = fs.readFileSync(path.join(reportDir, "report.md"), "utf-8");
  const html = fs.readFileSync(path.join(reportDir, "report.html"), "utf-8");
  const reportJson = JSON.parse(fs.readFileSync(path.join(reportDir, "report.json"), "utf-8"));

  assert.match(markdown, /\[screenshot: failure screenshot/);
  assert.match(markdown, /\]\(\.\.\/\.\.\/evidence\/ux-gremlin\/double-submit-confirm\//);
  assert.match(html, /<section id="scenario-index" class="panel-section">/);
  assert.match(html, /id="scenario-double-submit-confirm"/);
  assert.match(html, /<section id="evidence-library" class="panel-section">/);
  assert.match(html, /href="\.\.\/\.\.\/evidence\/ux-gremlin\/double-submit-confirm\//);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.equal(reportJson.evidence.artifacts.length, 3);
  assert.equal(reportJson.scenarios.find((item) => item.id === "double-submit-confirm").evidence.length, 3);
});

test("ingest blocks mutations when the baseline fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
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
                  annotations: [{ type: "ux-gremlin-baseline", description: "true" }],
                  results: [{ status: "failed", error: { message: "baseline broke" } }]
                }
              ]
            },
            {
              title: "double-submit-confirm: x",
              tests: [
                {
                  status: "expected",
                  annotations: [{ type: "ux-gremlin-scenario", description: "double-submit-confirm" }],
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const first = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(first.status, 0, first.stderr);
  const firstJson = JSON.parse(
    fs.readFileSync(path.join(dir, ".agent/reports/ux-gremlin/report.json"), "utf-8")
  );
  assert.equal(firstJson.trend, null);

  const second = run(["report", "--plan", validPlan, "--results", resultsExample], { cwd: dir });
  assert.equal(second.status, 0, second.stderr);
  const secondJson = JSON.parse(
    fs.readFileSync(path.join(dir, ".agent/reports/ux-gremlin/report.json"), "utf-8")
  );
  assert.ok(secondJson.trend);
  assert.equal(secondJson.trend.suspected_bug_delta, 0);
  assert.equal(secondJson.trend.pass_rate_delta, 0);
});

// Recipe DSL plan used to exercise playwright_steps validation and emission.
function recipeFormPlan(extra = {}) {
  return {
    version: "1.0",
    name: "Recipe test",
    target: { url: "http://localhost:3000", app_area: "test", environment: "local" },
    mode: "playwright_cli",
    safety: { destructive_actions_allowed: false, test_data_prefix: "ux", cleanup_required: true },
    baseline_flow: {
      name: "baseline",
      steps: ["open"],
      expected_result: "ok",
      playwright_steps: [
        { action: "goto", url: "http://localhost:3000/" },
        { action: "expect_visible", role: "heading", name: "Dashboard" }
      ]
    },
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
        recovery_expectation: "r",
        playwright_steps: [
          { action: "click", role: "button", name: "Add New" },
          { action: "fill", label: "Title", value: 'quote"value' },
          { action: "press", key: "Enter" },
          { action: "expect_text", role: "alert", name: "Validation", text: "Title is required" },
          { action: "expect_count", role: "row", name: "ux-test", count: 0 },
          { action: "screenshot", name: "invalid-fields" }
        ]
      }
    ],
    accessibility_checks: {},
    assertions: ["a"],
    bug_indicators: ["b"],
    recovery_expectations: ["r"],
    verification_commands: ["c"],
    reporting: { output_dir: ".agent/reports/ux-gremlin" },
    ...extra
  };
}

test("generate-playwright emits real Playwright code from playwright_steps recipe", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(recipeFormPlan()), "utf-8");

  const generate = run(["generate-playwright", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  const spec = fs.readFileSync(path.join(dir, ".agent/generated/ux-gremlin.spec.ts"), "utf-8");

  // Baseline recipe compiles to real Playwright calls.
  assert.match(spec, /await page\.goto\("http:\/\/localhost:3000\/"\);/);
  assert.match(spec, /await expect\(page\.getByRole\("heading", \{ name: "Dashboard" \}\)\)\.toBeVisible\(\);/);

  // Scenario recipe covers click, fill (with quoted value), press, expect_text, expect_count, screenshot.
  assert.match(spec, /await page\.getByRole\("button", \{ name: "Add New" \}\)\.click\(\);/);
  assert.match(spec, /await page\.getByLabel\("Title"\)\.fill\("quote\\"value"\);/);
  assert.match(spec, /await page\.keyboard\.press\("Enter"\);/);
  assert.match(spec, /await expect\(page\.getByRole\("alert", \{ name: "Validation" \}\)\)\.toContainText\("Title is required"\);/);
  assert.match(spec, /await expect\(page\.getByRole\("row", \{ name: "ux-test" \}\)\)\.toHaveCount\(0\);/);
  assert.match(spec, /testInfo\.attach\("invalid-fields", \{ body: __body, contentType: 'image\/png' \}\);/);

  // Scenarios whose recipe contains expect_* drop the failing-by-default guard.
  assert.doesNotMatch(spec, /requireImplementation\("invalid-fields"/);
  assert.doesNotMatch(spec, /TODO: mutate the baseline flow for category "invalid_required_fields"/);

  // Baseline recipe with expect_* also drops requireImplementation for baseline.
  assert.doesNotMatch(spec, /requireImplementation\('baseline happy path'/);
  assert.doesNotMatch(spec, /TODO: add baseline happy-path steps/);
});

test("workflow-status execute passes when baseline and scenario recipes provide assertions", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(recipeFormPlan()), "utf-8");

  const generate = run(["generate-playwright", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);

  const status = run(["workflow-status", "--phase", "execute", "--plan", planPath], { cwd: dir });
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /workflow execute gate passed/);
});

test("generate-playwright keeps failing-by-default when no recipe is provided", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  const plan = recipeFormPlan();
  delete plan.baseline_flow.playwright_steps;
  delete plan.gremlin_scenarios[0].playwright_steps;
  fs.writeFileSync(planPath, JSON.stringify(plan), "utf-8");

  const generate = run(["generate-playwright", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  const spec = fs.readFileSync(path.join(dir, ".agent/generated/ux-gremlin.spec.ts"), "utf-8");
  assert.match(spec, /requireImplementation\("invalid-fields"/);
  assert.match(spec, /TODO: mutate the baseline flow for category "invalid_required_fields"/);
  assert.match(spec, /requireImplementation\('baseline happy path'/);
});

test("validatePlan rejects malformed playwright_steps with actionable errors", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.json");
  const plan = recipeFormPlan();
  plan.gremlin_scenarios[0].playwright_steps = [
    { action: "teleport" },
    { action: "click" },
    { action: "fill", role: "textbox", name: "Title" },
    { action: "expect_count", role: "row", name: "ux-test" },
    { action: "press" },
    { action: "goto" }
  ];
  fs.writeFileSync(planPath, JSON.stringify(plan), "utf-8");

  const result = run(["check", "--plan", planPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /playwright_steps\[0\]\.action must be one of/);
  assert.match(result.stderr, /playwright_steps\[1\] requires a selector/);
  assert.match(result.stderr, /playwright_steps\[2\]\.value must be a string/);
  assert.match(result.stderr, /playwright_steps\[3\]\.count must be a non-negative integer/);
  assert.match(result.stderr, /playwright_steps\[4\]\.key must be a non-empty string/);
  assert.match(result.stderr, /playwright_steps\[5\]\.url must be a non-empty string/);
});

test("YAML playwright_steps parse through the existing parser", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-"));
  const planPath = path.join(dir, "plan.yaml");
  fs.writeFileSync(planPath, `version: "1.0"
name: "Recipe yaml"
target:
  url: "http://localhost:3000"
  app_area: "test"
  environment: "local"
mode: "playwright_cli"
safety:
  destructive_actions_allowed: false
  test_data_prefix: "ux"
  cleanup_required: true
baseline_flow:
  name: "baseline"
  steps:
    - "open"
  expected_result: "ok"
  playwright_steps:
    - action: "goto"
      url: "http://localhost:3000/"
    - action: "expect_visible"
      role: "heading"
      name: "Dashboard"
gremlin_scenarios:
  - id: "invalid-fields"
    name: "Invalid fields"
    category: "invalid_required_fields"
    risk_level: "medium"
    purpose: "p"
    steps:
      - "s"
    expected_behavior: "b"
    assertions:
      - "a"
    recovery_expectation: "r"
    playwright_steps:
      - action: "click"
        role: "button"
        name: "Add New"
      - action: "expect_visible"
        label: "Title"
accessibility_checks: {}
assertions:
  - "a"
bug_indicators:
  - "b"
recovery_expectations:
  - "r"
verification_commands:
  - "c"
reporting:
  output_dir: ".agent/reports/ux-gremlin"
`, "utf-8");

  const result = run(["check", "--plan", planPath]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK:/);

  const generate = run(["generate-playwright", "--plan", planPath], { cwd: dir });
  assert.equal(generate.status, 0, generate.stderr);
  const spec = fs.readFileSync(path.join(dir, ".agent/generated/ux-gremlin.spec.ts"), "utf-8");
  assert.match(spec, /await page\.getByRole\("button", \{ name: "Add New" \}\)\.click\(\);/);
  assert.match(spec, /await expect\(page\.getByLabel\("Title"\)\)\.toBeVisible\(\);/);
});

test("focused skill scaffolding includes metadata, sections, and scripts", () => {
  for (const skill of focusedSkills) {
    const skillPath = path.join(pluginRoot, "skills", skill, "SKILL.md");
    const scriptEntries = fs
      .readdirSync(path.join(pluginRoot, "skills", skill, "scripts"))
      .filter((entry) => entry.endsWith(".mjs"));
    const scriptPath = path.join(pluginRoot, "skills", skill, "scripts", scriptEntries[0]);
    const content = fs.readFileSync(skillPath, "utf-8");

    assert.equal(scriptEntries.length, 1, `${skill} should contain one script file`);
    assert.equal(fs.existsSync(scriptPath), true, `${skill} script is missing`);
    assert.match(content, new RegExp(`^name: ${skill}$`, "m"));
    assert.match(content, /^user-invocable: true$/m);
    assert.match(content, /^## When to Use$/m);
    assert.match(content, /^## When Not to Use$/m);
    assert.match(content, /^## Required Inputs$/m);
    assert.match(content, /^## Output Artifacts$/m);
  }
});

test("focused skill scripts parse as valid Node.js modules", () => {
  for (const skill of focusedSkills) {
    const scriptEntries = fs
      .readdirSync(path.join(pluginRoot, "skills", skill, "scripts"))
      .filter((entry) => entry.endsWith(".mjs"));
    const scriptPath = path.join(pluginRoot, "skills", skill, "scripts", scriptEntries[0]);
    const result = spawnSync(process.execPath, ["--check", scriptPath], {
      cwd: pluginRoot,
      encoding: "utf-8"
    });
    assert.equal(result.status, 0, result.stderr);
  }
});

test("plugin metadata advertises the multi-skill UX Gremlin structure", () => {
  const codex = JSON.parse(fs.readFileSync(path.join(pluginRoot, ".codex-plugin/plugin.json"), "utf-8"));
  const claude = JSON.parse(fs.readFileSync(path.join(pluginRoot, ".claude-plugin/plugin.json"), "utf-8"));
  const agent = fs.readFileSync(path.join(pluginRoot, "agents/ux-gremlin.agent.md"), "utf-8");
  const codexFragment = fs.readFileSync(path.join(pluginRoot, "AGENTS.fragment.md"), "utf-8");
  const claudeFragment = fs.readFileSync(path.join(pluginRoot, "custom-instructions.fragment.md"), "utf-8");

  assert.equal(pluginManifest.metadata.version, expectedVersion);
  assert.equal(codex.version, expectedVersion);
  assert.equal(claude.version, expectedVersion);
  assert.equal(pluginManifest.metadata.skills.length, focusedSkills.length);
  assert.match(JSON.stringify(pluginManifest.metadata.skills), /skills\/gremlin-auto\/SKILL\.md/);
  assert.match(JSON.stringify(pluginManifest.metadata.scripts), /scripts\/ux-gremlin\.mjs/);
  assert.match(JSON.stringify(pluginManifest.metadata.outputs), /ux-gremlin-plan\.check\.ok/);

  assert.match(agent, /If the intent is ambiguous, ask exactly one clarifying question/);
  assert.match(agent, /do everything end-to-end/);
  assert.match(agent, /ux-gremlin-plan\.check\.ok/);
  assert.match(codexFragment, /node scripts\/ux-gremlin\.mjs auto/);
  assert.match(codexFragment, /artifact-based phase detection/i);
  assert.match(claudeFragment, /Phase detection/);
});

test("auto router chooses the next skill from artifact state", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-gremlin-router-"));
  const route = (cwd) => runRouter(["auto", "--dry-run"], { cwd });

  let result = route(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Next skill: gremlin-test-strategy-advisor/);

  fs.mkdirSync(path.join(dir, ".agent/session"), { recursive: true });
  result = route(dir);
  assert.match(result.stdout, /Next skill: gremlin-plan-gremlins/);

  const planPath = path.join(dir, ".agent/session/ux-gremlin-plan.yaml");
  fs.writeFileSync(planPath, fs.readFileSync(validPlan, "utf-8"), "utf-8");
  result = route(dir);
  assert.match(result.stdout, /Next skill: gremlin-validate-plan/);

  const validate = spawnSync(
    process.execPath,
    [path.join(pluginRoot, "skills/gremlin-validate-plan/scripts/validate-plan.mjs"), "--plan", planPath],
    { cwd: dir, encoding: "utf-8" }
  );
  assert.equal(validate.status, 0, validate.stderr);
  assert.equal(fs.existsSync(path.join(dir, ".agent/session/ux-gremlin-plan.check.ok")), true);

  result = route(dir);
  assert.match(result.stdout, /Next skill: gremlin-generate-playwright/);

  fs.mkdirSync(path.join(dir, ".agent/generated"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".agent/generated/ux-gremlin.spec.ts"), "// ready\n", "utf-8");
  result = route(dir);
  assert.match(result.stdout, /Next skill: gremlin-execute-tests/);

  fs.writeFileSync(path.join(dir, ".agent/session/ux-gremlin-results.json"), "{\"scenario_results\":[]}\n", "utf-8");
  result = route(dir);
  assert.match(result.stdout, /Next skill: gremlin-report-gremlins/);
});
