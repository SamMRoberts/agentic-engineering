#!/usr/bin/env node
// Normalize a web UX test plan: apply defaults and fill missing step ids.
// Usage: node normalize-plan.mjs <plan.yaml> [--write] [--out <path>]
import fs from "node:fs";
import { loadPlan } from "../../../lib/plan-loader.mjs";
import { normalizePlanToYaml } from "../../../lib/plan-normalizer.mjs";

function main(argv) {
  const args = argv.slice(2);
  const write = args.includes("--write");
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 ? args[outIdx + 1] : null;
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
  if (!file) {
    console.error("ERROR: usage: normalize-plan.mjs <plan.yaml> [--write] [--out <path>]");
    process.exit(2);
  }

  let plan;
  try {
    plan = loadPlan(file);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
  }

  const yaml = normalizePlanToYaml(plan);
  const target = out ?? (write ? file : null);
  if (target) {
    fs.writeFileSync(target, yaml, "utf-8");
    console.log(`OK: wrote normalized plan to ${target}`);
  } else {
    process.stdout.write(yaml);
  }
}

main(process.argv);
