#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";

const forbiddenCredentialKeys = [
  "password",
  "secret",
  "token",
  "api_key",
  "apikey",
  "credential",
  "credentials",
  "session_cookie",
  "cookie"
];

const vaguePhrases = [
  "verify it works",
  "looks good",
  "check page",
  "test functionality",
  "make sure it works"
];

const pixelCoordinatePattern = /\b(x|y)\s*=\s*\d+|\bclick\s+at\s+\d+|\bcoordinates?\b/i;

function readYaml(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return YAML.parse(raw);
}

function walk(value, visitor, currentPath = []) {
  visitor(value, currentPath);

  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, [...currentPath, index]));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => {
      walk(child, visitor, [...currentPath, key]);
    });
  }
}

function collectScenarios(plan) {
  const scenarios = [];

  for (const area of plan.test_areas ?? []) {
    for (const scenario of area.scenarios ?? []) {
      scenarios.push({ area: area.name, scenario });
    }
  }

  return scenarios;
}

function validatePlan(plan) {
  const errors = [];
  const warnings = [];
  const scenarioIds = new Set();

  if (!plan.name) errors.push("Missing required name.");
  if (!plan.version) errors.push("Missing required version.");
  if (!plan.runner) errors.push("Missing required runner section.");
  if (!plan.scope) errors.push("Missing required scope section.");
  if (!plan.auth) errors.push("Missing required auth section.");
  if (!plan.rules) errors.push("Missing required rules section.");
  if (!plan.severity) errors.push("Missing required severity section.");
  if (!Array.isArray(plan.test_areas)) errors.push("Missing required test_areas array.");

  if (!plan.scope?.exclude || plan.scope.exclude.length === 0) {
    warnings.push("Missing scope.exclude. Add explicit out-of-scope or unsafe actions.");
  }

  if (plan.auth?.required && !plan.auth?.strategy) {
    errors.push("Auth is required but no auth.strategy is defined.");
  }

  walk(plan, (value, currentPath) => {
    const key = String(currentPath.at(-1) ?? "").toLowerCase();

    if (forbiddenCredentialKeys.includes(key)) {
      errors.push(`Forbidden credential-like key found at ${currentPath.join(".")}`);
    }

    if (typeof value === "string") {
      const normalized = value.toLowerCase();

      if (vaguePhrases.some((phrase) => normalized.includes(phrase))) {
        warnings.push(`Vague test instruction found at ${currentPath.join(".")}: "${value}"`);
      }

      if (pixelCoordinatePattern.test(value)) {
        warnings.push(`Pixel-coordinate-style instruction found at ${currentPath.join(".")}: "${value}"`);
      }
    }
  });

  const scenarios = collectScenarios(plan);

  for (const { area, scenario } of scenarios) {
    if (!scenario.id) {
      errors.push(`Scenario in area "${area}" is missing id.`);
      continue;
    }

    if (scenarioIds.has(scenario.id)) {
      errors.push(`Duplicate scenario id: ${scenario.id}`);
    }

    scenarioIds.add(scenario.id);

    if (!scenario.title) errors.push(`Scenario ${scenario.id} is missing title.`);
    if (!scenario.priority) errors.push(`Scenario ${scenario.id} is missing priority.`);
    if (!scenario.goal) errors.push(`Scenario ${scenario.id} is missing goal.`);
    if (!scenario.entry?.length) warnings.push(`Scenario ${scenario.id} is missing entry steps.`);
    if (!scenario.checks?.length) errors.push(`Scenario ${scenario.id} is missing checks.`);
    if (!scenario.issue_indicators?.length) errors.push(`Scenario ${scenario.id} is missing issue_indicators.`);
    if (!scenario.evidence?.length) warnings.push(`Scenario ${scenario.id} is missing evidence requirements.`);
  }

  const serialized = JSON.stringify(plan).toLowerCase();

  if (!serialized.includes("accessibility") && !serialized.includes("keyboard")) {
    warnings.push("Plan appears to be missing accessibility or keyboard coverage.");
  }

  if (!serialized.includes("console_errors")) {
    warnings.push("Plan appears to be missing console error evidence capture.");
  }

  if (!serialized.includes("network_failures")) {
    warnings.push("Plan appears to be missing network failure evidence capture.");
  }

  if (serialized.includes("delete") || serialized.includes("remove") || serialized.includes("destroy")) {
    if (!plan.rules?.avoid_destructive_actions) {
      warnings.push("Plan includes destructive action wording but avoid_destructive_actions is not enabled.");
    }
  }

  return { errors, warnings };
}

const planPath = process.argv[2];

if (!planPath) {
  console.error("Usage: node scripts/validate-plan.mjs <path-to-plan.yaml>");
  process.exit(2);
}

const absolutePlanPath = path.resolve(planPath);
const plan = readYaml(absolutePlanPath);
const result = validatePlan(plan);

for (const warning of result.warnings) {
  console.warn(`WARN: ${warning}`);
}

for (const error of result.errors) {
  console.error(`ERROR: ${error}`);
}

if (result.errors.length > 0) {
  process.exit(1);
}

console.log("Plan validation passed.");
