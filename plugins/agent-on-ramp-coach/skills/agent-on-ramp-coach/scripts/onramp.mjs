#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");
const menuDataPath = join(skillDir, "data", "safe-task-menu.json");

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

const listFlagFields = {
  inspected: "files_inspected",
  command: "commands_run",
  modified: "files_modified",
  finding: "agent_findings",
  recommendation: "agent_recommendations",
  review: "human_review_items",
  verification: "verification_commands",
  allowed: "allowed_actions",
  forbidden: "forbidden_actions"
};

const args = parseArgs(process.argv.slice(2));
const sessionDir = resolve(args.root, ".agent", "session");
const defaultSessionPath = join(sessionDir, "onramp-session.json");
const sessionPath = args.session ? resolvePath(args.root, args.session) : defaultSessionPath;
const sessionMarkdownPath = markdownPathFor(sessionPath);
const snapshotPath = args.snapshot
  ? resolvePath(args.root, args.snapshot)
  : join(sessionDir, "onramp-git-snapshot.json");
const historyPath = args.history
  ? resolvePath(args.root, args.history)
  : join(sessionDir, "onramp-history.jsonl");

const commands = {
  init: initSession,
  start: commandStart,
  set: commandSet,
  record: commandRecord,
  status: commandStatus,
  menu: commandMenu,
  check: commandCheck,
  "no-edits": commandNoEdits,
  snapshot: commandSnapshot,
  summary: commandSummary,
  complete: commandComplete,
  history: commandHistory
};

if (!Object.prototype.hasOwnProperty.call(commands, args.command)) {
  usage();
}

try {
  commands[args.command]();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(2);
}

function parseArgs(argv) {
  let command = null;
  let root = process.cwd();
  const flags = new Map();
  const booleanFlags = new Set(["force", "json"]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (!flags.has(name)) {
        flags.set(name, []);
      }
      if (booleanFlags.has(name)) {
        flags.get(name).push("true");
      } else {
        flags.get(name).push(requiredArg(argv, index, arg));
        index += 1;
      }
    } else if (!command) {
      command = arg;
    } else {
      console.error(`ERROR: Unexpected argument ${arg}`);
      usage();
    }
  }

  const rootFlag = lastFlag(flags, "root");
  if (rootFlag) {
    root = rootFlag;
  }

  return {
    command,
    root: resolve(root),
    session: lastFlag(flags, "session"),
    snapshot: lastFlag(flags, "snapshot"),
    history: lastFlag(flags, "history"),
    flags
  };
}

function lastFlag(flags, name) {
  const values = flags.get(name);
  return values && values.length > 0 ? values.at(-1) : null;
}

function flag(name) {
  return lastFlag(args.flags, name);
}

function flagList(name) {
  return args.flags.get(name) ?? [];
}

function hasFlag(name) {
  return args.flags.has(name);
}

function requiredArg(argv, index, name) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`ERROR: ${name} requires a value`);
    process.exit(2);
  }
  return value;
}

function resolvePath(root, value) {
  return isAbsolute(value) ? value : resolve(root, value);
}

function markdownPathFor(jsonPath) {
  return jsonPath.endsWith(".json") ? `${jsonPath.slice(0, -5)}.md` : `${jsonPath}.md`;
}

