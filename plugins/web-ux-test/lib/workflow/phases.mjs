/**
 * Workflow phases and the transition table.
 *
 * Each phase declares:
 *   - id: stable string id (matches schemas/workflow-state.schema.yaml#properties.phase enum)
 *   - requiredInputs: state fields that must be non-null before entering this phase
 *   - allowedCommands: CLI command ids that can advance from / operate within this phase
 *   - next: ordered list of phases this one may transition to (event-keyed)
 *
 * The engine in ./engine.mjs is pure: it consumes (state, event) and returns either
 * { ok: true, state: nextState } or { ok: false, error }. All I/O lives in ../state/store.mjs.
 */

export const PHASES = [
    "initialized",
    "plan_created",
    "plan_validated",
    "auth_configured",
    "selectors_discovered",
    "test_skeleton_generated",
    "test_reviewed",
    "test_executed",
    "failure_classified",
    "repair_proposed",
    "repair_approved",
    "repair_applied",
    "rerun_passed",
    "report_generated"
];

export const PHASE_SET = new Set(PHASES);

/**
 * Events drive transitions. Each event name corresponds to a CLI command outcome
 * or an external signal (e.g. "test_failed" comes from a failing Playwright run).
 */
export const EVENTS = Object.freeze({
    PLAN_CREATED: "plan_created",
    PLAN_VALIDATED: "plan_validated",
    AUTH_CONFIGURED: "auth_configured",
    SELECTORS_DISCOVERED: "selectors_discovered",
    TEST_GENERATED: "test_generated",
    TEST_REVIEWED: "test_reviewed",
    TEST_PASSED: "test_passed",
    TEST_FAILED: "test_failed",
    FAILURE_CLASSIFIED: "failure_classified",
    REPAIR_PROPOSED: "repair_proposed",
    REPAIR_APPROVED: "repair_approved",
    REPAIR_APPLIED: "repair_applied",
    RERUN_PASSED: "rerun_passed",
    REPORT_GENERATED: "report_generated"
});

/**
 * Transition table. Key: current phase. Value: map of event -> next phase.
 * Any (phase, event) pair not present is an invalid transition.
 */
export const TRANSITIONS = Object.freeze({
    initialized: {
        [EVENTS.PLAN_CREATED]: "plan_created"
    },
    plan_created: {
        [EVENTS.PLAN_VALIDATED]: "plan_validated"
    },
    plan_validated: {
        [EVENTS.AUTH_CONFIGURED]: "auth_configured",
        // Auth is optional — allow skipping straight to selectors when plan.auth.required is false.
        [EVENTS.SELECTORS_DISCOVERED]: "selectors_discovered"
    },
    auth_configured: {
        [EVENTS.SELECTORS_DISCOVERED]: "selectors_discovered"
    },
    selectors_discovered: {
        [EVENTS.TEST_GENERATED]: "test_skeleton_generated"
    },
    test_skeleton_generated: {
        [EVENTS.TEST_REVIEWED]: "test_reviewed"
    },
    test_reviewed: {
        [EVENTS.TEST_PASSED]: "test_executed",
        [EVENTS.TEST_FAILED]: "test_executed"
    },
    test_executed: {
        // Passed runs go directly to report_generated.
        [EVENTS.REPORT_GENERATED]: "report_generated",
        // Failed runs must be classified next.
        [EVENTS.FAILURE_CLASSIFIED]: "failure_classified"
    },
    failure_classified: {
        [EVENTS.REPAIR_PROPOSED]: "repair_proposed",
        // Allow finishing with a report even when no repair is attempted.
        [EVENTS.REPORT_GENERATED]: "report_generated"
    },
    repair_proposed: {
        [EVENTS.REPAIR_APPROVED]: "repair_approved"
    },
    repair_approved: {
        [EVENTS.REPAIR_APPLIED]: "repair_applied"
    },
    repair_applied: {
        [EVENTS.RERUN_PASSED]: "rerun_passed",
        [EVENTS.TEST_FAILED]: "test_executed"
    },
    rerun_passed: {
        [EVENTS.REPORT_GENERATED]: "report_generated"
    },
    report_generated: {
        // Terminal in this run; a new run resets state.
    }
});

/**
 * Phase metadata used by CLI and MCP layers for gating and discoverability.
 * Kept inline-narrow so adding a phase doesn't require touching multiple files.
 */
export const PHASE_META = Object.freeze({
    initialized: {
        allowedCommands: ["init", "plan create"],
        requiredInputs: [],
        requiredOutputs: ["planPath"],
        nextHint: "plan create"
    },
    plan_created: {
        allowedCommands: ["plan validate"],
        requiredInputs: ["planPath"],
        requiredOutputs: [],
        nextHint: "plan validate"
    },
    plan_validated: {
        allowedCommands: ["auth setup", "selectors discover"],
        requiredInputs: ["planPath"],
        requiredOutputs: [],
        nextHint: "auth setup"
    },
    auth_configured: {
        allowedCommands: ["selectors discover"],
        requiredInputs: ["planPath", "authConfigured"],
        requiredOutputs: [],
        nextHint: "selectors discover"
    },
    selectors_discovered: {
        allowedCommands: ["test generate"],
        requiredInputs: ["planPath"],
        requiredOutputs: ["generatedTestPath"],
        nextHint: "test generate"
    },
    test_skeleton_generated: {
        allowedCommands: ["test review"],
        requiredInputs: ["generatedTestPath"],
        requiredOutputs: [],
        nextHint: "test review"
    },
    test_reviewed: {
        allowedCommands: ["run phase test_executed"],
        requiredInputs: ["generatedTestPath"],
        requiredOutputs: [],
        nextHint: "run phase test_executed"
    },
    test_executed: {
        allowedCommands: ["failure classify", "report generate"],
        requiredInputs: ["lastRunId", "lastRunStatus"],
        requiredOutputs: [],
        nextHint: "report generate (passed) or failure classify (failed)"
    },
    failure_classified: {
        allowedCommands: ["repair propose", "report generate"],
        requiredInputs: ["lastFailureCategory"],
        requiredOutputs: [],
        nextHint: "repair propose or report generate"
    },
    repair_proposed: {
        allowedCommands: ["repair approve"],
        requiredInputs: ["pendingRepairId"],
        requiredOutputs: [],
        nextHint: "repair approve"
    },
    repair_approved: {
        allowedCommands: ["repair apply"],
        requiredInputs: ["approvedRepairId"],
        requiredOutputs: [],
        nextHint: "repair apply"
    },
    repair_applied: {
        allowedCommands: ["run phase test_executed"],
        requiredInputs: ["approvedRepairId"],
        requiredOutputs: [],
        nextHint: "run phase test_executed"
    },
    rerun_passed: {
        allowedCommands: ["report generate"],
        requiredInputs: ["lastRunId"],
        requiredOutputs: [],
        nextHint: "report generate"
    },
    report_generated: {
        allowedCommands: [],
        requiredInputs: ["lastRunId"],
        requiredOutputs: [],
        nextHint: "(terminal)"
    }
});

export function nextEventsFor(phase) {
    return Object.keys(TRANSITIONS[phase] ?? {});
}

export function isKnownPhase(phase) {
    return PHASE_SET.has(phase);
}
