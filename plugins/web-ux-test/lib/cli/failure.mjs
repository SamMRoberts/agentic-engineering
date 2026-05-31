/**
 * `web-ux-test failure ...` — classify the most recent failing run.
 */

import fs from "node:fs";
import path from "node:path";

import { readState, updateState, projectDir } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";
import { classifyRunArtifacts } from "../classifier/index.mjs";

export async function runFailureClassify({ cwd = process.cwd() } = {}) {
    const current = readState(cwd);
    if (current.phase !== "test_executed") {
        return { ok: false, errors: [`Cannot classify failure from phase "${current.phase}". Expected "test_executed".`] };
    }
    if (current.lastRunStatus !== "failed") {
        return { ok: false, errors: [`Last run did not fail (status="${current.lastRunStatus}"); nothing to classify.`] };
    }
    if (!current.lastRunId) {
        return { ok: false, errors: ["No lastRunId in state."] };
    }
    const runDir = path.join(projectDir(cwd), "runs", current.lastRunId);
    if (!fs.existsSync(runDir)) {
        return { ok: false, errors: [`Run directory not found: ${runDir}`] };
    }
    const classification = classifyRunArtifacts({ runDir });
    const next = await updateState((state) => {
        const r = transition(state, EVENTS.FAILURE_CLASSIFIED, { failureCategory: classification.category });
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return {
        ok: true,
        phase: next.phase,
        category: classification.category,
        matchedRule: classification.matchedRule,
        errorSummary: classification.errorSummary
    };
}
