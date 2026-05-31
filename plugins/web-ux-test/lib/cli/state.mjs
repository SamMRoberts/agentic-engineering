/**
 * `web-ux-test state ...` commands.
 */

import { readState } from "../state/store.mjs";
import { nextEventsFor, PHASE_META } from "../workflow/phases.mjs";
import { validateAgainstSchema } from "../schema-utils.mjs";

export function runStateShow({ cwd = process.cwd() } = {}) {
    const state = readState(cwd);
    const meta = PHASE_META[state.phase] ?? { allowedCommands: [], nextHint: "(unknown)" };
    return {
        ok: true,
        phase: state.phase,
        planId: state.planId,
        planPath: state.planPath,
        generatedTestPath: state.generatedTestPath,
        lastRunId: state.lastRunId,
        lastRunStatus: state.lastRunStatus,
        lastFailureCategory: state.lastFailureCategory,
        pendingRepairId: state.pendingRepairId,
        approvedRepairId: state.approvedRepairId,
        nextAllowedActions: meta.allowedCommands,
        nextHint: meta.nextHint,
        allowedEvents: nextEventsFor(state.phase),
        artifacts: state.artifacts
    };
}

export function runStateValidate({ cwd = process.cwd() } = {}) {
    let state;
    try {
        state = readState(cwd);
    } catch (err) {
        return { ok: false, errors: [err.message] };
    }
    const errors = validateAgainstSchema(state, "workflow-state.schema.yaml");
    return errors.length === 0
        ? { ok: true, errors: [] }
        : { ok: false, errors };
}
