#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const riskLevels = new Set(["low", "medium", "high", "critical"]);
const requiredTopLevelFields = [
  "version",
  "task",
  "goal",
  "success_criteria",
  "scope",
  "non_goals",
  "allowed_change_areas",
  "forbidden_change_areas",
  "files_to_inspect",
  "files_allowed_to_modify",
  "files_forbidden_to_modify",
  "expected_behavior",
  "current_behavior",
  "test_requirements",
  "verification_commands",
  "risk_level",
  "rollback_plan",
  "stop_conditions",
  "open_questions",
  "implementation_plan",
  "final_acceptance_checklist"
];

const vagueGoals = [
  /^improve\b/i,
  /^fix (it|bug|bugs|issue|issues)$/i,
  /^make (it|this) better$/i,
  /^update (the )?code$/i,
  /^clean up\b/i,
  /^refactor\b$/i
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, "..");
const args = parseArgs(process.argv.slice(2));
const root = args.root;
const sessionDir = resolve(root, ".agent", "session");
const defaultContractPath = join(sessionDir, "change-control-contract.json");
const contractPath = args.contract ? resolve(root, args.contract) : defaultContractPath;
const markdownPath = join(sessionDir, "change-control-contract.md");

if (!["init", "check", "summary", "drift"].includes(args.command)) {
  console.error("ERROR: Usage: node change-control.mjs <init|check|summary|drift> [--root <path>] [--contract <path>]");
  process.exit(2);
}

if (args.command === "init") {
  init();
} else if (args.command === "check") {
  const { errors } = loadAndValidate();
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  console.log("Change Control Contract check passed.");
} else if (args.command === "summary") {
  const { contract, errors } = loadAndValidate();
  printSummary(contract, errors);
  if (errors.length > 0) {
    process.exit(1);
  }
} else {
  const { contract, errors } = loadAndValidate();
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  const driftErrors = checkDrift(contract);
  if (driftErrors.length > 0) {
    printErrors(driftErrors);
    process.exit(1);
  }
  console.log("Change Control drift check passed.");
}

function parseArgs(argv) {
  let command = null;
  let rootValue = process.cwd();
  let contract = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      rootValue = requiredArg(argv, index, "--root");
      index += 1;
    } else if (arg === "--contract") {
      contract = requiredArg(argv, index, "--contract");
      index += 1;
    } else if (!command) {
      command = arg;
    } else {
      console.error(`ERROR: Unexpected argument ${arg}`);
      process.exit(2);
    }
  }

  return { command, root: resolve(rootValue), contract };
}

function requiredArg(argv, index, name) {
  const value = argv[index + 1];
  if (!value) {
    console.error(`ERROR: ${name} requires a path`);
    process.exit(2);
  }
  return value;
}

function init() {
  mkdirSync(sessionDir, { recursive: true });
  copyTemplateIfMissing("templates/change-control-contract.json", defaultContractPath);
  copyTemplateIfMissing("templates/change-control-contract.md", markdownPath);
  console.log(`Initialized Change Control Contract artifacts in ${sessionDir}`);
}

function copyTemplateIfMissing(templateRelativePath, targetPath) {
  if (existsSync(targetPath)) {
    return;
  }
  const template = readFileSync(join(skillRoot, templateRelativePath), "utf8");
  writeFileSync(targetPath, template.endsWith("\n") ? template : `${template}\n`);
}

function loadAndValidate() {
  if (!existsSync(contractPath)) {
    return { contract: null, errors: [`Missing ${relative(contractPath)}`] };
  }

  let contract;
  try {
    contract = JSON.parse(readFileSync(contractPath, "utf8"));
  } catch (error) {
    return { contract: null, errors: [`Invalid JSON in ${relative(contractPath)}: ${error.message}`] };
  }

  const errors = [];
  validateContract(contract, errors);
  return { contract, errors };
}

function validateContract(contract, errors) {
  if (!isPlainObject(contract)) {
    errors.push("contract must be a JSON object");
    return;
  }

  for (const field of requiredTopLevelFields) {
    if (!(field in contract)) {
      errors.push(`missing required field ${field}`);
    }
  }

  if (contract.version !== "1.0") {
    errors.push('version must be "1.0"');
  }

  validateTask(contract.task, errors);
  validateScope(contract.scope, errors);

  requireSpecificGoal(contract.goal, errors);
  requireNonEmptyArray(contract.success_criteria, "success_criteria", errors);
  requireNonEmptyArray(contract.non_goals, "non_goals", errors);
  requireNonEmptyArray(contract.allowed_change_areas, "allowed_change_areas", errors);
  requireNonEmptyArray(contract.forbidden_change_areas, "forbidden_change_areas", errors);
  requireStringArray(contract.files_to_inspect, "files_to_inspect", errors);
  requireStringArray(contract.files_allowed_to_modify, "files_allowed_to_modify", errors);
  requireStringArray(contract.files_forbidden_to_modify, "files_forbidden_to_modify", errors);
  requireNonEmptyString(contract.expected_behavior, "expected_behavior", errors);
  requireNonEmptyString(contract.current_behavior, "current_behavior", errors);
  requireNonEmptyArray(contract.test_requirements, "test_requirements", errors);
  requireNonEmptyArray(contract.verification_commands, "verification_commands", errors);
  requireNonEmptyArray(contract.stop_conditions, "stop_conditions", errors);
  requireStringArray(contract.open_questions, "open_questions", errors);
  requireNonEmptyArray(contract.implementation_plan, "implementation_plan", errors);
  requireNonEmptyArray(contract.final_acceptance_checklist, "final_acceptance_checklist", errors);

  if (!riskLevels.has(contract.risk_level)) {
    errors.push(`risk_level must be one of: ${Array.from(riskLevels).join(", ")}`);
  }

  if (["high", "critical"].includes(contract.risk_level)) {
    requireNonEmptyString(contract.rollback_plan, "rollback_plan", errors);
    if (Array.isArray(contract.verification_commands) && compact(contract.verification_commands).length < 2) {
      errors.push(`${contract.risk_level} risk contracts require at least two verification_commands`);
    }
    if (Array.isArray(contract.forbidden_change_areas) && compact(contract.forbidden_change_areas).length === 0) {
      errors.push(`${contract.risk_level} risk contracts require explicit forbidden_change_areas`);
    }
  } else if (typeof contract.rollback_plan !== "string") {
    errors.push("rollback_plan must be a string");
  }
}

