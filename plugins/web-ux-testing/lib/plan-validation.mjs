import fs from "node:fs";
import path from "node:path";

import { lintPlan } from "./plan-lint.mjs";
import { validateAgainstSchema } from "./schema-utils.mjs";
import { readYamlFile } from "./yaml-utils.mjs";

export function validatePlan(plan) {
  const schemaErrors = validateAgainstSchema(plan, "web-ux-test-plan.schema.yaml");
  const lintResult = lintPlan(plan);

  return {
    errors: [...schemaErrors, ...lintResult.errors],
    warnings: lintResult.warnings
  };
}

export function validatePlanFile(planPath) {
  const absolutePlanPath = path.resolve(planPath);
  const plan = readYamlFile(absolutePlanPath);
  return validatePlan(plan);
}

export function printValidationResult(result) {
  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }

  for (const error of result.errors) {
    console.error(`ERROR: ${error}`);
  }
}

export function runValidatePlanCli({ usage } = {}) {
  const planPath = process.argv[2];

  if (!planPath) {
    console.error(usage ?? "Usage: node <skill>/scripts/validate-plan.mjs <path-to-plan.yaml>");
    process.exit(2);
  }

  if (!fs.existsSync(planPath)) {
    console.error(`ERROR: Plan file not found: ${planPath}`);
    process.exit(2);
  }

  const result = validatePlanFile(planPath);
  printValidationResult(result);

  if (result.errors.length > 0) {
    process.exit(1);
  }

  console.log("Plan validation passed.");
}
