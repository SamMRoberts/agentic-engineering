import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(pluginRoot, "skills", "agent-on-ramp-coach", "scripts", "onramp.mjs");
const validExample = join(
  pluginRoot,
  "skills",
  "agent-on-ramp-coach",
  "examples",
  "valid-adoption-session.json"
);
const invalidExample = join(
  pluginRoot,
  "skills",
  "agent-on-ramp-coach",
  "examples",
  "invalid-adoption-session.json"
);

test("valid adoption session passes check", () => {
  const result = run(["check", "--session", validExample], { cwd: pluginRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /session check passed/u);
});

test("invalid adoption session fails check with actionable errors", () => {
  const result = run(["check", "--session", invalidExample], { cwd: pluginRoot });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /workflow_type must be one of/u);
  assert.match(result.stderr, /allowed_actions must contain at least one action/u);
  assert.match(result.stderr, /files_modified must be empty/u);
});

test("init creates session artifacts", () => {
  const root = tempRoot();
  const result = run(["init"], { cwd: root });
  assert.equal(result.status, 0, result.stderr);

  const session = JSON.parse(readFileSync(join(root, ".agent", "session", "onramp-session.json"), "utf8"));
  assert.equal(session.version, "1.0");
  assert.match(
    readFileSync(join(root, ".agent", "session", "onramp-session.md"), "utf8"),
    /# Agent On-Ramp Session/u
  );
});

test("snapshot and no-edits pass when status does not change", () => {
  const root = gitTempRoot();
  writeSession(root, validSession());

  assert.equal(run(["snapshot"], { cwd: root }).status, 0);
  const result = run(["no-edits"], { cwd: root });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No-edit check passed/u);
});

test("no-edits fails when read-only work changes files outside .agent/session", () => {
  const root = gitTempRoot();
  writeSession(root, validSession());

  assert.equal(run(["snapshot"], { cwd: root }).status, 0);
  writeFileSync(join(root, "outside.txt"), "changed\n");

  const result = run(["no-edits"], { cwd: root });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /read-only level changed file outside .agent\/session/u);
});

test("summary prints scan-friendly markdown", () => {
  const result = run(["summary", "--session", validExample], { cwd: pluginRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /workflow type: explain_code/u);
  assert.match(result.stdout, /next suggested step/u);
});

test("start populates a session in one step and passes check", () => {
  const root = tempRoot();
  const started = run(
    [
      "start",
      "--task",
      "Explain retry logic",
      "--workflow",
      "explain_code",
      "--risk",
      "low",
      "--selected-level",
      "level_1_analyze_only"
    ],
    { cwd: root }
  );
  assert.equal(started.status, 0, started.stderr);

  const session = JSON.parse(readFileSync(sessionJsonPath(root), "utf8"));
  assert.equal(session.task.title, "Explain retry logic");
  assert.equal(session.task.user_request, "Explain retry logic");
  assert.equal(session.workflow_type, "explain_code");
  assert.equal(session.recommended_confidence_level, "level_1_analyze_only");
  assert.match(
    readFileSync(join(root, ".agent", "session", "onramp-session.md"), "utf8"),
    /Explain retry logic/u
  );
  assert.equal(run(["check"], { cwd: root }).status, 0);
});

test("start refuses to overwrite without --force", () => {
  const root = tempRoot();
  assert.equal(run(["start", "--task", "First"], { cwd: root }).status, 0);
  const second = run(["start", "--task", "Second"], { cwd: root });
  assert.equal(second.status, 2);
  assert.match(second.stderr, /already exists/u);
  assert.equal(run(["start", "--task", "Second", "--force"], { cwd: root }).status, 0);
});

test("start requires a task and rejects invalid enums", () => {
  const root = tempRoot();
  const noTask = run(["start", "--workflow", "explain_code"], { cwd: root });
  assert.equal(noTask.status, 2);
  assert.match(noTask.stderr, /start requires --task/u);

  const badEnum = run(["start", "--task", "x", "--workflow", "nope"], { cwd: root });
  assert.equal(badEnum.status, 2);
  assert.match(badEnum.stderr, /--workflow must be one of/u);
});

test("record appends deduplicated list items", () => {
  const root = tempRoot();
  assert.equal(run(["start", "--task", "x"], { cwd: root }).status, 0);
  assert.equal(
    run(["record", "--inspected", "a.ts", "--inspected", "a.ts", "--finding", "f1"], { cwd: root }).status,
    0
  );
  const session = JSON.parse(readFileSync(sessionJsonPath(root), "utf8"));
  assert.deepEqual(session.files_inspected, ["a.ts"]);
  assert.deepEqual(session.agent_findings, ["f1"]);

  const noFlags = run(["record"], { cwd: root });
  assert.equal(noFlags.status, 2);
  assert.match(noFlags.stderr, /record requires at least one list flag/u);
});

test("set updates scalar fields and regenerates markdown", () => {
  const root = tempRoot();
  assert.equal(run(["start", "--task", "x"], { cwd: root }).status, 0);
  assert.equal(run(["set", "--status", "read_only_complete", "--next-step", "ask"], { cwd: root }).status, 0);
  const session = JSON.parse(readFileSync(sessionJsonPath(root), "utf8"));
  assert.equal(session.final_status, "read_only_complete");
  assert.equal(session.next_suggested_step, "ask");
  assert.match(
    readFileSync(join(root, ".agent", "session", "onramp-session.md"), "utf8"),
    /read_only_complete/u
  );
});

test("status reports a readiness checklist", () => {
  const root = tempRoot();
  assert.equal(run(["start", "--task", "x"], { cwd: root }).status, 0);
  const result = run(["status"], { cwd: root });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Readiness checklist/u);
  assert.match(result.stdout, /Task title recorded/u);
});

