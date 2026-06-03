import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = join(pluginRoot, "scripts", "assumption-gate.mjs");
const validFixtureRoot = join(pluginRoot, "test", "fixtures", "valid-workspace");

test("check passes for a valid assumption gate", () => {
  const result = spawnSync(process.execPath, [binPath, "check", "--root", validFixtureRoot], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Assumption Gate check passed/);
});

test("check fails when a high risk assumption is unknown", () => {
  const result = spawnSync(process.execPath, [binPath, "check", "--root", join(pluginRoot, "test", "fixtures", "invalid-workspace")], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /critical risk and still unknown/);
});

test("init creates missing gate artifacts without overwriting existing files", () => {
  const root = join(tmpdir(), `assumption-gate-${process.pid}-${Date.now()}`);
  const sessionDir = join(root, ".agent", "session");
  const gatePath = join(sessionDir, "assumption-gate.json");
  const assumptionsPath = join(sessionDir, "assumptions.md");

  try {
    execFileSync(process.execPath, [binPath, "init", "--root", root], { encoding: "utf8" });
    assert.ok(readFileSync(gatePath, "utf8").includes('"version": "1.0"'));
    assert.ok(readFileSync(assumptionsPath, "utf8").includes("# Assumption Gate"));

    const custom = '{"custom": true}\n';
    writeFileSync(gatePath, custom);
    execFileSync(process.execPath, [binPath, "init", "--root", root], { encoding: "utf8" });
    assert.equal(readFileSync(gatePath, "utf8"), custom);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("summary reports aggregate counts", () => {
  const result = spawnSync(process.execPath, [binPath, "summary", "--root", validFixtureRoot], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /total assumptions: 1/);
  assert.match(result.stdout, /blocking issues: 0/);
});
