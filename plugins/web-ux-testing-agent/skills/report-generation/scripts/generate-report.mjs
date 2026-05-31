#!/usr/bin/env node
// Render a Markdown report from a normalized test-report JSON file (or from a
// raw Playwright JSON report when --from-playwright is given).
// Usage:
//   node generate-report.mjs <report.json> [--out <report.md>]
//   node generate-report.mjs --from-playwright <pw.json> --plan <plan.yaml> [--out <md>]
import fs from "node:fs";
import { loadPlan } from "../../../lib/plan-loader.mjs";
import { normalizeReport, renderMarkdown } from "../../../lib/report.mjs";

function getArg(args, name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

function main(argv) {
  const args = argv.slice(2);
  const out = getArg(args, "--out");
  const fromPw = getArg(args, "--from-playwright");

  let report;
  if (fromPw) {
    const planPath = getArg(args, "--plan");
    const pwJson = JSON.parse(fs.readFileSync(fromPw, "utf-8"));
    const plan = planPath ? loadPlan(planPath) : {};
    report = normalizeReport(pwJson, {
      plan_id: plan.id ?? "unknown",
      plan_title: plan.title,
      environment: plan.environment ?? {}
    });
  } else {
    const file = args.find((a) => !a.startsWith("--"));
    if (!file) {
      console.error("ERROR: usage: generate-report.mjs <report.json> [--out <md>]");
      process.exit(2);
    }
    report = JSON.parse(fs.readFileSync(file, "utf-8"));
  }

  const md = renderMarkdown(report);
  if (out) {
    fs.writeFileSync(out, md, "utf-8");
    console.log(`OK: wrote ${out}`);
  } else {
    process.stdout.write(md);
  }
}

main(process.argv);
