#!/usr/bin/env -S npx tsx
// web-ux-runner — primary Playwright CLI driver for web-ux-testing-agent.
//
// Subcommands:
//   validate <plan>                     Validate a plan (schema + lint).
//   generate <plan> [--out <dir>]       Generate a Playwright spec from a plan.
//   run <plan> [--out <dir>] [--report-dir <dir>]
//                                       Generate, execute via Playwright CLI, and
//                                       write report.json + report.md.
//   report <plan> --pw-json <file> [--report-dir <dir>]
//                                       Normalize an existing Playwright JSON report.
//
// Playwright CLI is the primary execution engine. Use Playwright MCP (via the
// debugger subagent) only for discovery and failure investigation.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadPlan } from "./plan-loader.js";
import { validatePlan } from "./plan-validator.js";
import { generateSpec } from "./test-generator.js";
import { resolveAuth } from "./auth.js";
import { collectArtifacts } from "./artifacts.js";
import { writeReport } from "./report-writer.js";

function getOpt(args: string[], name: string, fallback: string | null = null): string | null {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
}

function die(msg: string, code = 1): never {
  console.error(`ERROR: ${msg}`);
  process.exit(code);
}

function cmdValidate(planPath: string): number {
  const plan = loadPlan(planPath);
  const { errors, warnings } = validatePlan(plan);
  for (const w of warnings) console.error(`WARN: ${w}`);
  for (const e of errors) console.error(`ERROR: ${e}`);
  if (errors.length === 0) console.log(`OK: ${planPath} is valid (${warnings.length} warning(s))`);
  return errors.length ? 1 : 0;
}

function generate(planPath: string, outDir: string): string {
  const plan = loadPlan(planPath);
  const { errors, warnings } = validatePlan(plan);
  for (const w of warnings) console.error(`WARN: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    die("plan is invalid; refusing to generate");
  }
  const spec = generateSpec(plan);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${plan.id}.spec.ts`);
  fs.writeFileSync(outPath, spec, "utf-8");
  console.error(`OK: wrote ${outPath}`);
  return outPath;
}

function cmdRun(planPath: string, args: string[]): number {
  const plan = loadPlan(planPath);
  const outDir = getOpt(args, "--out", "tests/web-ux")!;
  const reportDir = getOpt(args, "--report-dir", `reports/web-ux/${Date.now()}`)!;
  const config = getOpt(args, "--config", path.join(import.meta.dirname, "..", "playwright.config.ts"))!;

  // Pre-flight auth check (never reads secret values into the report).
  const auth = resolveAuth(plan.environment);
  for (const p of auth.problems) console.error(`WARN: auth: ${p}`);

  const specPath = generate(planPath, outDir);
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "results.json");
  const resultsDir = path.join(reportDir, "test-results");

  const env = {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath,
    WEB_UX_BASE_URL: plan.environment.base_url,
    WEB_UX_STORAGE_STATE: auth.storageState ?? "",
    WEB_UX_RESULTS_DIR: resultsDir
  };
  const pwArgs = ["playwright", "test", `--config=${config}`, "--reporter=json", specPath];
  console.error(`RUN: npx ${pwArgs.join(" ")}`);
  const res = spawnSync("npx", pwArgs, { env, encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"] });
  if (!fs.existsSync(jsonPath) && res.stdout) {
    try {
      JSON.parse(res.stdout);
      fs.writeFileSync(jsonPath, res.stdout, "utf-8");
    } catch {
      /* ignore */
    }
  }
  if (!fs.existsSync(jsonPath)) die(`no Playwright JSON report at ${jsonPath}`);

  const pwJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const artifacts = collectArtifacts(resultsDir, reportDir);
  const report = writeReport({ plan, pwJson, reportDir, artifacts });
  console.log(`OK: ${report.status} — ${reportDir}/report.md`);
  return report.status === "passed" ? 0 : 1;
}

function cmdReport(planPath: string, args: string[]): number {
  const plan = loadPlan(planPath);
  const pwJsonPath = getOpt(args, "--pw-json");
  if (!pwJsonPath) die("report requires --pw-json <file>");
  const reportDir = getOpt(args, "--report-dir", `reports/web-ux/${Date.now()}`)!;
  const pwJson = JSON.parse(fs.readFileSync(pwJsonPath as string, "utf-8"));
  const report = writeReport({ plan, pwJson, reportDir });
  console.log(`OK: ${report.status} — ${reportDir}/report.md`);
  return report.status === "passed" ? 0 : 1;
}

function main(argv: string[]): void {
  const [cmd, planPath, ...rest] = argv.slice(2);
  if (!cmd || cmd === "-h" || cmd === "--help") {
    console.log(
      "web-ux-runner <validate|generate|run|report> <plan> [options]\n" +
        "  validate <plan>\n" +
        "  generate <plan> [--out <dir>]\n" +
        "  run <plan> [--out <dir>] [--report-dir <dir>] [--config <file>]\n" +
        "  report <plan> --pw-json <file> [--report-dir <dir>]"
    );
    process.exit(cmd ? 0 : 2);
  }
  if (!planPath) die(`${cmd} requires a <plan> path`, 2);

  switch (cmd) {
    case "validate":
      process.exit(cmdValidate(planPath));
      break;
    case "generate":
      generate(planPath, getOpt(rest, "--out", "tests/web-ux")!);
      process.exit(0);
      break;
    case "run":
      process.exit(cmdRun(planPath, rest));
      break;
    case "report":
      process.exit(cmdReport(planPath, rest));
      break;
    default:
      die(`unknown command "${cmd}"`, 2);
  }
}

main(process.argv);