function usage() {
  console.error(
    "ERROR: Usage: node onramp.mjs <command> [options]\n" +
      "\n" +
      "Commands:\n" +
      "  init        Create empty session artifacts.\n" +
      "  start       Create and populate a session in one step.\n" +
      "  set         Update scalar session fields.\n" +
      "  record      Append entries to session list fields.\n" +
      "  status      Show the session and a readiness checklist.\n" +
      "  menu        List safe starter workflows.\n" +
      "  check       Validate the session (and git boundary if snapshotted).\n" +
      "  no-edits    Fail if read-only levels changed files outside .agent/session/.\n" +
      "  snapshot    Record current git state for no-edit checks.\n" +
      "  summary     Print a scan-friendly session summary.\n" +
      "  complete    Validate, then append the session to the adoption history log.\n" +
      "  history     Summarize the adoption history log for a team.\n" +
      "\n" +
      "Common options: [--root <path>] [--session <path>] [--snapshot <path>] [--history <path>]\n" +
      "start/set fields: --task <text> --task-title <text> --task-request <text> --task-summary <text>\n" +
      "  --workflow <type> --risk <level> --recommended-level <level> --selected-level <level>\n" +
      "  --status <status> --next-step <text> --approval <true|false> [--force]\n" +
      "record fields (repeatable): --inspected --command --modified --finding --recommendation\n" +
      "  --review --verification --allowed --forbidden"
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

function commandStart() {
  if (existsSync(sessionPath) && !hasFlag("force")) {
    throw new Error(
      `${relative(sessionPath)} already exists; use 'set'/'record' to update it or pass --force to overwrite`
    );
  }

  const session = defaultSession();
  applyScalarFlags(session, { requireTask: true });
  appendListFlags(session);

  if (!hasFlag("recommended-level") && hasFlag("selected-level")) {
    session.recommended_confidence_level = session.selected_confidence_level;
  }

  saveSession(session);
  console.log(`Started Agent On-Ramp session at ${relative(sessionPath)}`);
  printReadiness(session);
}

function commandSet() {
  const session = readSessionOrThrow();
  applyScalarFlags(session, { requireTask: false });
  saveSession(session);
  console.log(`Updated ${relative(sessionPath)}`);
}

function commandRecord() {
  const session = readSessionOrThrow();
  const added = appendListFlags(session);
  if (added === 0) {
    throw new Error("record requires at least one list flag, e.g. --finding, --inspected, --command");
  }
  saveSession(session);
  console.log(`Recorded ${added} item(s) in ${relative(sessionPath)}`);
}

function commandStatus() {
  if (!existsSync(sessionPath)) {
    console.log(`No session at ${relative(sessionPath)}. Run 'start' or 'init' first.`);
    return;
  }
  const { session, errors } = loadAndValidateSession();
  if (!session) {
    printErrors(errors);
    process.exit(1);
  }

  console.log(`# Status: ${session.task.title || "Agent On-Ramp Session"}`);
  console.log(`- workflow type: ${session.workflow_type}`);
  console.log(`- risk level: ${session.risk_level}`);
  console.log(`- selected confidence level: ${session.selected_confidence_level}`);
  console.log(`- final status: ${session.final_status}`);
  console.log(`- files inspected: ${compact(session.files_inspected).length}`);
  console.log(`- files modified: ${compact(session.files_modified).length}`);
  console.log(`- findings: ${compact(session.agent_findings).length}`);
  console.log("");
  printReadiness(session);

  if (errors.length > 0) {
    console.log("");
    console.log("Validation errors (run 'check' for details):");
    for (const error of errors) {
      console.log(`  - ${error}`);
    }
  }
}

function commandMenu() {
  const menu = loadMenu();
  const requested = flag("workflow");
  let workflows = menu.workflows;

  if (requested) {
    workflows = workflows.filter((item) => item.name === requested);
    if (workflows.length === 0) {
      throw new Error(`unknown workflow ${requested}; run 'menu' to list available workflows`);
    }
  }

  if (hasFlag("json")) {
    console.log(JSON.stringify(requested ? workflows[0] : { version: menu.version, workflows }, null, 2));
    return;
  }

  console.log("# Safe Task Menu");
  let currentCategory = null;
  for (const item of workflows) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      console.log("");
      console.log(`## ${currentCategory}`);
    }
    console.log("");
    console.log(`### ${item.name}`);
    console.log(`- description: ${item.description}`);
    console.log(`- recommended confidence level: ${item.recommended_confidence_level}`);
    console.log(`- example prompt: "${item.example_prompt}"`);
  }
}

function commandComplete() {
  const { session, errors } = loadAndValidateSession();
  if (session && existsSync(snapshotPath)) {
    errors.push(...validateGitBoundary(session));
  }
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }

  const entry = {
    timestamp: new Date().toISOString(),
    task_title: session.task.title || "untitled",
    workflow_type: session.workflow_type,
    risk_level: session.risk_level,
    recommended_confidence_level: session.recommended_confidence_level,
    selected_confidence_level: session.selected_confidence_level,
    final_status: session.final_status,
    files_inspected_count: compact(session.files_inspected).length,
    files_modified_count: compact(session.files_modified).length
  };

  mkdirSync(dirname(historyPath), { recursive: true });
  appendFileSync(historyPath, `${JSON.stringify(entry)}\n`, "utf8");
  console.log(`Recorded adoption history entry in ${relative(historyPath)}`);
}

function commandHistory() {
  if (!existsSync(historyPath)) {
    console.log(`No adoption history yet at ${relative(historyPath)}. Run 'complete' after a session.`);
    return;
  }

  const entries = [];
  const lines = readFileSync(historyPath, "utf8").split(/\r?\n/u).filter(Boolean);
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      console.error(`WARN: skipping malformed history line: ${line}`);
    }
  }

  console.log("# Adoption History");
  console.log(`- sessions: ${entries.length}`);
  console.log(`- by selected confidence level:`);
  for (const [level, count] of countBy(entries, "selected_confidence_level")) {
    console.log(`  - ${level}: ${count}`);
  }
  console.log(`- by workflow type:`);
  for (const [workflow, count] of countBy(entries, "workflow_type")) {
    console.log(`  - ${workflow}: ${count}`);
  }
  console.log(`- by final status:`);
  for (const [status, count] of countBy(entries, "final_status")) {
    console.log(`  - ${status}: ${count}`);
  }
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

