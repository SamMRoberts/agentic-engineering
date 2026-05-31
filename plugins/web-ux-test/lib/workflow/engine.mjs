/**
 * Pure workflow transition engine.
 *
 * No I/O. Consumes a state object (matching schemas/workflow-state.schema.yaml)
 * plus an event, returns either { ok: true, state } or { ok: false, error }.
 *
 * The engine validates:
 *   1. current phase exists
 *   2. event is allowed from the current phase
 *   3. required state inputs for the target phase are present
 *
 * Side effects (file writes, command execution) live in ../state/store.mjs
 * and the CLI command layer.
 */

import { EVENTS, PHASE_META, TRANSITIONS, isKnownPhase } from "./phases.mjs";

export class TransitionError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = "TransitionError";
        this.code = code;
        this.details = details;
    }
}

export const TRANSITION_ERRORS = Object.freeze({
    UNKNOWN_PHASE: "unknown_phase",
    INVALID_EVENT: "invalid_event",
    MISSING_INPUT: "missing_input",
    INVALID_PAYLOAD: "invalid_payload"
});

function nowIso() {
    return new Date().toISOString();
}

function hasValue(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.length === 0) return false;
    return true;
}

function missingInputsFor(phase, state) {
    const meta = PHASE_META[phase];
    if (!meta) return [];
    return meta.requiredInputs.filter((key) => !hasValue(state[key]));
}

/**
 * Apply event-specific payload updates to the state prior to phase transition.
 * Centralizing this keeps the engine pure and makes invalid payloads detectable
 * before we mutate `phase`.
 */
function applyPayload(state, event, payload) {
    const next = { ...state };
    switch (event) {
        case EVENTS.PLAN_CREATED:
            if (!hasValue(payload?.planPath) || !hasValue(payload?.planId)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.INVALID_PAYLOAD,
                    "plan_created requires payload { planId, planPath }"
                );
            }
            next.planId = payload.planId;
            next.planPath = payload.planPath;
            break;
        case EVENTS.AUTH_CONFIGURED:
            next.authConfigured = true;
            break;
        case EVENTS.TEST_GENERATED:
            if (!hasValue(payload?.generatedTestPath)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.INVALID_PAYLOAD,
                    "test_generated requires payload { generatedTestPath }"
                );
            }
            next.generatedTestPath = payload.generatedTestPath;
            break;
        case EVENTS.TEST_PASSED:
        case EVENTS.TEST_FAILED: {
            if (!hasValue(payload?.runId)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.INVALID_PAYLOAD,
                    `${event} requires payload { runId }`
                );
            }
            next.lastRunId = payload.runId;
            next.lastRunStatus = event === EVENTS.TEST_PASSED ? "passed" : "failed";
            next.artifacts = {
                ...next.artifacts,
                runs: dedupePush(next.artifacts?.runs, payload.runId)
            };
            break;
        }
        case EVENTS.FAILURE_CLASSIFIED:
            if (!hasValue(payload?.failureCategory)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.INVALID_PAYLOAD,
                    "failure_classified requires payload { failureCategory }"
                );
            }
            next.lastFailureCategory = payload.failureCategory;
            break;
        case EVENTS.REPAIR_PROPOSED:
            if (!hasValue(payload?.proposalId)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.INVALID_PAYLOAD,
                    "repair_proposed requires payload { proposalId }"
                );
            }
            next.pendingRepairId = payload.proposalId;
            next.artifacts = {
                ...next.artifacts,
                repairs: dedupePush(next.artifacts?.repairs, payload.proposalId)
            };
            break;
        case EVENTS.REPAIR_APPROVED:
            if (!hasValue(state.pendingRepairId)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.MISSING_INPUT,
                    "repair_approved requires pendingRepairId to be set"
                );
            }
            next.approvedRepairId = state.pendingRepairId;
            break;
        case EVENTS.REPAIR_APPLIED:
            if (!hasValue(state.approvedRepairId)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.MISSING_INPUT,
                    "repair_applied requires approvedRepairId to be set"
                );
            }
            // Clear pending after apply; keep approved for traceability.
            next.pendingRepairId = null;
            break;
        case EVENTS.RERUN_PASSED:
            if (!hasValue(payload?.runId)) {
                throw new TransitionError(
                    TRANSITION_ERRORS.INVALID_PAYLOAD,
                    "rerun_passed requires payload { runId }"
                );
            }
            next.lastRunId = payload.runId;
            next.lastRunStatus = "passed";
            next.artifacts = {
                ...next.artifacts,
                runs: dedupePush(next.artifacts?.runs, payload.runId)
            };
            break;
        case EVENTS.REPORT_GENERATED:
            if (hasValue(payload?.reportPath)) {
                next.artifacts = {
                    ...next.artifacts,
                    reports: dedupePush(next.artifacts?.reports, payload.reportPath)
                };
            }
            break;
        default:
            break;
    }
    return next;
}

