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

function run(args, options) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd,
    encoding: "utf8"
  });
}

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "onramp-"));
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