function applyScalarFlags(session, { requireTask }) {
  if (hasFlag("task")) {
    session.task.title = flag("task");
    if (!hasFlag("task-request")) {
      session.task.user_request = flag("task");
    }
  }
  if (hasFlag("task-title")) {
    session.task.title = flag("task-title");
  }
  if (hasFlag("task-request")) {
    session.task.user_request = flag("task-request");
  }
  if (hasFlag("task-summary")) {
    session.task.summary = flag("task-summary");
  }

  applyEnumFlag(session, "workflow", "workflow_type", workflowTypes);
  applyEnumFlag(session, "risk", "risk_level", riskLevels);
  applyEnumFlag(session, "recommended-level", "recommended_confidence_level", confidenceLevels);
  applyEnumFlag(session, "selected-level", "selected_confidence_level", confidenceLevels);
  applyEnumFlag(session, "status", "final_status", finalStatuses);

  if (hasFlag("next-step")) {
    session.next_suggested_step = flag("next-step");
  }
  if (hasFlag("approval")) {
    const value = flag("approval");
    if (value !== "true" && value !== "false") {
      throw new Error("--approval must be true or false");
    }
    session.explicit_edit_approval = value === "true";
  }

  if (requireTask && (typeof session.task.title !== "string" || session.task.title.trim() === "")) {
    throw new Error("start requires --task or --task-title");
  }
}

function applyEnumFlag(session, flagName, field, allowed) {
  if (!hasFlag(flagName)) {
    return;
  }
  const value = flag(flagName);
  if (!allowed.has(value)) {
    throw new Error(`--${flagName} must be one of: ${Array.from(allowed).join(", ")}`);
  }
  session[field] = value;
}

function appendListFlags(session) {
  let added = 0;
  for (const [flagName, field] of Object.entries(listFlagFields)) {
    for (const rawValue of flagList(flagName)) {
      const value = rawValue.trim();
      if (value === "") {
        continue;
      }
      if (!Array.isArray(session[field])) {
        session[field] = [];
      }
      if (!session[field].includes(value)) {
        session[field].push(value);
        added += 1;
      }
    }
  }
  return added;
}

function readSessionOrThrow() {
  if (!existsSync(sessionPath)) {
    throw new Error(`missing ${relative(sessionPath)}; run 'start' or 'init' first`);
  }
  let session;
  try {
    session = JSON.parse(readFileSync(sessionPath, "utf8"));
  } catch (error) {
    throw new Error(`invalid JSON in ${relative(sessionPath)}: ${error.message}`);
  }
  if (!isPlainObject(session)) {
    throw new Error(`${relative(sessionPath)} must contain a JSON object`);
  }
  return session;
}

function saveSession(session) {
  writeJson(sessionPath, session);
  mkdirSync(dirname(sessionMarkdownPath), { recursive: true });
  writeFileSync(sessionMarkdownPath, sessionMarkdown(session), "utf8");
}

function printReadiness(session) {
  const editLevel = allowsEdits(session.selected_confidence_level);
  const items = [
    ["Task title recorded", typeof session.task.title === "string" && session.task.title.trim() !== ""],
    ["Allowed actions recorded", compact(session.allowed_actions).length > 0],
    ["Forbidden actions recorded", compact(session.forbidden_actions).length > 0],
    ["Findings or recommendations recorded", compact(session.agent_findings).length > 0 || compact(session.agent_recommendations).length > 0],
    ["Final status set", session.final_status !== "not_started"]
  ];
  if (editLevel) {
    items.push(["Explicit edit approval recorded", session.explicit_edit_approval === true]);
    items.push(["Verification commands recorded", compact(session.verification_commands).length > 0]);
  }

  console.log("Readiness checklist:");
  for (const [label, done] of items) {
    console.log(`  [${done ? "x" : " "}] ${label}`);
  }
}

function loadMenu() {
  if (!existsSync(menuDataPath)) {
    throw new Error(`missing safe task menu data at ${menuDataPath}`);
  }
  let menu;
  try {
    menu = JSON.parse(readFileSync(menuDataPath, "utf8"));
  } catch (error) {
    throw new Error(`invalid JSON in ${menuDataPath}: ${error.message}`);
  }
  if (!isPlainObject(menu) || !Array.isArray(menu.workflows)) {
    throw new Error(`${menuDataPath} must include a workflows array`);
  }
  return menu;
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    const value = typeof entry[key] === "string" ? entry[key] : "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
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
