#!/usr/bin/env node
/**
 * postinstall — ensure bin scripts are executable on Unix-like systems.
 * No-op on Windows (Node handles shebangs via the generated .cmd wrapper).
 */

import { chmod } from "node:fs/promises";
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
    bins.map((bin) => chmod(bin, 0o755).catch(() => {}))
);
