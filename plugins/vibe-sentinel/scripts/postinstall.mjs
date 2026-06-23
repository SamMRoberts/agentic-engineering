#!/usr/bin/env node
/**
 * postinstall — ensure bin scripts are executable on Unix-like systems,
 * then register the vibe-sentinel binary on PATH so hook commands work
 * in any repository without a path prefix.
 *
 * We cannot call `npm link` here because npm holds a file lock during
 * lifecycle scripts — a child npm process deadlocks waiting for that lock.
 * Instead we read npm_config_prefix (set by npm before running lifecycle
 * scripts) and create the global bin entry directly.
 */

import { chmod, symlink, unlink, writeFile } from "node:fs/promises";
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

// npm sets npm_config_prefix before running lifecycle scripts.
const prefix = process.env.npm_config_prefix;
if (!prefix) {
    console.warn(
        "WARN: npm_config_prefix not set — run 'npm link' manually from the " +
        "plugin directory to register vibe-sentinel on PATH:\n" +
        `  cd ${pluginRoot}\n  npm link`
    );
    process.exit(0);
}

const binEntry = join(pluginRoot, "bin", "vibe-sentinel.mjs");

if (process.platform === "win32") {
    // npm global bin on Windows lives directly under the prefix.
    const cmdPath = join(prefix, "vibe-sentinel.cmd");
    await writeFile(cmdPath, `@node "${binEntry}" %*\r\n`).catch((err) => {
        console.warn(`WARN: Could not write ${cmdPath}: ${err.message}\nRun 'npm link' manually from ${pluginRoot}`);
    });
} else {
    // npm global bin on Unix lives under <prefix>/bin.
    const linkPath = join(prefix, "bin", "vibe-sentinel");
    await unlink(linkPath).catch(() => { });
    await symlink(binEntry, linkPath).catch((err) => {
        console.warn(`WARN: Could not create symlink at ${linkPath}: ${err.message}\nRun 'npm link' manually from ${pluginRoot}`);
    });
}
