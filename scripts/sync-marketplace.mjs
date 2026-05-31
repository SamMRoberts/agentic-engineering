#!/usr/bin/env node
/**
 * Rebuilds the SamMRoberts marketplace.json from this repo's plugins/.
 *
 * Source of truth: each plugin's .codex-plugin/plugin.json (rich metadata).
 * Fallback: each plugin's root plugin.json (name only).
 *
 * Per-plugin overrides may be provided via a `marketplace` block in either
 * manifest, e.g.:
 *
 *   "marketplace": {
 *     "ref": "main",
 *     "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
 *     "category": "Testing"
 *   }
 *
 * Usage:
 *   node scripts/sync-marketplace.mjs                       # write to default path
 *   node scripts/sync-marketplace.mjs --out path.json       # custom output path
 *   node scripts/sync-marketplace.mjs --check               # exit 1 if out-of-date
 *
 * Defaults to writing <repo>/plugins/marketplace.json so the marketplace
 * descriptor is versioned alongside the plugins it lists. Override with --out
 * to write somewhere else (e.g. ~/.agents/plugins/marketplace.json for a
 * local-only copy).
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

function parseArgs(argv) {
    const args = { out: DEFAULT_OUT, check: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--out") args.out = path.resolve(argv[++i]);
        else if (a === "--check") args.check = true;
        else if (a === "-h" || a === "--help") {
            console.log(
                "Usage: sync-marketplace.mjs [--out <path>] [--check]\n" +
                "  --out <path>   Write marketplace.json to <path> (default: plugins/marketplace.json)\n" +
                "  --check        Exit 1 if the file would change; do not write"
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

        if (!codex && !root && !claude) {
            console.warn(`WARN: skipping ${entry.name} — no plugin.json found`);
            continue;
        }
        plugins.push({
            folderName: entry.name,
            codex,
            root,
            claude
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

function formatJson(value) {
    return JSON.stringify(value, null, 2) + "\n";
}

function main() {
    const args = parseArgs(process.argv);
    const plugins = discoverPlugins();
    const next = formatJson(buildMarketplace(plugins));

    const existing = fs.existsSync(args.out) ? fs.readFileSync(args.out, "utf-8") : "";
    const changed = existing !== next;

    if (args.check) {
        if (changed) {
            console.error(`marketplace.json is out of date at ${args.out}`);
            console.error("Run: node scripts/sync-marketplace.mjs");
            process.exit(1);
        }
        console.log(`marketplace.json is up to date (${plugins.length} plugin(s))`);
        return;
    }

    if (!changed) {
        console.log(`No change (${plugins.length} plugin(s)). Skipping write.`);
        return;
    }

    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, next, "utf-8");
    console.log(`Wrote ${args.out} with ${plugins.length} plugin(s):`);
    for (const p of plugins) console.log(`  - ${p.folderName}`);
}

main();
