#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { isCliEntry } from "./lib/cli-utils.mjs";
import { lintPlan } from "./lib/plan-lint.mjs";
import { validateAgainstSchema } from "./lib/schema-utils.mjs";
import { readYamlFile } from "./lib/yaml-utils.mjs";

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

function printResult(result) {
  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }

  for (const error of result.errors) {
    console.error(`ERROR: ${error}`);
  }
}

function runCli() {
  const planPath = process.argv[2];

  if (!planPath) {
    console.error("Usage: node scripts/validate-plan.mjs <path-to-plan.yaml>");
    process.exit(2);
  }

  if (!fs.existsSync(planPath)) {
    console.error(`ERROR: Plan file not found: ${planPath}`);
    process.exit(2);
  }

  const result = validatePlanFile(planPath);
  printResult(result);

  if (result.errors.length > 0) {
    process.exit(1);
  }

  console.log("Plan validation passed.");
}

const isCli = isCliEntry(import.meta.url);

if (isCli) {
  runCli();
}
