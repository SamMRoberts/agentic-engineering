#!/usr/bin/env node
/**
 * Rebuilds the SamMRoberts marketplace descriptors from this repo's plugins/.
 *
 * Source of truth: each plugin's .codex-plugin/plugin.json (rich metadata),
 * with package.json and .claude-plugin/plugin.json consulted for fallback
 * version and description data.
 *
 * Two outputs are kept in sync from the same plugin metadata:
 *
 *   plugins/marketplace.json            Codex CLI marketplace descriptor.
 *   .github/plugin/marketplace.json     Claude Code marketplace descriptor.
 *
 * Per-plugin overrides may be provided via a `marketplace` block in either
 * manifest, e.g.:
 *
 *   "marketplace": {
 *     "ref": "main",
 *     "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
 *     "category": "Testing",
 *     "version": "1.4.0"
 *   }
 *
 * Usage:
 *   node scripts/sync-marketplace.mjs                          # write both outputs
 *   node scripts/sync-marketplace.mjs --out path.json          # override Codex output path
 *   node scripts/sync-marketplace.mjs --github-out path.json   # override Claude output path
 *   node scripts/sync-marketplace.mjs --check                  # exit 1 if either is out-of-date
 *
 * Defaults to writing <repo>/plugins/marketplace.json and
 * <repo>/.github/plugin/marketplace.json so both descriptors are versioned
 * alongside the plugins they list.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pluginsDir = path.join(repoRoot, "plugins");

const REPO_URL = "https://github.com/SamMRoberts/agentic-engineering.git";
const DEFAULT_REF = "main";
const DEFAULT_POLICY = {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL"
};
const MARKETPLACE_NAME = "SamMRoberts Marketplace";
const MARKETPLACE_DISPLAY_NAME = "SamMRoberts Marketplace";
const DEFAULT_OUT = path.join(pluginsDir, "marketplace.json");

const CLAUDE_MARKETPLACE_NAME = "sammroberts-marketplace";
const CLAUDE_MARKETPLACE_DESCRIPTION = "SamMRoberts Copilot agent plugin marketplace.";
const CLAUDE_MARKETPLACE_VERSION = "1.0.0";
const CLAUDE_MARKETPLACE_OWNER = "SamMRoberts";
const DEFAULT_GITHUB_OUT = path.join(repoRoot, ".github", "plugin", "marketplace.json");
const CLAUDE_INDENT = 4;

function parseArgs(argv) {
    const args = { out: DEFAULT_OUT, githubOut: DEFAULT_GITHUB_OUT, check: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--out") args.out = path.resolve(argv[++i]);
        else if (a === "--github-out") args.githubOut = path.resolve(argv[++i]);
        else if (a === "--check") args.check = true;
        else if (a === "-h" || a === "--help") {
            console.log(
                "Usage: sync-marketplace.mjs [--out <path>] [--github-out <path>] [--check]\n" +
                "  --out <path>          Write Codex marketplace.json to <path> (default: plugins/marketplace.json)\n" +
                "  --github-out <path>   Write Claude marketplace.json to <path> (default: .github/plugin/marketplace.json)\n" +
                "  --check               Exit 1 if either file would change; do not write"
            );
            process.exit(0);
        } else {
            console.error(`Unknown argument: ${a}`);
            process.exit(2);
        }
    }
    return args;
}

function readJsonIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (err) {
        console.error(`ERROR: failed to parse ${filePath}: ${err.message}`);
        process.exit(2);
    }
}

function discoverPlugins() {
    if (!fs.existsSync(pluginsDir)) return [];
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const plugins = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(pluginsDir, entry.name);
        const codex = readJsonIfExists(path.join(dir, ".codex-plugin", "plugin.json"));
        const root = readJsonIfExists(path.join(dir, "plugin.json"));
        const claude = readJsonIfExists(path.join(dir, ".claude-plugin", "plugin.json"));
        const pkg = readJsonIfExists(path.join(dir, "package.json"));

        if (!codex && !root && !claude) {
            console.warn(`WARN: skipping ${entry.name} — no plugin.json found`);
            continue;
        }
        plugins.push({
            folderName: entry.name,
            codex,
            root,
            claude,
            pkg
        });
    }
    plugins.sort((a, b) => a.folderName.localeCompare(b.folderName));
    return plugins;
}

function buildEntry(plugin) {
    const { folderName, codex, root, claude } = plugin;
    const manifest = codex ?? claude ?? root ?? {};
    const override = manifest.marketplace ?? {};

    const name = override.name ?? manifest.name ?? folderName;
    const category =
        override.category ??
        manifest.interface?.category ??
        manifest.category ??
        "Other";
    const ref = override.ref ?? DEFAULT_REF;
    const policy = override.policy ?? DEFAULT_POLICY;

    const entry = {
        name,
        source: {
            source: "git-subdir",
            url: override.url ?? REPO_URL,
            path: `plugins/${folderName}`,
            ref
        },
        policy,
        category
    };

    // Pass through optional interface metadata when present.
    if (manifest.interface?.shortDescription) {
        entry.description = manifest.interface.shortDescription;
    } else if (manifest.description) {
        entry.description = manifest.description;
    }

    return entry;
}

function buildMarketplace(plugins) {
    return {
        name: MARKETPLACE_NAME,
        interface: { displayName: MARKETPLACE_DISPLAY_NAME },
        plugins: plugins.map(buildEntry)
    };
}

function resolvePluginVersion(plugin) {
    const override =
        plugin.codex?.marketplace?.version ??
        plugin.root?.marketplace?.version ??
        plugin.claude?.marketplace?.version;
    if (override) return override;
    return (
        plugin.codex?.version ??
        plugin.pkg?.version ??
        plugin.root?.metadata?.version ??
        plugin.claude?.version ??
        "1.0.0"
    );
}

function discoverSkills(folderName) {
    const skillsDir = path.join(pluginsDir, folderName, "skills");
    if (!fs.existsSync(skillsDir)) return [];
    return fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => fs.existsSync(path.join(skillsDir, entry.name, "SKILL.md")))
        .map((entry) => `./plugins/${folderName}/skills/${entry.name}`)
        .sort();
}

function buildClaudeEntry(plugin) {
    const { folderName, codex, claude, root } = plugin;
    const manifest = codex ?? claude ?? root ?? {};
    const override = manifest.marketplace ?? {};

    const name = override.name ?? manifest.name ?? folderName;
    const description =
        override.description ??
        manifest.interface?.shortDescription ??
        manifest.description ??
        "";
    const version = resolvePluginVersion(plugin);

    const entry = {
        name,
        source: `./plugins/${folderName}`,
        description,
        version
    };

    const skills = discoverSkills(folderName);
    if (skills.length > 0) entry.skills = skills;

    return entry;
}

function buildClaudeMarketplace(plugins) {
    return {
        name: CLAUDE_MARKETPLACE_NAME,
        metadata: {
            description: CLAUDE_MARKETPLACE_DESCRIPTION,
            version: CLAUDE_MARKETPLACE_VERSION
        },
        owner: { name: CLAUDE_MARKETPLACE_OWNER },
        plugins: plugins.map(buildClaudeEntry)
    };
}

function formatJson(value, indent = 2) {
    return JSON.stringify(value, null, indent) + "\n";
}

function main() {
    const args = parseArgs(process.argv);
    const plugins = discoverPlugins();
    const outputs = [
        {
            path: args.out,
            content: formatJson(buildMarketplace(plugins), 2),
            label: "Codex marketplace"
        },
        {
            path: args.githubOut,
            content: formatJson(buildClaudeMarketplace(plugins), CLAUDE_INDENT),
            label: "Claude marketplace"
        }
    ];

    if (args.check) {
        const stale = outputs.filter((o) => {
            const existing = fs.existsSync(o.path) ? fs.readFileSync(o.path, "utf-8") : "";
            return existing !== o.content;
        });
        if (stale.length > 0) {
            for (const o of stale) console.error(`${o.label} is out of date at ${o.path}`);
            console.error("Run: node scripts/sync-marketplace.mjs");
            process.exit(1);
        }
        console.log(`marketplace files are up to date (${plugins.length} plugin(s))`);
        return;
    }

    const writes = [];
    for (const o of outputs) {
        const existing = fs.existsSync(o.path) ? fs.readFileSync(o.path, "utf-8") : "";
        if (existing === o.content) {
            console.log(`No change for ${o.label} at ${o.path}`);
            continue;
        }
        fs.mkdirSync(path.dirname(o.path), { recursive: true });
        fs.writeFileSync(o.path, o.content, "utf-8");
        writes.push(o);
        console.log(`Wrote ${o.path} (${o.label}) with ${plugins.length} plugin(s)`);
    }
    if (writes.length > 0) {
        for (const p of plugins) console.log(`  - ${p.folderName}`);
    }
}

main();
