import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
    ensurePlaywrightCli,
    INSTALL_COMMAND,
    installPlaywrightCli,
    isPlaywrightCliAvailable
} from "../../lib/playwright/ensure-cli.mjs";

function mktmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "wux-pw-cli-"));
}

function writePackage(root) {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", version: "0.0.0" }));
}

function writePlaywrightCliPackage(root) {
    const pkgDir = path.join(root, "node_modules", "@playwright", "cli");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: "@playwright/cli", version: "0.0.0" }));
    const binDir = path.join(root, "node_modules", ".bin");
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, process.platform === "win32" ? "playwright-cli.cmd" : "playwright-cli"), "");
}

test("isPlaywrightCliAvailable detects local @playwright/cli package", () => {
    const root = mktmp();
    writePackage(root);
    assert.equal(isPlaywrightCliAvailable({ packageRoot: root }), false);
    writePlaywrightCliPackage(root);
    assert.equal(isPlaywrightCliAvailable({ packageRoot: root }), true);
});

test("installPlaywrightCli runs the documented npm install command", () => {
    const root = mktmp();
    const calls = [];
    const result = installPlaywrightCli({
        packageRoot: root,
        stdio: "pipe",
        spawnSyncImpl: (cmd, args, opts) => {
            calls.push({ cmd, args, opts });
            return { status: 0 };
        }
    });
    assert.equal(result.ok, true);
    assert.deepEqual(calls.map((c) => [c.cmd, ...c.args])[0], INSTALL_COMMAND);
    assert.equal(calls[0].opts.cwd, root);
});

test("ensurePlaywrightCli skips install when package is already available", () => {
    const root = mktmp();
    writePackage(root);
    writePlaywrightCliPackage(root);
    let installCalled = false;
    const result = ensurePlaywrightCli({
        packageRoot: root,
        stdio: "pipe",
        stderr: { write() {} },
        spawnSyncImpl: () => {
            installCalled = true;
            return { status: 0 };
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.installed, false);
    assert.equal(installCalled, false);
});

test("ensurePlaywrightCli attempts install when package is missing", () => {
    const root = mktmp();
    writePackage(root);
    let installCalled = false;
    const result = ensurePlaywrightCli({
        packageRoot: root,
        stdio: "pipe",
        stderr: { write() {} },
        spawnSyncImpl: () => {
            installCalled = true;
            writePlaywrightCliPackage(root);
            return { status: 0 };
        }
    });
    assert.equal(result.ok, true);
    assert.equal(result.installed, true);
    assert.equal(installCalled, true);
});
