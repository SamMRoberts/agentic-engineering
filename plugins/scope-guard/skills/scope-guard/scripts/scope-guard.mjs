#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredTopLevelFields = [
  "version",
  "taskId",
  "userGoal",
  "scope",
  "design",
  "pseudocode",
  "implementation",
  "docs"
];

// A goal shorter than this is almost always a vague placeholder rather than a
// specific, observable, testable objective.
const MIN_GOAL_LENGTH = 24;

// A component whose responsibility names this many or more distinct action verbs
// is treated as bundling multiple responsibilities (e.g. "validates, persists,
// and emits metrics") and should be split into single-purpose components.
const MAX_RESPONSIBILITY_VERBS = 3;

const vagueGoals = [
  /^improve\b/i,
  /^fix (it|bug|bugs|issue|issues)$/i,
  /^make (it|this) better$/i,
  /^update (the )?code$/i,
  /^clean up\b/i,
  /^refactor\b$/i
];

// Action verbs used to detect components that bundle multiple responsibilities.
const actionVerbs = new Set([
  "validate",
  "persist",
  "save",
  "store",
  "retry",
  "format",
  "emit",
  "record",
  "parse",
  "send",
  "log",
  "transform",
  "handle",
  "coordinate",
  "fetch",
  "render",
  "authenticate",
  "authorize",
  "schedule",
  "notify",
  "map",
  "cache",
  "serialize",
  "talk",
  "query",
  "publish",
  "dispatch",
  "encrypt",
  "decrypt",
  "upload",
  "download"
]);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, "..");
const args = parseArgs(process.argv.slice(2));
const root = args.root;
const sessionDir = resolve(root, ".agent", "session");
const defaultPlanPath = join(sessionDir, "scope-guard-plan.json");
const planPath = args.plan ? resolve(root, args.plan) : defaultPlanPath;
const markdownPath = join(sessionDir, "scope-guard-plan.md");

if (!["init", "check", "summary"].includes(args.command)) {
  console.error("ERROR: Usage: node scope-guard.mjs <init|check|summary> [--root <path>] [--plan <path>]");
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
  console.log("Scope Guard plan check passed.");
} else {
  const { plan, errors } = loadAndValidate();
  printSummary(plan, errors);
  if (errors.length > 0) {
    process.exit(1);
  }
}

function parseArgs(argv) {
  let command = null;
  let rootValue = process.cwd();
  let plan = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      rootValue = requiredArg(argv, index, "--root");
      index += 1;
    } else if (arg === "--plan") {
      plan = requiredArg(argv, index, "--plan");
      index += 1;
    } else if (!command) {
      command = arg;
    } else {
      console.error(`ERROR: Unexpected argument ${arg}`);
      process.exit(2);
    }
  }

  return { command, root: resolve(rootValue), plan };
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
  copyTemplateIfMissing("templates/scope-guard-plan.json", defaultPlanPath);
  copyTemplateIfMissing("templates/scope-guard-plan.md", markdownPath);
  console.log(`Initialized Scope Guard plan artifacts in ${sessionDir}`);
}

function copyTemplateIfMissing(templateRelativePath, targetPath) {
  if (existsSync(targetPath)) {
    return;
  }
  const template = readFileSync(join(skillRoot, templateRelativePath), "utf8");
  writeFileSync(targetPath, template.endsWith("\n") ? template : `${template}\n`);
}

function loadAndValidate() {
  if (!existsSync(planPath)) {
    return { plan: null, errors: [`Missing ${relative(planPath)}`] };
  }

  let plan;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (error) {
    return { plan: null, errors: [`Invalid JSON in ${relative(planPath)}: ${error.message}`] };
  }

  const errors = [];
  validatePlan(plan, errors);
  return { plan, errors };
}

function validatePlan(plan, errors) {
  if (!isPlainObject(plan)) {
    errors.push("plan must be a JSON object");
    return;
  }

  for (const field of requiredTopLevelFields) {
    if (!(field in plan)) {
      errors.push(`missing required field ${field}`);
    }
  }

  if (plan.version !== "1.0") {
    errors.push('version must be "1.0"');
  }

  requireNonEmptyString(plan.taskId, "taskId", errors);
  requireSpecificGoal(plan.userGoal, errors);

  validateScope(plan.scope, errors);
  validateDesign(plan.design, errors);
  validatePseudocode(plan.pseudocode, errors);
  validateImplementation(plan.implementation, errors);
  validateDocs(plan.docs, errors);

  enforceLifecycleGates(plan, errors);
}

