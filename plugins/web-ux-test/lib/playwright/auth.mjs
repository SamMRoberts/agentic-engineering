/**
 * Playwright auth helpers — storage-state setup.
 *
 * MVP: verifies that .web-ux-testing/auth/.gitignore exists and ignores artifacts.
 * Returns guidance for running `npx playwright codegen --save-storage=...`.
 */

import fs from "node:fs";
import path from "node:path";

import { projectDir } from "../state/store.mjs";

export function authDir(cwd = process.cwd()) {
    return path.join(projectDir(cwd), "auth");
}

export function isAuthGitignored(cwd = process.cwd()) {
    const gitignorePath = path.join(authDir(cwd), ".gitignore");
    if (!fs.existsSync(gitignorePath)) return false;
    const contents = fs.readFileSync(gitignorePath, "utf8");
    return /^\*$/m.test(contents);
}

export function ensureAuthGitignore(cwd = process.cwd()) {
    const dir = authDir(cwd);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, ".gitignore");
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "*\n!.gitignore\n!README.md\n");
    }
    return file;
}
