#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, "../../../bin/agent-compat.mjs");

const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
    stdio: "inherit"
});

process.exit(result.status ?? 1);