function validateScope(scope, errors) {
  if (!isPlainObject(scope)) {
    errors.push("scope must be an object");
    return;
  }
  requireNonEmptyArray(scope.inScope, "scope.inScope", errors);
  requireNonEmptyArray(scope.outOfScope, "scope.outOfScope", errors);
  requireStringArray(scope.assumptions, "scope.assumptions", errors);
  requireStringArray(scope.openQuestions, "scope.openQuestions", errors);
}

function validateDesign(design, errors) {
  if (!isPlainObject(design)) {
    errors.push("design must be an object");
    return;
  }
  requireStringArray(design.extensionPoints, "design.extensionPoints", errors);
  requireStringArray(design.rejectedAlternatives, "design.rejectedAlternatives", errors);

  if (!Array.isArray(design.components)) {
    errors.push("design.components must be an array");
    return;
  }
  if (design.components.length === 0) {
    errors.push("design.components must contain at least one component");
    return;
  }

  design.components.forEach((component, index) => {
    validateComponent(component, index, errors);
  });
}

function validateComponent(component, index, errors) {
  const label = `design.components[${index}]`;
  if (!isPlainObject(component)) {
    errors.push(`${label} must be an object`);
    return;
  }
  requireNonEmptyString(component.name, `${label}.name`, errors);
  requireNonEmptyString(component.responsibility, `${label}.responsibility`, errors);
  requireStringArray(component.dependencies, `${label}.dependencies`, errors);
  requireStringArray(component.extensionPoints, `${label}.extensionPoints`, errors);

  if (typeof component.responsibility === "string" && detectBundledResponsibility(component.responsibility)) {
    const name = typeof component.name === "string" && component.name.trim() ? component.name.trim() : label;
    errors.push(
      `${name} appears to have multiple responsibilities; split it into single-purpose components`
    );
  }
}

function validatePseudocode(pseudocode, errors) {
  if (!isPlainObject(pseudocode)) {
    errors.push("pseudocode must be an object");
    return;
  }
  requireNonEmptyString(pseudocode.draft, "pseudocode.draft", errors);
  requireStringArray(pseudocode.reviewFindings, "pseudocode.reviewFindings", errors);
  if (typeof pseudocode.approved !== "boolean") {
    errors.push("pseudocode.approved must be a boolean");
  }
}

function validateImplementation(implementation, errors) {
  if (!isPlainObject(implementation)) {
    errors.push("implementation must be an object");
    return;
  }
  requireStringArray(implementation.changedFiles, "implementation.changedFiles", errors);
  requireStringArray(implementation.testsAddedOrUpdated, "implementation.testsAddedOrUpdated", errors);
  requireStringArray(implementation.knownRisks, "implementation.knownRisks", errors);
}

function validateDocs(docs, errors) {
  if (!isPlainObject(docs)) {
    errors.push("docs must be an object");
    return;
  }
  if (typeof docs.designDocUpdated !== "boolean") {
    errors.push("docs.designDocUpdated must be a boolean");
  }
  if (typeof docs.diagramsUpdated !== "boolean") {
    errors.push("docs.diagramsUpdated must be a boolean");
  }
  requireStringArray(docs.docChanges, "docs.docChanges", errors);
}

