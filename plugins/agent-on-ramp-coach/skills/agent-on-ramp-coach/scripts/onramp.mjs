#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const confidenceLevels = new Set([
  "level_0_explain_only",
  "level_1_analyze_only",
  "level_2_plan_only",
  "level_3_propose_patch",
  "level_4_make_small_scoped_change",
  "level_5_agent_executes_bounded_task"
]);

const editLevels = new Set([
  "level_4_make_small_scoped_change",
  "level_5_agent_executes_bounded_task"
]);

const workflowTypes = new Set([
  "explain_code",
  "summarize_file",
  "summarize_pr",
  "review_diff",
  "find_risky_areas",
  "suggest_tests",
  "create_debug_plan",
  "explain_test_failure",
  "map_change_impact",
  "draft_handoff_notes",
  "create_small_refactor_plan",
  "generate_readme_update_plan",
  "identify_missing_docs",
  "review_agent_output"
]);

const riskLevels = new Set(["low", "medium", "high", "critical"]);
const finalStatuses = new Set([
  "not_started",
  "read_only_complete",
  "plan_complete",
  "patch_proposed",
  "changes_applied",
  "verification_passed",
  "verification_failed",
  "blocked"
]);

const requiredFields = [
  "version",
  "task",
  "workflow_type",
  "risk_level",
  "recommended_confidence_level",
  "selected_confidence_level",
  "explicit_edit_approval",
  "allowed_actions",
  "forbidden_actions",
  "files_inspected",
  "commands_run",
  "files_modified",
  "agent_findings",
  "agent_recommendations",
  "human_review_items",
  "verification_commands",
  "final_status",
  "next_suggested_step"
];

const stringArrayFields = [
  "allowed_actions",
  "forbidden_actions",
  "files_inspected",
  "commands_run",
  "files_modified",
  "agent_findings",
  "agent_recommendations",
  "human_review_items",
  "verification_commands"
];

const args = parseArgs(process.argv.slice(2));
const sessionDir = resolve(args.root, ".agent", "session");
const defaultSessionPath = join(sessionDir, "onramp-session.json");
const sessionPath = args.session ? resolvePath(args.root, args.session) : defaultSessionPath;
const sessionMarkdownPath = join(sessionDir, "onramp-session.md");
const snapshotPath = args.snapshot
  ? resolvePath(args.root, args.snapshot)
  : join(sessionDir, "onramp-git-snapshot.json");

if (!["init", "check", "summary", "snapshot", "no-edits"].includes(args.command)) {
  usage();
}

try {
  if (args.command === "init") {
    initSession();
  } else if (args.command === "check") {
    commandCheck();
  } else if (args.command === "summary") {
    commandSummary();
  } else if (args.command === "snapshot") {
    commandSnapshot();
  } else {
    commandNoEdits();
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(2);
}

function parseArgs(argv) {
  let command = null;
  let root = process.cwd();
  let session = null;
  let snapshot = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      root = requiredArg(argv, index, "--root");
      index += 1;
    } else if (arg === "--session") {
      session = requiredArg(argv, index, "--session");
      index += 1;
    } else if (arg === "--snapshot") {
      snapshot = requiredArg(argv, index, "--snapshot");
      index += 1;
    } else if (!command) {
      command = arg;
    } else {
      console.error(`ERROR: Unexpected argument ${arg}`);
      usage();
    }
  }

  return { command, root: resolve(root), session, snapshot };
}

function requiredArg(argv, index, name) {
  const value = argv[index + 1];
  if (!value) {
    console.error(`ERROR: ${name} requires a path`);
    process.exit(2);
  }
  return value;
}

function resolvePath(root, value) {
  return isAbsolute(value) ? value : resolve(root, value);
}

function usage() {
  console.error(
    "ERROR: Usage: node onramp.mjs <init|check|summary|snapshot|no-edits> " +
      "[--root <path>] [--session <path>] [--snapshot <path>]"
  );
  process.exit(2);
}

function initSession() {
  mkdirSync(sessionDir, { recursive: true });

  if (!existsSync(defaultSessionPath)) {
    writeJson(defaultSessionPath, defaultSession());
  }

  if (!existsSync(sessionMarkdownPath)) {
    writeFileSync(sessionMarkdownPath, sessionMarkdown(defaultSession()), "utf8");
  }

  console.log(`Initialized Agent On-Ramp session artifacts in ${relative(sessionDir)}`);
}

function commandCheck() {
  const { session, errors } = loadAndValidateSession();
  if (session && existsSync(snapshotPath)) {
    errors.push(...validateGitBoundary(session));
  }
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  console.log("Agent On-Ramp session check passed.");
}

