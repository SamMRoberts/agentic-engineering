#!/usr/bin/env node
/**
 * Validates plugin structure for every directory under plugins/.
 *
 * Every plugin must satisfy:
 *
 *   - Folder name is kebab-case.
 *   - Root plugin.json (Copilot / Codex CLI runtime) is present, parses, and
 *     declares agents/skills directories plus entrypointAgent.
 *   - .codex-plugin/plugin.json (Codex marketplace) is present, parses, and
 *     declares name + version + description + interface.
 *   - .claude-plugin/plugin.json (Claude Code) is present, parses, and declares
 *     name + version + at least one of agents or skills pointers.
 *   - package.json is present and declares a name.
 *   - agents/ directory exists with the entrypoint agent file
 *     (<entrypointAgent>.agent.md).
 *   - skills/ directory exists.
 *   - README.md and CHANGELOG.md exist (recommended; warnings only).
 *   - The `name` field is identical across all three manifests and matches the
 *     folder name.
 *
 * Run from the repo root:
 *   node .github/scripts/validate-plugin-structure.mjs
 *
 * Exit codes:
 *   0 — all plugins valid
 *   1 — one or more plugins have errors
 *   2 — bad usage (no plugins directory, etc.)
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const pluginsDir = path.join(repoRoot, "plugins");

const KEBAB = /^[a-z][a-z0-9-]*[a-z0-9]$/;

if (!fs.existsSync(pluginsDir) || !fs.statSync(pluginsDir).isDirectory()) {
    console.error(`ERROR: plugins/ not found at ${pluginsDir}`);
    process.exit(2);
}

const plugins = fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

if (plugins.length === 0) {
    console.error("ERROR: no plugins discovered in plugins/");
    process.exit(2);
}

let totalErrors = 0;
let totalWarnings = 0;
const report = [];

function readJson(filePath, issues) {
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
    } catch (err) {
        issues.errors.push(`${filePath}: ${err.message}`);
        return null;
    }
}

function fileExists(filePath) {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function dirExists(filePath) {
    return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

function require(condition, message, issues) {
    if (!condition) issues.errors.push(message);
}

function warn(condition, message, issues) {
    if (!condition) issues.warnings.push(message);
}

function validatePlugin(name) {
    const issues = { errors: [], warnings: [] };
    const dir = path.join(pluginsDir, name);

    // Folder naming
    require(
        KEBAB.test(name),
        `Folder name "${name}" must be kebab-case (lowercase, hyphens, no leading/trailing hyphen)`,
        issues
    );

    // Root plugin.json (Copilot / Codex CLI runtime)
    const rootManifestPath = path.join(dir, "plugin.json");
    let rootManifest = null;
    if (!fileExists(rootManifestPath)) {
        issues.errors.push(`Missing required file: plugin.json (Copilot / Codex CLI runtime manifest)`);
    } else {
        rootManifest = readJson(rootManifestPath, issues);
        if (rootManifest) {
            require(typeof rootManifest.entrypointAgent === "string" && rootManifest.entrypointAgent.length > 0,
                `plugin.json must declare "entrypointAgent" (string)`, issues);
            require(typeof rootManifest.agents === "string" && rootManifest.agents.length > 0,
                `plugin.json must declare "agents" (path string, typically "agents")`, issues);
            require(typeof rootManifest.skills === "string" && rootManifest.skills.length > 0,
                `plugin.json must declare "skills" (path string, typically "skills")`, issues);
            if (rootManifest.privateAgents != null) {
                require(Array.isArray(rootManifest.privateAgents),
                    `plugin.json "privateAgents" must be an array when present`, issues);
            }
        }
    }

    // .codex-plugin/plugin.json (Codex marketplace manifest)
    const codexManifestPath = path.join(dir, ".codex-plugin", "plugin.json");
    let codexManifest = null;
    if (!fileExists(codexManifestPath)) {
        issues.errors.push(`Missing required file: .codex-plugin/plugin.json (Codex marketplace manifest)`);
    } else {
        codexManifest = readJson(codexManifestPath, issues);
        if (codexManifest) {
            require(typeof codexManifest.name === "string", `.codex-plugin/plugin.json must declare "name"`, issues);
            require(typeof codexManifest.version === "string", `.codex-plugin/plugin.json must declare "version" (semver)`, issues);
            require(typeof codexManifest.description === "string" && codexManifest.description.length > 0,
                `.codex-plugin/plugin.json must declare a non-empty "description"`, issues);
            require(codexManifest.interface && typeof codexManifest.interface === "object",
                `.codex-plugin/plugin.json must declare an "interface" block`, issues);
            if (codexManifest.interface) {
                require(typeof codexManifest.interface.displayName === "string",
                    `.codex-plugin/plugin.json "interface.displayName" must be a string`, issues);
                require(typeof codexManifest.interface.category === "string",
                    `.codex-plugin/plugin.json "interface.category" must be a string`, issues);
                warn(typeof codexManifest.interface.shortDescription === "string",
                    `.codex-plugin/plugin.json should declare "interface.shortDescription" (used by the marketplace generator)`, issues);
            }
        }
    }

    // .claude-plugin/plugin.json (Claude Code manifest)
    const claudeManifestPath = path.join(dir, ".claude-plugin", "plugin.json");
    let claudeManifest = null;
    if (!fileExists(claudeManifestPath)) {
        issues.errors.push(`Missing required file: .claude-plugin/plugin.json (Claude Code manifest)`);
    } else {
        claudeManifest = readJson(claudeManifestPath, issues);
        if (claudeManifest) {
            require(typeof claudeManifest.name === "string", `.claude-plugin/plugin.json must declare "name"`, issues);
            require(typeof claudeManifest.version === "string", `.claude-plugin/plugin.json must declare "version" (semver)`, issues);
            const hasAgents = typeof claudeManifest.agents === "string";
            const hasSkills = typeof claudeManifest.skills === "string";
            require(hasAgents || hasSkills,
                `.claude-plugin/plugin.json must declare at least one of "agents" or "skills" pointer`, issues);
        }
    }

    // Cross-manifest name consistency
    const declaredNames = [
        ["folder", name],
        rootManifest && typeof rootManifest.name === "string" ? ["plugin.json", rootManifest.name] : null,
        codexManifest && typeof codexManifest.name === "string" ? [".codex-plugin/plugin.json", codexManifest.name] : null,
        claudeManifest && typeof claudeManifest.name === "string" ? [".claude-plugin/plugin.json", claudeManifest.name] : null
    ].filter(Boolean);

    const distinct = new Set(declaredNames.map(([, value]) => value));
    if (distinct.size > 1) {
        const list = declaredNames.map(([source, value]) => `${source}=${value}`).join(", ");
        issues.errors.push(`"name" must match across folder and all manifests (${list})`);
    }

    // Version consistency between codex + claude manifests (when both present)
    if (codexManifest && claudeManifest
        && typeof codexManifest.version === "string"
        && typeof claudeManifest.version === "string"
        && codexManifest.version !== claudeManifest.version) {
        issues.errors.push(
            `"version" mismatch: .codex-plugin/plugin.json=${codexManifest.version}, .claude-plugin/plugin.json=${claudeManifest.version}`
        );
    }

    // package.json
    const pkgPath = path.join(dir, "package.json");
    let pkg = null;
    if (!fileExists(pkgPath)) {
        issues.errors.push(`Missing required file: package.json`);
    } else {
        pkg = readJson(pkgPath, issues);
        if (pkg) {
            require(typeof pkg.name === "string", `package.json must declare "name"`, issues);
            warn(pkg.scripts && typeof pkg.scripts.test === "string",
                `package.json should declare a "test" script`, issues);
        }
    }

    // Directories
    require(dirExists(path.join(dir, "agents")), `Missing required directory: agents/`, issues);
    require(dirExists(path.join(dir, "skills")), `Missing required directory: skills/`, issues);

    // Entrypoint agent file
    if (rootManifest && typeof rootManifest.entrypointAgent === "string") {
        const agentFile = path.join(dir, "agents", `${rootManifest.entrypointAgent}.agent.md`);
        require(fileExists(agentFile),
            `Entrypoint agent file not found: agents/${rootManifest.entrypointAgent}.agent.md`, issues);

        // Each declared privateAgent should also have a file.
        if (Array.isArray(rootManifest.privateAgents)) {
            for (const privateName of rootManifest.privateAgents) {
                const f = path.join(dir, "agents", `${privateName}.agent.md`);
                require(fileExists(f),
                    `Private agent file not found: agents/${privateName}.agent.md`, issues);
            }
        }
    }

    // Recommended files
    warn(fileExists(path.join(dir, "README.md")), `README.md is recommended`, issues);
    warn(fileExists(path.join(dir, "CHANGELOG.md")), `CHANGELOG.md is recommended`, issues);
    warn(fileExists(path.join(dir, "LICENSE")), `LICENSE is recommended`, issues);

    // hooks.json shape (when present)
    const hooksPath = path.join(dir, "hooks.json");
    if (fileExists(hooksPath)) {
        const hooks = readJson(hooksPath, issues);
        if (hooks && Object.keys(hooks).length > 0 && !hooks.hooks) {
            issues.errors.push(`hooks.json must be either {} or { "hooks": { ... } }`);
        }
    }

    // .mcp.json shape (when present)
    const mcpPath = path.join(dir, ".mcp.json");
    if (fileExists(mcpPath)) {
        const mcp = readJson(mcpPath, issues);
        if (mcp && mcp.mcpServers != null && typeof mcp.mcpServers !== "object") {
            issues.errors.push(`.mcp.json "mcpServers" must be an object`);
        }
    }

    return issues;
}

for (const name of plugins) {
    const issues = validatePlugin(name);
    totalErrors += issues.errors.length;
    totalWarnings += issues.warnings.length;
    report.push({ name, issues });
}

// Output report
for (const { name, issues } of report) {
    const status =
        issues.errors.length === 0 && issues.warnings.length === 0
            ? "OK"
            : issues.errors.length === 0
                ? `OK (with ${issues.warnings.length} warning${issues.warnings.length === 1 ? "" : "s"})`
                : `FAIL — ${issues.errors.length} error${issues.errors.length === 1 ? "" : "s"}`;
    console.log(`\n[${status}] ${name}`);
    for (const e of issues.errors) console.log(`  ERROR: ${e}`);
    for (const w of issues.warnings) console.log(`  WARN:  ${w}`);
}

console.log(
    `\nSummary: ${plugins.length} plugin(s), ${totalErrors} error(s), ${totalWarnings} warning(s)`
);

process.exit(totalErrors > 0 ? 1 : 0);