function validateTask(task, errors) {
  if (!isPlainObject(task)) {
    errors.push("task must be an object");
    return;
  }
  requireNonEmptyString(task.title, "task.title", errors);
  requireNonEmptyString(task.request, "task.request", errors);
  requireNonEmptyString(task.problem_statement, "task.problem_statement", errors);
}

function validateScope(scope, errors) {
  if (!isPlainObject(scope)) {
    errors.push("scope must be an object");
    return;
  }
  requireNonEmptyString(scope.summary, "scope.summary", errors);
  requireNonEmptyArray(scope.in_scope, "scope.in_scope", errors);
  requireNonEmptyArray(scope.out_of_scope, "scope.out_of_scope", errors);
}

function requireSpecificGoal(goal, errors) {
  if (typeof goal !== "string" || goal.trim() === "") {
    errors.push("goal is required");
    return;
  }

  const trimmed = goal.trim();
  if (trimmed.length < 24 || vagueGoals.some((pattern) => pattern.test(trimmed))) {
    errors.push("goal is empty or vague; make it specific, observable, and testable");
  }
}

function requireNonEmptyString(value, field, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string`);
  }
}

function requireStringArray(value, field, errors) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    errors.push(`${field} must be an array of strings`);
  }
}

function requireNonEmptyArray(value, field, errors) {
  requireStringArray(value, field, errors);
  if (Array.isArray(value) && compact(value).length === 0) {
    errors.push(`${field} must contain at least one non-empty item`);
  }
}

function checkDrift(contract) {
  const errors = [];
  let statusOutput;
  try {
    statusOutput = execFileSync("git", ["status", "--short"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    return [`drift: failed to run git status --short: ${detail}`];
  }

  const modifiedFiles = parseStatus(statusOutput);
  const allowed = [...compact(contract.files_allowed_to_modify), ...compact(contract.allowed_change_areas)];
  const forbidden = [...compact(contract.files_forbidden_to_modify), ...compact(contract.forbidden_change_areas)];

  for (const file of modifiedFiles) {
    if (matchesAny(file, forbidden)) {
      errors.push(`drift: modified file matches forbidden area: ${file}`);
      continue;
    }
    if (!matchesAny(file, allowed)) {
      errors.push(`drift: modified file is outside allowed areas: ${file}`);
    }
  }

  return errors;
}

function parseStatus(output) {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const pathPart = line.slice(3).trim();
      if (pathPart.includes(" -> ")) {
        return pathPart.split(" -> ").at(-1).trim();
      }
      return pathPart;
    })
    .filter(Boolean);
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => pathMatches(file, pattern));
}

function pathMatches(file, pattern) {
  const cleanPattern = pattern.replace(/^\.?\//u, "").replace(/\/+$/u, "");
  const cleanFile = file.replace(/^\.?\//u, "");
  return cleanFile === cleanPattern || cleanFile.startsWith(`${cleanPattern}/`);
}

function printSummary(contract, errors) {
  console.log("# Change Control Contract Summary");
  console.log("");
  console.log(`- task: ${contract?.task?.title ?? ""}`);
  console.log(`- goal: ${contract?.goal ?? ""}`);
  console.log(`- risk level: ${contract?.risk_level ?? ""}`);
  console.log(`- allowed areas: ${formatList(contract?.allowed_change_areas)}`);
  console.log(`- forbidden areas: ${formatList(contract?.forbidden_change_areas)}`);
  console.log(`- verification commands: ${formatList(contract?.verification_commands)}`);
  console.log(`- stop conditions: ${formatList(contract?.stop_conditions)}`);
  console.log(`- open questions: ${formatList(contract?.open_questions)}`);
  console.log(`- blocking issues: ${errors.length}`);
}

function formatList(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return "none";
  }
  return compact(value).join("; ") || "none";
}

function compact(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim() !== "") : [];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function printErrors(errors) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
}

function relative(path) {
  return path.startsWith(root) ? path.slice(root.length + 1) : path;
}