function commandSummary() {
  const { session, errors } = loadAndValidateSession();
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }

  console.log(`# ${session.task.title || "Agent On-Ramp Session"}`);
  console.log("");
  console.log(`- task: ${session.task.summary || session.task.user_request || "not specified"}`);
  console.log(`- workflow type: ${session.workflow_type}`);
  console.log(`- risk level: ${session.risk_level}`);
  console.log(`- recommended confidence level: ${session.recommended_confidence_level}`);
  console.log(`- selected confidence level: ${session.selected_confidence_level}`);
  console.log(`- files inspected: ${formatList(session.files_inspected)}`);
  console.log(`- commands run: ${formatList(session.commands_run)}`);
  console.log(`- files modified: ${formatList(session.files_modified)}`);
  console.log(`- findings: ${formatList(session.agent_findings)}`);
  console.log(`- recommendations: ${formatList(session.agent_recommendations)}`);
  console.log(`- human review items: ${formatList(session.human_review_items)}`);
  console.log(`- next suggested step: ${session.next_suggested_step || "not specified"}`);
}

function commandSnapshot() {
  mkdirSync(dirname(snapshotPath), { recursive: true });
  const snapshot = {
    current_branch: git(["rev-parse", "--abbrev-ref", "HEAD"]).ok
      ? git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout
      : null,
    current_commit: git(["rev-parse", "HEAD"]).ok ? git(["rev-parse", "HEAD"]).stdout : null,
    git_status_short: gitStatusLines(),
    timestamp: new Date().toISOString()
  };
  writeJson(snapshotPath, snapshot);
  console.log(`Wrote git snapshot to ${relative(snapshotPath)}`);
}

function commandNoEdits() {
  const { session, errors } = loadAndValidateSession({ includeBoundary: false });
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }

  if (allowsEdits(session.selected_confidence_level)) {
    console.log("No-edit check skipped because the selected confidence level allows approved edits.");
    return;
  }

  const snapshot = loadSnapshot();
  const current = gitStatusLines();
  const changed = changedSinceSnapshot(snapshot.git_status_short, current);
  const outsideSession = changed.filter((line) => !isSessionPath(statusPath(line)));
  if (outsideSession.length > 0) {
    printErrors(outsideSession.map((line) => `read-only level changed file outside .agent/session: ${line}`));
    process.exit(1);
  }

  console.log("No-edit check passed.");
}

function defaultSession() {
  return {
    version: "1.0",
    task: {
      title: "",
      user_request: "",
      summary: ""
    },
    workflow_type: "explain_code",
    risk_level: "low",
    recommended_confidence_level: "level_1_analyze_only",
    selected_confidence_level: "level_1_analyze_only",
    explicit_edit_approval: false,
    allowed_actions: ["Read relevant files", "Summarize findings"],
    forbidden_actions: ["Modify files outside .agent/session/", "Run destructive commands"],
    files_inspected: [],
    commands_run: [],
    files_modified: [],
    agent_findings: [],
    agent_recommendations: [],
    human_review_items: [],
    verification_commands: [],
    final_status: "not_started",
    next_suggested_step: ""
  };
}

function sessionMarkdown(session) {
  return `# Agent On-Ramp Session

## Task
${session.task.title}

## Selected Workflow
${session.workflow_type}

## Risk Level
${session.risk_level}

## Recommended Confidence Level
${session.recommended_confidence_level}

## Selected Confidence Level
${session.selected_confidence_level}

## Allowed Actions
${markdownList(session.allowed_actions)}

## Forbidden Actions
${markdownList(session.forbidden_actions)}

## Files Inspected
${markdownList(session.files_inspected)}

## Commands Run
${markdownList(session.commands_run)}

## Files Modified
${markdownList(session.files_modified)}

## Findings
${markdownList(session.agent_findings)}

## Recommendations
${markdownList(session.agent_recommendations)}

## Human Review Items
${markdownList(session.human_review_items)}

## Verification
${markdownList(session.verification_commands)}

## Final Status
${session.final_status}

## Next Suggested Step
${session.next_suggested_step}
`;
}

function loadAndValidateSession() {
  const errors = [];
  if (!existsSync(sessionPath)) {
    return { session: null, errors: [`missing ${relative(sessionPath)}; run init first`] };
  }

  let session;
  try {
    session = JSON.parse(readFileSync(sessionPath, "utf8"));
  } catch (error) {
    return { session: null, errors: [`invalid JSON in ${relative(sessionPath)}: ${error.message}`] };
  }

  validateSession(session, errors);
  return { session, errors };
}

