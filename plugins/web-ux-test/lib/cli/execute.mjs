/**
 * `web-ux-test run phase test_executed` — executes the generated Playwright spec.
 *
 * Separated from run.mjs because it requires payload (runId) and side effects.
 */

import path from "node:path";

import { readState, updateState, projectDir } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";
import { executeSpec } from "../playwright/runner.mjs";

export async function runRunTestExecuted({ cwd = process.cwd() } = {}) {
    const current = readState(cwd);
    if (!["test_reviewed", "repair_applied"].includes(current.phase)) {
        return {
            ok: false,
            errors: [`Cannot execute tests from phase "${current.phase}". Expected "test_reviewed" or "repair_applied".`]
        };
    }
    if (!current.generatedTestPath) {
        return { ok: false, errors: ["No generatedTestPath in state. Run `test generate` first."] };
    }
    const runResult = await executeSpec({
        cwd,
        specPath: current.generatedTestPath,
        planId: current.planId,
        planPath: current.planPath,
        runsDir: path.join(projectDir(cwd), "runs")
    });
    const event = current.phase === "repair_applied" && runResult.status === "passed"
        ? EVENTS.RERUN_PASSED
        : runResult.status === "passed"
            ? EVENTS.TEST_PASSED
            : EVENTS.TEST_FAILED;

    const next = await updateState((state) => {
        const r = transition(state, event, { runId: runResult.runId });
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });

    return {
        ok: true,
        phase: next.phase,
        runId: runResult.runId,
        runStatus: runResult.status,
        exitCode: runResult.exitCode,
        runDir: runResult.runDir
    };
}
