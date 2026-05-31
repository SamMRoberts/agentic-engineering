/**
 * `web-ux-test test ...` — Playwright spec generation + review marker.
 * Implementations defer to lib/playwright/* and the workflow engine.
 */

import { readState, updateState } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";
import { generateSpec } from "../playwright/generator.mjs";
import { readYamlFile } from "../yaml-utils.mjs";

export async function runTestGenerate({ cwd = process.cwd(), outDir } = {}) {
    const current = readState(cwd);
    if (!current.planPath) {
        return { ok: false, errors: ["No planPath in state. Run `plan validate` first."] };
    }
    const plan = readYamlFile(current.planPath);
    const result = generateSpec({ plan, cwd, outDir });
    const next = await updateState((state) => {
        const r = transition(state, EVENTS.TEST_GENERATED, { generatedTestPath: result.specPath });
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return { ok: true, specPath: result.specPath, phase: next.phase };
}

export async function runTestReview({ cwd = process.cwd() } = {}) {
    const next = await updateState((state) => {
        const r = transition(state, EVENTS.TEST_REVIEWED);
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return { ok: true, phase: next.phase, message: "Test marked as reviewed. Run `web-ux-test run phase test_executed` to execute." };
}
