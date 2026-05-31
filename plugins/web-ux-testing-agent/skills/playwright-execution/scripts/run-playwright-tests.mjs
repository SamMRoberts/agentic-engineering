#!/usr/bin/env node
// Execute generated Playwright CLI tests for a plan and normalize the JSON
// report. Playwright CLI is the primary execution engine.
// Usage:
//   node run-playwright-tests.mjs --plan <plan.yaml> [--spec <file>] \
//     [--report-dir <dir>] [--config <playwright.config.ts>] [--no-run]
//
// --no-run skips invoking Playwright (useful when a JSON report already exists)
// and only normalizes an existing results.json.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadPlan } from "../../../lib/plan-loader.mjs";
import { normalizeReport, renderMarkdown } from "../../../lib/report.mjs";

function getArg(args, name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

function main(argv) {
  const args = argv.slice(2);
  const planPath = getArg(args, "--plan");
  const spec = getArg(args, "--spec");
  const reportDir = getArg(args, "--report-dir", `reports/web-ux/${Date.now()}`);
  const config = getArg(args, "--config", "runner/playwright.config.ts");
  const noRun = args.includes("--no-run");
  if (!planPath) {
    console.error("ERROR: usage: run-playwright-tests.mjs --plan <plan.yaml> [--spec <file>] [--report-dir <dir>]");
    process.exit(2);
  }

  const plan = loadPlan(planPath);
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "results.json");

  if (!noRun) {
    const env = { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath };
    const pwArgs = ["playwright", "test", "--reporter=json", `--config=${config}`];
    if (spec) pwArgs.push(spec);
    console.error(`RUN: npx ${pwArgs.join(" ")}`);
    const res = spawnSync("npx", pwArgs, { env, encoding: "utf-8" });
    // The json reporter writes to PLAYWRIGHT_JSON_OUTPUT_NAME; also capture stdout.
    if (!fs.existsSync(jsonPath) && res.stdout) {
      try {
        JSON.parse(res.stdout);
        fs.writeFileSync(jsonPath, res.stdout, "utf-8");
      } catch {
        console.error("WARN: could not capture Playwright JSON report from stdout");
      }
    }
    if (res.error) console.error(`WARN: failed to spawn Playwright: ${res.error.message}`);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`ERROR: no Playwright JSON report found at ${jsonPath}`);
    process.exit(1);
  }

  const pwJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const report = normalizeReport(pwJson, {
    plan_id: plan.id,
    plan_title: plan.title,
    run_id: path.basename(reportDir),
    environment: plan.environment ?? {},
    artifacts: { playwright_json: "results.json" }
  });

  fs.writeFileSync(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(path.join(reportDir, "report.md"), renderMarkdown(report), "utf-8");
  console.log(`OK: ${report.status} — wrote ${reportDir}/report.json and report.md`);
  process.exit(report.status === "passed" ? 0 : 1);
}

main(process.argv);