test("menu lists all workflow types and supports json output", () => {
  const list = run(["menu"], { cwd: pluginRoot });
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /explain_code/u);

  const json = run(["menu", "--json"], { cwd: pluginRoot });
  assert.equal(json.status, 0, json.stderr);
  const parsed = JSON.parse(json.stdout);
  assert.equal(parsed.workflows.length, 14);

  const unknown = run(["menu", "--workflow", "nope"], { cwd: pluginRoot });
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown workflow/u);
});

test("complete appends an adoption history entry and history summarizes it", () => {
  const root = gitTempRoot();
  writeSession(root, validSession());

  const completed = run(["complete"], { cwd: root });
  assert.equal(completed.status, 0, completed.stderr);

  const historyFile = join(root, ".agent", "session", "onramp-history.jsonl");
  const lines = readFileSync(historyFile, "utf8").split(/\r?\n/u).filter(Boolean);
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.workflow_type, "explain_code");
  assert.equal(entry.selected_confidence_level, "level_1_analyze_only");
  assert.equal(typeof entry.files_inspected_count, "number");

  const history = run(["history"], { cwd: root });
  assert.equal(history.status, 0, history.stderr);
  assert.match(history.stdout, /sessions: 1/u);
  assert.match(history.stdout, /explain_code: 1/u);
});

test("complete fails when the session is invalid", () => {
  const root = gitTempRoot();
  writeSession(root, JSON.parse(readFileSync(invalidExample, "utf8")));
  const result = run(["complete"], { cwd: root });
  assert.equal(result.status, 1);
});

test("safe task menu data stays in sync with the session schema", () => {
  const menu = JSON.parse(
    readFileSync(
      join(pluginRoot, "skills", "agent-on-ramp-coach", "data", "safe-task-menu.json"),
      "utf8"
    )
  );
  const schema = JSON.parse(
    readFileSync(
      join(pluginRoot, "skills", "agent-on-ramp-coach", "schemas", "adoption-session.schema.json"),
      "utf8"
    )
  );
  const schemaWorkflows = schema.properties.workflow_type.enum;
  const confidenceLevels = schema.$defs.confidenceLevel.enum;
  const menuNames = menu.workflows.map((item) => item.name);

  assert.deepEqual([...menuNames].sort(), [...schemaWorkflows].sort());
  for (const item of menu.workflows) {
    assert.ok(
      confidenceLevels.includes(item.recommended_confidence_level),
      `unknown confidence level for ${item.name}`
    );
  }
});

function run(args, options) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd,
    encoding: "utf8"
  });
}

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "onramp-"));
}

function sessionJsonPath(root) {
  return join(root, ".agent", "session", "onramp-session.json");
}

function gitTempRoot() {
  const root = tempRoot();
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  return root;
}

function writeSession(root, session) {
  const sessionDir = join(root, ".agent", "session");
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(join(sessionDir, "onramp-session.json"), `${JSON.stringify(session, null, 2)}\n`);
}

function validSession() {
  return JSON.parse(readFileSync(validExample, "utf8"));
}
