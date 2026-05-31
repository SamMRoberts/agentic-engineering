import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export const PLAYWRIGHT_CLI_PACKAGE = "@playwright/cli";
export const INSTALL_COMMAND = ["npm", "install", "-D", PLAYWRIGHT_CLI_PACKAGE];

function hasPlaywrightCliBin(packageRoot) {
    const binName = process.platform === "win32" ? "playwright-cli.cmd" : "playwright-cli";
    return fs.existsSync(path.join(packageRoot, "node_modules", ".bin", binName));
}

export function isPlaywrightCliAvailable({ packageRoot = process.cwd() } = {}) {
    const requireFromRoot = createRequire(path.join(packageRoot, "package.json"));
    try {
        requireFromRoot.resolve(`${PLAYWRIGHT_CLI_PACKAGE}/package.json`);
        return hasPlaywrightCliBin(packageRoot);
    } catch {
        return false;
    }
}

export function installPlaywrightCli({
    packageRoot = process.cwd(),
    spawnSyncImpl = spawnSync,
    stdio = "inherit"
} = {}) {
    const result = spawnSyncImpl(INSTALL_COMMAND[0], INSTALL_COMMAND.slice(1), {
        cwd: packageRoot,
        stdio
    });
    if (result.error) {
        return { ok: false, error: result.error.message, status: result.status ?? 1 };
    }
    if (result.status !== 0) {
        return { ok: false, status: result.status ?? 1 };
    }
    return { ok: true, status: 0 };
}

export function ensurePlaywrightCli({
    packageRoot = process.cwd(),
    spawnSyncImpl = spawnSync,
    stderr = process.stderr,
    stdio = "inherit"
} = {}) {
    if (isPlaywrightCliAvailable({ packageRoot })) {
        return { ok: true, installed: false, packageName: PLAYWRIGHT_CLI_PACKAGE };
    }

    stderr.write(`WARN: ${PLAYWRIGHT_CLI_PACKAGE} is not installed. Running: ${INSTALL_COMMAND.join(" ")}\n`);
    const install = installPlaywrightCli({ packageRoot, spawnSyncImpl, stdio });
    if (!install.ok) {
        return {
            ok: false,
            installed: false,
            packageName: PLAYWRIGHT_CLI_PACKAGE,
            errors: [
                install.error
                    ? `Failed to install ${PLAYWRIGHT_CLI_PACKAGE}: ${install.error}`
                    : `Failed to install ${PLAYWRIGHT_CLI_PACKAGE}; npm exited with status ${install.status}.`
            ]
        };
    }

    if (!isPlaywrightCliAvailable({ packageRoot })) {
        return {
            ok: false,
            installed: true,
            packageName: PLAYWRIGHT_CLI_PACKAGE,
            errors: [`Installed ${PLAYWRIGHT_CLI_PACKAGE}, but it still could not be resolved from ${packageRoot}.`]
        };
    }

    return { ok: true, installed: true, packageName: PLAYWRIGHT_CLI_PACKAGE };
}
