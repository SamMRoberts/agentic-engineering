import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "sync-marketplace.mjs");

function makeRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sync-marketplace-"));
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.cpSync(scriptPath, path.join(root, "scripts", "sync-marketplace.mjs"));
    fs.mkdirSync(path.join(root, "plugins"), { recursive: true });
    return root;
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function runSync(root, args = []) {
    return spawnSync(process.execPath, [path.join(root, "scripts", "sync-marketplace.mjs"), ...args], {
        cwd: root,
        encoding: "utf-8"
    });
}

function pluginPath(root, pluginName, ...segments) {
    return path.join(root, "plugins", pluginName, ...segments);
}

test("sync writes missing host manifests while preserving existing metadata", () => {
    const root = makeRepo();
    writeJson(pluginPath(root, "curated-plugin", ".codex-plugin", "plugin.json"), {
        name: "curated-plugin",
        version: "2.3.4",
        description: "Curated plugin description.",
        keywords: ["curated"],
        marketplace: {
            category: "Testing",
            ref: "release",
            policy: { installation: "AVAILABLE", authentication: "NONE" }
        },
        interface: {
            displayName: "Curated Plugin",
            shortDescription: "Curated short description.",
            longDescription: "Curated long description.",
            category: "Productivity",
            capabilities: ["Automation"]
        }
    });
    fs.mkdirSync(pluginPath(root, "new-plugin", "skills", "new-skill"), { recursive: true });
    fs.writeFileSync(pluginPath(root, "new-plugin", "skills", "new-skill", "SKILL.md"), "---\nname: new-skill\n---\n", "utf-8");

    const result = runSync(root);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readJson(pluginPath(root, "curated-plugin", ".codex-plugin", "plugin.json")).keywords[0], "curated");
    assert.equal(readJson(pluginPath(root, "curated-plugin", ".claude-plugin", "plugin.json")).version, "2.3.4");
    assert.equal(readJson(pluginPath(root, "curated-plugin", ".github", "plugin", "plugin.json")).version, "2.3.4");
    assert.equal(readJson(pluginPath(root, "new-plugin", ".codex-plugin", "plugin.json")).version, "0.1.0");
    assert.equal(readJson(pluginPath(root, "new-plugin", ".github", "plugin", "plugin.json")).name, "new-plugin");

    const codexMarketplace = readJson(path.join(root, "plugins", "marketplace.json"));
    assert.deepEqual(codexMarketplace.plugins.map((plugin) => plugin.name), ["curated-plugin", "new-plugin"]);
    assert.equal(codexMarketplace.plugins[0].category, "Testing");
    assert.equal(codexMarketplace.plugins[0].source.ref, "release");

    const githubMarketplace = readJson(path.join(root, ".github", "plugin", "marketplace.json"));
    assert.deepEqual(githubMarketplace.plugins.map((plugin) => plugin.name), ["curated-plugin", "new-plugin"]);
    assert.deepEqual(githubMarketplace.plugins[1].skills, ["./plugins/new-plugin/skills/new-skill"]);

    const rootCodexMarketplace = readJson(path.join(root, ".codex-plugin", "marketplace.json"));
    assert.equal(rootCodexMarketplace.metadata.description, "SamMRoberts Codex agent plugin marketplace.");
    assert.deepEqual(rootCodexMarketplace.plugins.map((plugin) => plugin.name), ["curated-plugin", "new-plugin"]);

    const rootClaudeMarketplace = readJson(path.join(root, ".claude-plugin", "marketplace.json"));
    assert.equal(rootClaudeMarketplace.metadata.description, "SamMRoberts Copilot agent plugin marketplace.");
    assert.deepEqual(rootClaudeMarketplace.plugins.map((plugin) => plugin.name), ["curated-plugin", "new-plugin"]);
});

test("check mode reports missing generated files without writing them", () => {
    const root = makeRepo();
    fs.mkdirSync(pluginPath(root, "missing-plugin", "skills"), { recursive: true });

    const result = runSync(root, ["--check"]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /out of date/);
    assert.equal(fs.existsSync(pluginPath(root, "missing-plugin", ".codex-plugin", "plugin.json")), false);
    assert.equal(fs.existsSync(path.join(root, "plugins", "marketplace.json")), false);
    assert.equal(fs.existsSync(path.join(root, ".codex-plugin", "marketplace.json")), false);
    assert.equal(fs.existsSync(path.join(root, ".claude-plugin", "marketplace.json")), false);
});
