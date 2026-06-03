import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = join(pluginRoot, "scripts", "change-control.mjs");
const validContract = join(pluginRoot, "skills", "change-control-compiler", "examples", "valid-contract.json");
const invalidContract = join(pluginRoot, "skills", "change-control-compiler", "examples", "invalid-contract.json");

test("check passes for the valid example", () => {
  const result = spawnSync(process.execPath, [binPath, "check", "--contract", validContract], {
    cwd: pluginRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Change Control Contract check passed/);
});

test("check fails for the invalid example with actionable errors", () => {
  const result = spawnSync(process.execPath, [binPath, "check", "--contract", invalidContract], {
    cwd: pluginRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /goal is empty or vague/);
  assert.match(result.stderr, /success_criteria must contain/);
  assert.match(result.stderr, /high risk contracts require at least two verification_commands/);
});

test("init creates missing contract artifacts without overwriting existing files", () => {
  const root = makeTempRoot();
  const sessionDir = join(root, ".agent", "session");
  const contractPath = join(sessionDir, "change-control-contract.json");
  const markdownPath = join(sessionDir, "change-control-contract.md");

  try {
    execFileSync(process.execPath, [binPath, "init", "--root", root], { encoding: "utf8" });
    assert.ok(readFileSync(contractPath, "utf8").includes('"version": "1.0"'));
    assert.ok(readFileSync(markdownPath, "utf8").includes("# Change Control Contract"));

    const custom = '{"custom": true}\n';
    writeFileSync(contractPath, custom);
    execFileSync(process.execPath, [binPath, "init", "--root", root], { encoding: "utf8" });
    assert.equal(readFileSync(contractPath, "utf8"), custom);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("summary prints contract scope", () => {
  const result = spawnSync(process.execPath, [binPath, "summary", "--contract", validContract], {
    cwd: pluginRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Change Control Contract Summary/);
  assert.match(result.stdout, /risk level: medium/);
});

test("drift passes in a clean git repository", () => {
  const root = makeGitWorkspace();
  try {
    copyContract(root, {
      allowed_change_areas: ["src/"],
      forbidden_change_areas: ["secrets/"],
      files_allowed_to_modify: [],
      files_forbidden_to_modify: []
    });
    git(root, "add", ".");
    git(root, "commit", "-m", "initial");

    const result = spawnSync(process.execPath, [binPath, "drift", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /drift check passed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("drift allows modified files inside allowed areas", () => {
  const root = makeGitWorkspace();
  try {
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "index.js"), "console.log('ok');\n");
    copyContract(root, {
      allowed_change_areas: ["src/"],
      forbidden_change_areas: ["secrets/"],
      files_allowed_to_modify: [],
      files_forbidden_to_modify: []
    });
    git(root, "add", ".");
    git(root, "commit", "-m", "initial");
    writeFileSync(join(root, "src", "index.js"), "console.log('changed');\n");

    const result = spawnSync(process.execPath, [binPath, "drift", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("drift fails for out-of-scope modified files", () => {
  const root = makeGitWorkspace();
  try {
    writeFileSync(join(root, "README.md"), "before\n");
    copyContract(root, {
      allowed_change_areas: ["src/"],
      forbidden_change_areas: ["secrets/"],
      files_allowed_to_modify: [],
      files_forbidden_to_modify: []
    });
    git(root, "add", ".");
    git(root, "commit", "-m", "initial");
    writeFileSync(join(root, "README.md"), "after\n");

    const result = spawnSync(process.execPath, [binPath, "drift", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside allowed areas: README.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("drift fails for forbidden modified files", () => {
  const root = makeGitWorkspace();
  try {
    mkdirSync(join(root, "secrets"), { recursive: true });
    writeFileSync(join(root, "secrets", "config.txt"), "before\n");
    copyContract(root, {
      allowed_change_areas: ["src/", "secrets/"],
      forbidden_change_areas: ["secrets/"],
      files_allowed_to_modify: [],
      files_forbidden_to_modify: []
    });
    git(root, "add", ".");
    git(root, "commit", "-m", "initial");
    writeFileSync(join(root, "secrets", "config.txt"), "after\n");

    const result = spawnSync(process.execPath, [binPath, "drift", "--root", root], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /matches forbidden area: secrets\/config.txt/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeTempRoot() {
  return join(tmpdir(), `change-control-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function makeGitWorkspace() {
  const root = makeTempRoot();
  mkdirSync(root, { recursive: true });
  git(root, "init");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "user.name", "Test User");
  return root;
}

function copyContract(root, overrides) {
  const sessionDir = join(root, ".agent", "session");
  mkdirSync(sessionDir, { recursive: true });
  const contract = JSON.parse(readFileSync(validContract, "utf8"));
  Object.assign(contract, overrides);
  writeFileSync(join(sessionDir, "change-control-contract.json"), `${JSON.stringify(contract, null, 2)}\n`);
}

function git(root, ...args) {
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}
