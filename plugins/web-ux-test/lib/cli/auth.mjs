/**
 * `web-ux-test auth ...` — scaffold the storage-state auth setup.
 *
 * MVP behavior: ensures .web-ux-testing/auth/.gitignore and a setup script
 * stub exist, then advances the workflow to `auth_configured`. Full
 * interactive capture is deferred to the user via Playwright codegen.
 */

import fs from "node:fs";
import path from "node:path";

import { projectDir, updateState } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";

const SETUP_SNIPPET = `// web-ux-test: storage-state auth capture template.
// Run via: npx playwright codegen --save-storage=.web-ux-testing/auth/user.json
//
// 1. Sign in interactively in the launched browser.
// 2. Close the browser; codegen writes user.json.
// 3. Reference user.json from your plan's auth.storageStatePath.
//
// Never commit user.json (gitignored by default).
`;

export async function runAuthSetup({ cwd = process.cwd() } = {}) {
    const authDir = path.join(projectDir(cwd), "auth");
    fs.mkdirSync(authDir, { recursive: true });
    const gitignore = path.join(authDir, ".gitignore");
    if (!fs.existsSync(gitignore)) {
        fs.writeFileSync(gitignore, "*\n!.gitignore\n!README.md\n");
    }
    const setupNote = path.join(authDir, "SETUP.md");
    if (!fs.existsSync(setupNote)) {
        fs.writeFileSync(setupNote, SETUP_SNIPPET);
    }
    const next = await updateState((state) => {
        const r = transition(state, EVENTS.AUTH_CONFIGURED);
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return {
        ok: true,
        phase: next.phase,
        authDir,
        message: `Auth scaffolding ready at ${authDir}. Run \`npx playwright codegen --save-storage=${path.join(authDir, "user.json")} <url>\` to capture a session.`
    };
}
