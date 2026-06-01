#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const categories = new Set([
  "repo_structure",
  "existing_behavior",
  "test_behavior",
  "runtime_behavior",
  "tooling_behavior",
  "parser_behavior",
  "ux_behavior",
  "data_model",
  "api_contract",
  "security_or_permissions",
  "backwards_compatibility",
  "deployment_or_ci"
]);

const risks = new Set(["low", "medium", "high", "critical"]);
const statuses = new Set(["verified", "disproven", "unknown"]);
const results = new Set(["passed", "failed", "not_run"]);
const requiredAssumptionFields = [
  "id",
  "statement",
  "category",
  "risk_level",
  "verification_method",
  "evidence",
  "status",
  "files_checked",
  "commands_run",
  "impact_if_wrong",
  "decision"
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, "..");
const { command, root } = parseArgs(process.argv.slice(2));
const sessionDir = resolve(root, ".agent", "session");
const gatePath = join(sessionDir, "assumption-gate.json");
const assumptionsPath = join(sessionDir, "assumptions.md");

if (!["init", "check", "summary"].includes(command)) {
  console.error("ERROR: Usage: node assumption-gate.mjs <init|check|summary> [--root <path>]");
  process.exit(2);
}

if (command === "init") {
  init();
} else if (command === "check") {
  const { errors } = loadAndValidate();
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }
  console.log("Assumption Gate check passed.");
} else {
  const { gate, errors } = loadAndValidate();
  printSummary(gate, errors);
  if (errors.length > 0) {
    process.exit(1);
  }
}

function parseArgs(args) {
  let parsedCommand = null;
  let parsedRoot = process.cwd();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--root") {
      const value = args[index + 1];
      if (!value) {
        console.error("ERROR: --root requires a path");
        process.exit(2);
      }
      parsedRoot = resolve(value);
      index += 1;
    } else if (!parsedCommand) {
      parsedCommand = arg;
    } else {
      console.error(`ERROR: Unexpected argument ${arg}`);
      process.exit(2);
    }
  }

  return { command: parsedCommand, root: parsedRoot };
}

function init() {
  mkdirSync(sessionDir, { recursive: true });
  copyTemplateIfMissing("templates/assumption-gate.json", gatePath);
  copyTemplateIfMissing("templates/assumptions.md", assumptionsPath);
  console.log(`Initialized assumption gate artifacts in ${sessionDir}`);
}

function copyTemplateIfMissing(templateRelativePath, targetPath) {
  if (existsSync(targetPath)) {
    return;
  }
  const template = readFileSync(join(skillRoot, templateRelativePath), "utf8");
  writeFileSync(targetPath, template.endsWith("\n") ? template : `${template}\n`);
}

function loadAndValidate() {
  const errors = [];
  if (!existsSync(gatePath)) {
    return { gate: null, errors: [`Missing ${relative(gatePath)}`] };
  }

  let gate;
  try {
    gate = JSON.parse(readFileSync(gatePath, "utf8"));
  } catch (error) {
    return { gate: null, errors: [`Invalid JSON in ${relative(gatePath)}: ${error.message}`] };
  }

  validateGate(gate, errors);
  return { gate, errors };
}

function validateGate(gate, errors) {
  if (!isPlainObject(gate)) {
    errors.push("Gate must be a JSON object");
    return;
  }

  if (gate.version !== "1.0") {
    errors.push('version must be "1.0"');
  }

  validateTask(gate.task, errors);
  validateAssumptions(gate.assumptions, errors);
  validateFinalVerification(gate.final_verification, errors);
}

function validateTask(task, errors) {
  if (!isPlainObject(task)) {
    errors.push("task must be an object");
    return;
  }
  for (const field of ["title", "goal", "scope"]) {
    if (typeof task[field] !== "string") {
      errors.push(`task.${field} must be a string`);
    }
  }
  if (!isStringArray(task.non_goals)) {
    errors.push("task.non_goals must be an array of strings");
  }
}

function validateAssumptions(assumptions, errors) {
  if (!Array.isArray(assumptions)) {
    errors.push("assumptions must be an array");
    return;
  }
  if (assumptions.length === 0) {
    errors.push("assumptions must contain at least one assumption");
  }

  assumptions.forEach((assumption, index) => {
    const label = assumption?.id || `assumptions[${index}]`;
    if (!isPlainObject(assumption)) {
      errors.push(`${label} must be an object`);
      return;
    }

    for (const field of requiredAssumptionFields) {
      if (!(field in assumption)) {
        errors.push(`${label} missing required field ${field}`);
      }
    }

    for (const field of ["id", "statement", "verification_method", "impact_if_wrong", "decision"]) {
      if (typeof assumption[field] !== "string" || assumption[field].trim() === "") {
        errors.push(`${label}.${field} must be a non-empty string`);
      }
    }

    if (!categories.has(assumption.category)) {
      errors.push(`${label}.category has invalid value ${JSON.stringify(assumption.category)}`);
    }
    if (!risks.has(assumption.risk_level)) {
      errors.push(`${label}.risk_level has invalid value ${JSON.stringify(assumption.risk_level)}`);
    }
    if (!statuses.has(assumption.status)) {
      errors.push(`${label}.status has invalid value ${JSON.stringify(assumption.status)}`);
    }
    if (!isStringArray(assumption.evidence)) {
      errors.push(`${label}.evidence must be an array of strings`);
    }
    if (!isStringArray(assumption.files_checked)) {
      errors.push(`${label}.files_checked must be an array of strings`);
    }
    if (!isStringArray(assumption.commands_run)) {
      errors.push(`${label}.commands_run must be an array of strings`);
    }

    if (
      ["high", "critical"].includes(assumption.risk_level) &&
      assumption.status === "unknown"
    ) {
      errors.push(`${label} is ${assumption.risk_level} risk and still unknown`);
    }

    if (
      assumption.status === "verified" &&
      (!Array.isArray(assumption.evidence) || !assumption.evidence.some((item) => item.trim() !== ""))
    ) {
      errors.push(`${label} is verified but has no evidence`);
    }
  });
}

function validateFinalVerification(finalVerification, errors) {
  if (!isPlainObject(finalVerification)) {
    errors.push("final_verification must be an object");
    return;
  }
  if (!isStringArray(finalVerification.commands_run)) {
    errors.push("final_verification.commands_run must be an array of strings");
  }
  if (!isStringArray(finalVerification.tests_run)) {
    errors.push("final_verification.tests_run must be an array of strings");
  }
  if (!results.has(finalVerification.result)) {
    errors.push(`final_verification.result has invalid value ${JSON.stringify(finalVerification.result)}`);
  }
  if (typeof finalVerification.notes !== "string") {
    errors.push("final_verification.notes must be a string");
  }
}

function printSummary(gate, errors) {
  const assumptions = Array.isArray(gate?.assumptions) ? gate.assumptions : [];
  const verified = assumptions.filter((item) => item.status === "verified").length;
  const unknown = assumptions.filter((item) => item.status === "unknown").length;
  const disproven = assumptions.filter((item) => item.status === "disproven").length;
  const highCritical = assumptions.filter((item) => ["high", "critical"].includes(item.risk_level)).length;

  console.log("# Assumption Gate Summary");
  console.log("");
  console.log(`- total assumptions: ${assumptions.length}`);
  console.log(`- verified count: ${verified}`);
  console.log(`- unknown count: ${unknown}`);
  console.log(`- disproven count: ${disproven}`);
  console.log(`- high/critical count: ${highCritical}`);
  console.log(`- blocking issues: ${errors.length}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function relative(path) {
  return path.startsWith(root) ? path.slice(root.length + 1) : path;
}
