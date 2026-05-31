#!/usr/bin/env node
// Generate a Playwright Test spec from a validated web UX plan.
// Usage: node generate-playwright-test.mjs --plan <plan.yaml> [--out <dir>] [--stdout]
import fs from "node:fs";
import path from "node:path";
import { loadPlan } from "../../../lib/plan-loader.mjs";
import { validatePlan } from "../../../lib/plan-validator.mjs";
import { generateSpec } from "../../../lib/test-generator.mjs";

function getArg(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

function main(argv) {
  const args = argv.slice(2);
  const planPath = getArg(args, "--plan") ?? args.find((a) => !a.startsWith("--"));
  const outDir = getArg(args, "--out") ?? "tests/web-ux";
  const toStdout = args.includes("--stdout");
  if (!planPath) {
    console.error("ERROR: usage: generate-playwright-test.mjs --plan <plan.yaml> [--out <dir>] [--stdout]");
    process.exit(2);
  }

  let plan;
  try {
    plan = loadPlan(planPath);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
  }

  const { errors, warnings } = validatePlan(plan);
  for (const w of warnings) console.error(`WARN: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    console.error("ERROR: plan is invalid; refusing to generate a spec");
    process.exit(1);
  }

  const spec = generateSpec(plan);
  if (toStdout) {
    process.stdout.write(spec);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${plan.id}.spec.ts`);
  fs.writeFileSync(outPath, spec, "utf-8");
  console.log(`OK: wrote ${outPath}`);
}

main(process.argv);
