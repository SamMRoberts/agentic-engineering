#!/usr/bin/env node
/**
 * postinstall — ensure bin scripts are executable on Unix-like systems,
 * then register the vibe-sentinel binary on PATH via npm link so hook
 * commands work in any repository without a path prefix.
 * No-op on Windows for the chmod step (Node handles shebangs via the
 * generated .cmd wrapper).
 */

import { chmod } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = dirname(__dirname);

const bins = [
    join(pluginRoot, "bin", "vibe-sentinel.mjs"),
    join(pluginRoot, "scripts", "assumption-gate.mjs"),
    join(pluginRoot, "scripts", "change-control.mjs"),
    join(pluginRoot, "scripts", "scope-guard.mjs"),
];

await Promise.all(
    bins.map((bin) => chmod(bin, 0o755).catch(() => { }))
);

// Register the vibe-sentinel binary globally so hooks.json commands resolve
// as bare invocations (e.g. "vibe-sentinel assumption-gate init") without a
// path prefix from any workspace root.
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const link = spawnSync(npm, ["link"], { cwd: pluginRoot, stdio: "inherit" });
if (link.status !== 0) {
    console.warn(
        "WARN: npm link failed — run 'npm link' manually from the plugin " +
        "directory to register vibe-sentinel on PATH:\n" +
        `  cd ${pluginRoot}\n  npm link`
    );
}
