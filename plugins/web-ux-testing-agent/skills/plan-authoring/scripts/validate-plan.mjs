#!/usr/bin/env node
// Validate a web UX test plan against the JSON Schemas and semantic lint rules.
// Usage: node validate-plan.mjs <plan.yaml> [--json]
import { loadPlan } from "../../../lib/plan-loader.mjs";
import { validatePlan } from "../../../lib/plan-validator.mjs";

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("ERROR: usage: validate-plan.mjs <plan.yaml> [--json]");
    process.exit(2);
  }

  let plan;
  try {
    plan = loadPlan(file);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
  }

  const result = validatePlan(plan);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const w of result.warnings) console.error(`WARN: ${w}`);
    for (const e of result.errors) console.error(`ERROR: ${e}`);
    if (result.errors.length === 0) {
      console.log(`OK: ${file} is valid (${result.warnings.length} warning(s))`);
    }
  }
  process.exit(result.errors.length > 0 ? 1 : 0);
}

main(process.argv);