function validateSession(session, errors) {
  if (!isPlainObject(session)) {
    errors.push("session must be a JSON object");
    return;
  }

  for (const field of requiredFields) {
    if (!(field in session)) {
      errors.push(`missing required field ${field}`);
    }
  }

  if (session.version !== "1.0") {
    errors.push('version must be "1.0"');
  }

  validateTask(session.task, errors);
  validateEnum(session.workflow_type, workflowTypes, "workflow_type", errors);
  validateEnum(session.risk_level, riskLevels, "risk_level", errors);
  validateEnum(
    session.recommended_confidence_level,
    confidenceLevels,
    "recommended_confidence_level",
    errors
  );
  validateEnum(session.selected_confidence_level, confidenceLevels, "selected_confidence_level", errors);
  validateEnum(session.final_status, finalStatuses, "final_status", errors);

  if (typeof session.explicit_edit_approval !== "boolean") {
    errors.push("explicit_edit_approval must be a boolean");
  }

  for (const field of stringArrayFields) {
    if (!isStringArray(session[field])) {
      errors.push(`${field} must be an array of strings`);
    }
  }

  if (isStringArray(session.allowed_actions) && compact(session.allowed_actions).length === 0) {
    errors.push("allowed_actions must contain at least one action");
  }
  if (isStringArray(session.forbidden_actions) && compact(session.forbidden_actions).length === 0) {
    errors.push("forbidden_actions must contain at least one action");
  }
  if (typeof session.next_suggested_step !== "string") {
    errors.push("next_suggested_step must be a string");
  }

  const filesModified = isStringArray(session.files_modified) ? compact(session.files_modified) : [];
  if (!allowsEdits(session.selected_confidence_level) && filesModified.length > 0) {
    errors.push("files_modified must be empty when the selected confidence level does not allow edits");
  }

  if (allowsEdits(session.selected_confidence_level)) {
    const verification = isStringArray(session.verification_commands)
      ? compact(session.verification_commands)
      : [];
    if (verification.length === 0) {
      errors.push("verification_commands must be recorded for levels that allow edits");
    }
  }

  if (
    ["high", "critical"].includes(session.risk_level) &&
    filesModified.length > 0 &&
    session.explicit_edit_approval !== true
  ) {
    errors.push("high or critical risk work modified files without explicit_edit_approval");
  }
}

function validateTask(task, errors) {
  if (!isPlainObject(task)) {
    errors.push("task must be an object");
    return;
  }
  for (const field of ["title", "user_request", "summary"]) {
    if (typeof task[field] !== "string") {
      errors.push(`task.${field} must be a string`);
    }
  }
}

function validateGitBoundary(session) {
  const errors = [];
  const snapshot = loadSnapshot();
  const changed = changedSinceSnapshot(snapshot.git_status_short, gitStatusLines());
  const outsideSession = changed.filter((line) => !isSessionPath(statusPath(line)));

  if (!allowsEdits(session.selected_confidence_level) && outsideSession.length > 0) {
    errors.push(
      ...outsideSession.map((line) => `files were modified even though selected level does not allow edits: ${line}`)
    );
  }

  if (
    ["high", "critical"].includes(session.risk_level) &&
    outsideSession.length > 0 &&
    session.explicit_edit_approval !== true
  ) {
    errors.push("high or critical risk work modified files without explicit approval recorded");
  }

  return errors;
}

function loadSnapshot() {
  if (!existsSync(snapshotPath)) {
    throw new Error(`missing ${relative(snapshotPath)}; run snapshot first`);
  }
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  } catch (error) {
    throw new Error(`invalid JSON in ${relative(snapshotPath)}: ${error.message}`);
  }
  if (!isPlainObject(snapshot) || !isStringArray(snapshot.git_status_short)) {
    throw new Error(`${relative(snapshotPath)} must include git_status_short as an array of strings`);
  }
  return snapshot;
}

function gitStatusLines() {
  const result = git(["status", "--short"]);
  return result.ok ? result.stdout.split(/\r?\n/u).filter(Boolean) : [];
}

function git(argv) {
  try {
    return {
      ok: true,
      stdout: execFileSync("git", argv, {
        cwd: args.root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }).trim()
    };
  } catch {
    return { ok: false, stdout: "" };
  }
}

function changedSinceSnapshot(before, after) {
  const beforeSet = new Set(before);
  return after.filter((line) => !beforeSet.has(line));
}

function statusPath(line) {
  const rawPath = line.slice(3).trim();
  if (rawPath.includes(" -> ")) {
    return rawPath.split(" -> ").at(-1).trim();
  }
  return rawPath;
}

function isSessionPath(filePath) {
  const normalized = filePath.replace(/^\.?\//u, "");
  return normalized === ".agent/session" || normalized.startsWith(".agent/session/");
}

function allowsEdits(level) {
  return editLevels.has(level);
}

function validateEnum(value, allowed, field, errors) {
  if (!allowed.has(value)) {
    errors.push(`${field} must be one of: ${Array.from(allowed).join(", ")}`);
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function markdownList(items) {
  const compactItems = compact(items);
  if (compactItems.length === 0) {
    return "- None";
  }
  return compactItems.map((item) => `- ${item}`).join("\n");
}

function formatList(value) {
  const compactItems = compact(value);
  return compactItems.length > 0 ? compactItems.join("; ") : "none";
}

function compact(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim() !== "") : [];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function printErrors(errors) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
}

function relative(path) {
  return path.startsWith(args.root) ? path.slice(args.root.length + 1) : path;
}
