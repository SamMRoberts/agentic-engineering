#!/usr/bin/env node
/**
 * vibe-sentinel launcher
 *
 * A single cross-platform entry point for all vibe-sentinel hook commands.
 * Resolves scripts relative to this file via import.meta.url, so no shell
 * variable expansion ($HOME, %USERPROFILE%) is needed in hooks.json.
 *
 * Install once:
 *   npm link   (from plugins/vibe-sentinel/)
 *
 * Then hooks.json commands become bare invocations with no path:
 *   vibe-sentinel assumption-gate init
 *   vibe-sentinel change-control drift
 *   vibe-sentinel scope-guard check
 *
 * Usage:
 *   vibe-sentinel <script> <subcommand> [--root <path>]
 *
 * Scripts: assumption-gate | change-control | scope-guard
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [script, ...args] = process.argv.slice(2);

const VALID_SCRIPTS = ["assumption-gate", "change-control", "scope-guard"];

if (!script || !VALID_SCRIPTS.includes(script)) {
    console.error(
        `Usage: vibe-sentinel <script> [args...]\n` +
        `Scripts: ${VALID_SCRIPTS.join(" | ")}`
    );
    process.exit(1);
}

const scriptPath = join(__dirname, "..", "scripts", `${script}.mjs`);

const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env: process.env
});

process.exit(result.status ?? 1);