// Lifecycle gates: enforce the Scope -> Design -> Pseudocode -> Review -> Implement -> Docs order.
function enforceLifecycleGates(plan, errors) {
  const implementation = isPlainObject(plan.implementation) ? plan.implementation : {};
  const pseudocode = isPlainObject(plan.pseudocode) ? plan.pseudocode : {};
  const docs = isPlainObject(plan.docs) ? plan.docs : {};

  const implementationStarted = compact(implementation.changedFiles).length > 0;
  if (!implementationStarted) {
    return;
  }

  // Pseudocode review gate.
  if (compact(pseudocode.draft ? [pseudocode.draft] : []).length === 0) {
    errors.push("implementation has changed files but pseudocode.draft is empty; write pseudocode before implementing");
  }
  if (pseudocode.approved !== true) {
    errors.push(
      "implementation has changed files but pseudocode.approved is false; review and approve pseudocode before implementing"
    );
  }

  // Tests gate.
  if (compact(implementation.testsAddedOrUpdated).length === 0) {
    errors.push(
      "implementation has changed files but implementation.testsAddedOrUpdated is empty; add or update tests for the change"
    );
  }

  // Documentation gate.
  if (docs.designDocUpdated !== true) {
    errors.push("implementation has changed files but docs.designDocUpdated is false; update the design doc");
  }
  if (docs.diagramsUpdated !== true) {
    errors.push("implementation has changed files but docs.diagramsUpdated is false; update the diagrams");
  }
  if (compact(docs.docChanges).length === 0) {
    errors.push(
      "implementation has changed files but docs.docChanges is empty; record the design doc and diagram delta"
    );
  }
}

function detectBundledResponsibility(responsibility) {
  const clauses = responsibility
    .toLowerCase()
    .split(/,|;|\band\b|&/u)
    .map((clause) => clause.trim())
    .filter(Boolean);

  const verbs = new Set();
  for (const clause of clauses) {
    for (const word of clause.split(/\s+/u)) {
      const base = normalizeVerb(word.replace(/[^a-z]/gu, ""));
      if (actionVerbs.has(base)) {
        verbs.add(base);
        break;
      }
    }
  }
  return verbs.size >= MAX_RESPONSIBILITY_VERBS;
}

function normalizeVerb(word) {
  if (word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith("es") && actionVerbs.has(word.slice(0, -2))) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && actionVerbs.has(word.slice(0, -1))) {
    return word.slice(0, -1);
  }
  return word;
}

function requireSpecificGoal(goal, errors) {
  if (typeof goal !== "string" || goal.trim() === "") {
    errors.push("userGoal is required");
    return;
  }

  const trimmed = goal.trim();
  if (trimmed.length < MIN_GOAL_LENGTH || vagueGoals.some((pattern) => pattern.test(trimmed))) {
    errors.push("userGoal is empty or vague; make it specific, observable, and testable");
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

function printSummary(plan, errors) {
  console.log("# Scope Guard Plan Summary");
  console.log("");
  console.log(`- task id: ${plan?.taskId ?? ""}`);
  console.log(`- goal: ${plan?.userGoal ?? ""}`);
  console.log(`- in scope: ${formatList(plan?.scope?.inScope)}`);
  console.log(`- out of scope: ${formatList(plan?.scope?.outOfScope)}`);
  console.log(`- components: ${formatComponents(plan?.design?.components)}`);
  console.log(`- extension points: ${formatList(plan?.design?.extensionPoints)}`);
  console.log(`- pseudocode approved: ${plan?.pseudocode?.approved === true ? "yes" : "no"}`);
  console.log(`- changed files: ${formatList(plan?.implementation?.changedFiles)}`);
  console.log(`- tests added/updated: ${formatList(plan?.implementation?.testsAddedOrUpdated)}`);
  console.log(`- docs updated: ${docsUpdated(plan?.docs)}`);
  console.log(`- doc changes: ${formatList(plan?.docs?.docChanges)}`);
  console.log(`- open questions: ${formatList(plan?.scope?.openQuestions)}`);
  console.log(`- blocking issues: ${errors.length}`);
}

function docsUpdated(docs) {
  if (!isPlainObject(docs)) {
    return "no";
  }
  return docs.designDocUpdated === true && docs.diagramsUpdated === true ? "yes" : "no";
}

function formatComponents(components) {
  if (!Array.isArray(components) || components.length === 0) {
    return "none";
  }
  return components
    .map((component) => (isPlainObject(component) && typeof component.name === "string" ? component.name : ""))
    .filter(Boolean)
    .join("; ") || "none";
}

function formatList(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return "none";
  }
  return compact(value).join("; ") || "none";
}

function compact(value) {
  if (typeof value === "string") {
    return value.trim() === "" ? [] : [value];
  }
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