function dedupePush(list, value) {
    const arr = Array.isArray(list) ? [...list] : [];
    if (!arr.includes(value)) arr.push(value);
    return arr;
}

/**
 * Compute the next state for (state, event, payload?).
 * Returns { ok: true, state } on success, { ok: false, error } on failure.
 */
export function transition(state, event, payload = {}) {
    try {
        if (!isKnownPhase(state.phase)) {
            return failure(TRANSITION_ERRORS.UNKNOWN_PHASE, `Unknown current phase: ${state.phase}`);
        }
        const eventsForPhase = TRANSITIONS[state.phase] ?? {};
        const targetPhase = eventsForPhase[event];
        if (!targetPhase) {
            return failure(
                TRANSITION_ERRORS.INVALID_EVENT,
                `Event "${event}" is not allowed from phase "${state.phase}". Allowed: ${Object.keys(eventsForPhase).join(", ") || "(none)"}`
            );
        }
        const updated = applyPayload(state, event, payload);
        const missing = missingInputsFor(targetPhase, updated);
        if (missing.length > 0) {
            return failure(
                TRANSITION_ERRORS.MISSING_INPUT,
                `Cannot enter phase "${targetPhase}" without required inputs: ${missing.join(", ")}`,
                { missing }
            );
        }
        const next = {
            ...updated,
            phase: targetPhase,
            history: [
                ...(updated.history ?? []),
                {
                    from: state.phase,
                    to: targetPhase,
                    event,
                    at: nowIso(),
                    ...(payload?.note ? { note: payload.note } : {})
                }
            ]
        };
        return { ok: true, state: next };
    } catch (err) {
        if (err instanceof TransitionError) {
            return failure(err.code, err.message, err.details);
        }
        throw err;
    }
}

function failure(code, message, details = {}) {
    return {
        ok: false,
        error: new TransitionError(code, message, details)
    };
}

/**
 * Create a brand new state object matching the workflow-state schema defaults.
 */
export function createInitialState() {
    return {
        version: 1,
        phase: "initialized",
        planId: null,
        planPath: null,
        generatedTestPath: null,
        authConfigured: false,
        lastRunId: null,
        lastRunStatus: null,
        lastFailureCategory: null,
        pendingRepairId: null,
        approvedRepairId: null,
        history: [],
        artifacts: { runs: [], reports: [], repairs: [] }
    };
}

/**
 * Suggest the next legal event for the current phase. Used by `run next`.
 * Returns null when the phase is terminal or genuinely ambiguous.
 */
export function suggestNextEvent(state) {
    const events = Object.keys(TRANSITIONS[state.phase] ?? {});
    if (events.length === 0) return null;
    // Disambiguate test_executed by run status.
    if (state.phase === "test_executed") {
        return state.lastRunStatus === "passed" ? EVENTS.REPORT_GENERATED : EVENTS.FAILURE_CLASSIFIED;
    }
    if (state.phase === "failure_classified") {
        return state.pendingRepairId ? EVENTS.REPAIR_PROPOSED : EVENTS.REPAIR_PROPOSED;
    }
    if (state.phase === "plan_validated") {
        // Default to skipping auth when not configured yet but plan didn't require it.
        // Caller can override by calling run phase auth_configured explicitly.
        return EVENTS.SELECTORS_DISCOVERED;
    }
    return events[0];
}
