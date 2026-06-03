#!/usr/bin/env node
/**
 * Generates basic plugin manifests for the three supported hosts:
 *   - plugin.json                (Copilot / Codex CLI runtime)
 *   - .codex-plugin/plugin.json  (Codex marketplace)
 *   - .claude-plugin/plugin.json (Claude Code)
 *
 * Only writes files that do not already exist. Never overwrites.
 *
 * Usage (from repo root):
 *   node .githuscripts/generate-plugin-manifests.mjs <plugin-name>
 *
 * Examples:
 *   node .githuscripts/generate-plugin-manifests.mjs my-plugin
 *   node .githuscripts/generate-plugin-manifests.mjs plugins/my-plugin
 *
 * The argument can be a folder name under plugins/, or an absolute/relative
 * path that resolves into plugins/. The plugin folder must exist.
 *
 * Exit codes:
 *   0 — generation completed (any combination of created or skipped files)
 *   1 — generation failed (folder not found, name not kebab-case, write error)
 *   2 — bad usage
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const KEBAB = /^[a-z][a-z0-9-]*[a-z0-9]$/;
const REPO_URL = "https://github.com/SamMRoberts/agentic-engineering";
const AUTHOR = { name: "Sam Roberts", url: "https://github.com/SamMRoberts" };

const arg = process.argv[2];
if (!arg) {
    console.error("Usage: node .githuscripts/generate-plugin-manifests.mjs <plugin-name-or-path>");
    process.exit(2);
}

const repoRoot = process.cwd();
const pluginsDir = path.join(repoRoot, "plugins");

// Accept either bare folder name or a path; normalise to absolute folder under plugins/.
let pluginDir;
if (arg.includes(path.sep) || arg.startsWith("plugins/")) {
    pluginDir = path.resolve(repoRoot, arg);
} else {
    pluginDir = path.join(pluginsDir, arg);
}
const pluginName = path.basename(pluginDir);

if (!KEBAB.test(pluginName)) {
    console.error(`ERROR: plugin name "${pluginName}" must be kebab-case (lowercase letters, digits, hyphens; no leading/trailing hyphen).`);
    process.exit(1);
}

if (!fs.existsSync(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
    console.error(`ERROR: plugin folder not found at ${pluginDir}`);
    console.error(`Create the folder first, then re-run with the plugin name.`);
    process.exit(1);
}

// Verify it's actually inside plugins/ to avoid accidental writes elsewhere.
const relFromPlugins = path.relative(pluginsDir, pluginDir);
if (relFromPlugins.startsWith("..") || path.isAbsolute(relFromPlugins)) {
    console.error(`ERROR: plugin folder ${pluginDir} is not inside ${pluginsDir}`);
    process.exit(1);
}

const VERSION = "0.1.0";
const REPO_TREE_URL = `${REPO_URL}/tree/main/plugins/${pluginName}`;

const rootManifest = {
    agents: "agents",
    skills: "skills",
    entrypointAgent: pluginName,
    privateAgents: []
};

const codexManifest = {
    name: pluginName,
    version: VERSION,
    description: `TODO: describe what ${pluginName} does.`,
    author: AUTHOR,
    homepage: REPO_TREE_URL,
    repository: REPO_URL,
    license: "MIT",
    keywords: [],
    agents: "./agents/",
    skills: "./skills/",
    entrypointAgent: pluginName,
    privateAgents: [],
    interface: {
        displayName: titleCase(pluginName),
        shortDescription: `TODO: one-line summary of ${pluginName}.`,
        longDescription: `TODO: longer description of ${pluginName}'s workflow, inputs, and outputs.`,
        developerName: AUTHOR.name,
        category: "Other",
        capabilities: ["Interactive"],
        websiteURL: REPO_TREE_URL,
        defaultPrompt: [`TODO: example prompt for ${pluginName}.`],
        brandColor: "#1D4ED8",
        screenshots: []
    }
};

const claudeManifest = {
    name: pluginName,
    version: VERSION,
    description: `TODO: describe what ${pluginName} does.`,
    author: AUTHOR,
    homepage: REPO_TREE_URL,
    repository: { type: "git", url: REPO_URL },
    license: "MIT",
    keywords: [],
    agents: "./agents/",
    skills: "./skills/",
    hooks: "./hooks.json",
    mcpServers: "./.mcp.json"
};

const targets = [
    { relPath: "plugin.json", content: rootManifest },
    { relPath: path.join(".codex-plugin", "plugin.json"), content: codexManifest },
    { relPath: path.join(".claude-plugin", "plugin.json"), content: claudeManifest }
];

const created = [];
const skipped = [];

for (const { relPath, content } of targets) {
    const absPath = path.join(pluginDir, relPath);
    if (fs.existsSync(absPath)) {
        skipped.push(relPath);
        continue;
    }
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, JSON.stringify(content, null, 2) + "\n", "utf-8");
    created.push(relPath);
}

console.log(`Plugin: ${pluginName}`);
console.log(`Folder: ${pluginDir}`);
console.log("");
if (created.length > 0) {
    console.log("Created:");
    for (const f of created) console.log(`  + ${f}`);
}
if (skipped.length > 0) {
    console.log("Skipped (already exists):");
    for (const f of skipped) console.log(`  = ${f}`);
}
if (created.length > 0) {
    console.log("");
    console.log("Next steps:");
    console.log("  1. Replace the TODO description and longDescription fields.");
    console.log("  2. Fill in keywords, category, and capabilities in .codex-plugin/plugin.json.");
    console.log("  3. Add the entrypoint agent file at agents/<name>.agent.md.");
    console.log("  4. Run: node .githuscripts/validate-plugin-structure.mjs");
}

function titleCase(kebab) {
    return kebab
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
