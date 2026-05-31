import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { FrontmatterError } from "../lib/frontmatter.mjs";
import { upsertManagedSection, START_MARKER, END_MARKER } from "../lib/install.mjs";
import { generate, install, scan, validate } from "../lib/workflow.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(__dirname, "fixtures");
const cliPath = path.join(pluginRoot, "bin", "agent-compat.mjs");

function fixture(name) {
    return path.join(fixtureRoot, name);
}

function mktmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "agent-compat-"));
}

function copyFixture(name) {
    const src = fixture(name);
    const dst = mktmp();
    fs.cpSync(src, dst, { recursive: true });
    return dst;
}

test("scan discovers standalone and plugin agents", () => {
    const agents = scan({ root: fixture("sample-repo") });
    assert.equal(agents.length, 3);
    assert.deepEqual(agents.map((agent) => agent.name).sort(), [
        "review-helper",
        "sample-plugin",
        "sample-plugin-worker"
    ]);
    assert.equal(agents.find((agent) => agent.name === "sample-plugin").kind, "plugin");
    assert.equal(agents.find((agent) => agent.name === "review-helper").kind, "standalone");
});

test("validate emits warnings for host-specific Copilot fields", () => {
    const result = validate({ root: fixture("sample-repo") });
    assert.equal(result.validation.ok, true);
    assert.ok(result.validation.warnings.some((warning) => warning.includes("model")));
    assert.ok(result.validation.warnings.some((warning) => warning.includes("vscode/memory")));
    assert.ok(result.validation.warnings.some((warning) => warning.includes("handoff")));
});

test("validate rejects duplicate agent names", () => {
    const result = validate({ root: fixture("duplicate-repo") });
    assert.equal(result.validation.ok, false);
    assert.ok(result.validation.errors.some((error) => error.includes("duplicate agent name")));
});

test("validate rejects missing private agent references", () => {
    const result = validate({ root: fixture("missing-private-repo") });
    assert.equal(result.validation.ok, false);
    assert.ok(result.validation.errors.some((error) => error.includes("missing agent")));
    assert.ok(result.validation.errors.some((error) => error.includes("private agent")));
});

test("invalid frontmatter fails closed", () => {
    assert.throws(
        () => scan({ root: fixture("invalid-repo") }),
        FrontmatterError
    );
});

test("generate writes Codex and Claude overlays", () => {
    const root = copyFixture("sample-repo");
    const result = generate({ root, target: "all" });
    assert.equal(result.ok, true);
    const codexPath = path.join(root, ".agent-compat", "codex", "AGENTS.md");
    const claudePath = path.join(root, ".agent-compat", "claude", "custom-instructions.md");
    assert.ok(fs.existsSync(codexPath));
    assert.ok(fs.existsSync(claudePath));
    const codex = fs.readFileSync(codexPath, "utf8");
    assert.match(codex, /Copilot Agent Compatibility for Codex/);
    assert.match(codex, /sample-plugin/);
    assert.match(codex, /Compatibility notes/);
});

test("managed section upsert preserves user content", () => {
    const existing = `# Existing\n\nKeep this.\n\n${START_MARKER}\nold\n${END_MARKER}\n\nAfter.\n`;
    const next = upsertManagedSection(existing, "new managed content\n");
    assert.match(next, /Keep this/);
    assert.match(next, /After/);
    assert.doesNotMatch(next, /old/);
    assert.match(next, /new managed content/);
});

test("install writes managed sections without deleting user content", () => {
    const root = copyFixture("sample-repo");
    fs.writeFileSync(path.join(root, "AGENTS.md"), "# Existing Codex\n\nKeep this.\n", "utf8");
    const result = install({ root, target: "codex" });
    assert.equal(result.ok, true);
    const installed = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
    assert.match(installed, /# Existing Codex/);
    assert.match(installed, /Keep this/);
    assert.match(installed, /<!-- agent-compat:start -->/);
    assert.match(installed, /Copilot Agent Compatibility for Codex/);
});

test("CLI validate exits non-zero on invalid frontmatter", () => {
    const result = spawnSync(process.execPath, [cliPath, "validate", "--root", fixture("invalid-repo")], {
        encoding: "utf8"
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /ERROR:/);
});

test("smoke validates repository fixture sources", () => {
    const result = validate({ root: path.resolve(pluginRoot, "../..") });
    const names = result.agents.map((agent) => agent.name);
    assert.ok(names.includes("Plan Better"));
    assert.ok(names.includes("web-ux-test"));
    assert.ok(names.includes("agent-compat"));
    assert.equal(result.validation.ok, true, result.validation.errors.join("; "));
});
