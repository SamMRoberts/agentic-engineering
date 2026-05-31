#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensurePlaywrightCli, INSTALL_COMMAND, PLAYWRIGHT_CLI_PACKAGE } from "../lib/playwright/ensure-cli.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

const result = ensurePlaywrightCli({ packageRoot });

if (!result.ok) {
    process.stderr.write(`ERROR: ${(result.errors ?? [`Unable to ensure ${PLAYWRIGHT_CLI_PACKAGE}.`]).join("\n")}\n`);
    process.stderr.write(`Run manually from ${packageRoot}: ${INSTALL_COMMAND.join(" ")}\n`);
    process.exit(1);
}

process.stdout.write(
    result.installed
        ? `${PLAYWRIGHT_CLI_PACKAGE} installed.\n`
        : `${PLAYWRIGHT_CLI_PACKAGE} is already installed.\n`
);
