/**
 * `web-ux-test init` — materialize .web-ux-testing/ project layout.
 *
 * Idempotent for sub-directory creation; refuses to overwrite an existing state.json.
 */

import fs from "node:fs";
import path from "node:path";

import { initState, isInitialized, projectDir } from "../state/store.mjs";

const SUBDIRS = ["plans", "runs", "reports", "auth", "generated-tests"];

const AUTH_GITIGNORE = `# web-ux-test: never commit auth artifacts.
*
!.gitignore
!README.md
`;

const AUTH_README = `# Auth storage

This directory holds Playwright \`storageState\` files used by the web-ux-test runner.

**Never commit anything here other than this README and the .gitignore.** The
\`deny-auth-credentials\` PreToolUse hook actively rejects writes that contain
credential-shaped literals; the runner expects to load saved sessions from JSON
files in this directory.

See \`docs/auth.md\` for the recommended capture flow.
`;

const PROJECT_YAML = `# web-ux-test project configuration.
# Currently advisory; future versions may consume this for default browser/headless.
version: 1
defaults:
  browser: chromium
  headless: true
  timeoutMs: 60000
`;

export async function runInit({ cwd = process.cwd(), force = false } = {}) {
    const root = projectDir(cwd);
    fs.mkdirSync(root, { recursive: true });
    for (const sub of SUBDIRS) {
        fs.mkdirSync(path.join(root, sub), { recursive: true });
    }
    const authGitignore = path.join(root, "auth", ".gitignore");
    if (!fs.existsSync(authGitignore)) fs.writeFileSync(authGitignore, AUTH_GITIGNORE);
    const authReadme = path.join(root, "auth", "README.md");
    if (!fs.existsSync(authReadme)) fs.writeFileSync(authReadme, AUTH_README);
    const projectYaml = path.join(root, "project.yaml");
    if (!fs.existsSync(projectYaml)) fs.writeFileSync(projectYaml, PROJECT_YAML);

    if (isInitialized(cwd) && !force) {
        return {
            ok: true,
            already: true,
            projectDir: root,
            message: `Project already initialized at ${root}.`
        };
    }
    if (isInitialized(cwd) && force) {
        fs.unlinkSync(path.join(root, "state.json"));
    }
    await initState({ cwd });
    return {
        ok: true,
        already: false,
        projectDir: root,
        message: `Initialized web-ux-test project at ${root}.`
    };
}
