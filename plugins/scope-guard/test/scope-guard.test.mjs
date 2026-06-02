import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = join(pluginRoot, "bin", "scope-guard.mjs");
const examplesDir = join(pluginRoot, "skills", "scope-guard", "examples");
const validPlan = join(examplesDir, "valid-plan.json");
const invalidPlan = join(examplesDir, "invalid-plan.json");

test("check passes for the valid example", () => {
  const result = spawnSync(process.execPath, [binPath, "check", "--plan", validPlan], {
    cwd: pluginRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scope Guard plan check passed/);
});

test("check fails for the invalid example with actionable errors", () => {
  const result = spawnSync(process.execPath, [binPath, "check", "--plan", invalidPlan], {
    cwd: pluginRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /userGoal is empty or vague/);
  assert.match(result.stderr, /scope.inScope must contain/);
  assert.match(result.stderr, /JobHandler appears to have multiple responsibilities/);
  assert.match(result.stderr, /pseudocode.approved is false/);
  assert.match(result.stderr, /testsAddedOrUpdated is empty/);
  assert.match(result.stderr, /docs.designDocUpdated is false/);
});

test("init creates missing plan artifacts without overwriting existing files", () => {
  const root = makeTempRoot();
  const sessionDir = join(root, ".agent", "session");
  const planPath = join(sessionDir, "scope-guard-plan.json");
  const markdownPath = join(sessionDir, "scope-guard-plan.md");

  try {
    execFileSync(process.execPath, [binPath, "init", "--root", root], { encoding: "utf8" });
    assert.ok(readFileSync(planPath, "utf8").includes('"version": "1.0"'));
    assert.ok(readFileSync(markdownPath, "utf8").includes("# Scope Guard Plan"));

    const custom = '{"custom": true}\n';
    writeFileSync(planPath, custom);
    execFileSync(process.execPath, [binPath, "init", "--root", root], { encoding: "utf8" });
    assert.equal(readFileSync(planPath, "utf8"), custom);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the freshly initialized template fails check until it is filled in", () => {
  const root = makeTempRoot();
  try {
    execFileSync(process.execPath, [binPath, "init", "--root", root], { encoding: "utf8" });
    const result = spawnSync(process.execPath, [binPath, "check", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /scope.inScope must contain/);
    assert.match(result.stderr, /design.components must contain/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("summary prints the plan scope", () => {
  const result = spawnSync(process.execPath, [binPath, "summary", "--plan", validPlan], {
    cwd: pluginRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scope Guard Plan Summary/);
  assert.match(result.stdout, /pseudocode approved: yes/);
  assert.match(result.stdout, /blocking issues: 0/);
});

test("check fails when changed files exist without approved pseudocode", () => {
  const root = makeTempRoot();
  try {
    writePlan(root, (plan) => {
      plan.pseudocode.approved = false;
    });
    const result = spawnSync(process.execPath, [binPath, "check", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /review and approve pseudocode before implementing/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check fails when implementation skips documentation updates", () => {
  const root = makeTempRoot();
  try {
    writePlan(root, (plan) => {
      plan.docs.designDocUpdated = false;
      plan.docs.diagramsUpdated = false;
      plan.docs.docChanges = [];
    });
    const result = spawnSync(process.execPath, [binPath, "check", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /docs.docChanges is empty/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check passes during scoping when no files have changed yet", () => {
  const root = makeTempRoot();
  try {
    writePlan(root, (plan) => {
      plan.pseudocode.approved = false;
      plan.implementation.changedFiles = [];
      plan.implementation.testsAddedOrUpdated = [];
      plan.docs.designDocUpdated = false;
      plan.docs.diagramsUpdated = false;
      plan.docs.docChanges = [];
    });
    const result = spawnSync(process.execPath, [binPath, "check", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeTempRoot() {
  return join(tmpdir(), `scope-guard-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function writePlan(root, mutate) {
  const sessionDir = join(root, ".agent", "session");
  mkdirSync(sessionDir, { recursive: true });
  const plan = JSON.parse(readFileSync(validPlan, "utf8"));
  if (typeof mutate === "function") {
    mutate(plan);
  }
  writeFileSync(join(sessionDir, "scope-guard-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
}
