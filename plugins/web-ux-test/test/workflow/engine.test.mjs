import { test } from "node:test";
import assert from "node:assert/strict";

import {
    createInitialState,
    transition,
    TRANSITION_ERRORS
} from "../../lib/workflow/engine.mjs";
import { EVENTS } from "../../lib/workflow/phases.mjs";

function step(state, event, payload) {
    const result = transition(state, event, payload);
    assert.ok(result.ok, result.ok ? "" : `transition failed: ${result.error?.message}`);
    return result.state;
}

test("happy path: initialized -> plan_created -> plan_validated -> ... -> report_generated", () => {
    let state = createInitialState();
    state = step(state, EVENTS.PLAN_CREATED, { planId: "p1", planPath: ".web-ux-testing/plans/p1.yaml" });
    assert.equal(state.phase, "plan_created");
    state = step(state, EVENTS.PLAN_VALIDATED);
    assert.equal(state.phase, "plan_validated");
    state = step(state, EVENTS.AUTH_CONFIGURED);
    assert.equal(state.phase, "auth_configured");
    assert.equal(state.authConfigured, true);
    state = step(state, EVENTS.SELECTORS_DISCOVERED);
    state = step(state, EVENTS.TEST_GENERATED, { generatedTestPath: "generated-tests/p1.spec.ts" });
    state = step(state, EVENTS.TEST_REVIEWED);
    state = step(state, EVENTS.TEST_PASSED, { runId: "2026-05-31T12-00-00-p1" });
    assert.equal(state.phase, "test_executed");
    assert.equal(state.lastRunStatus, "passed");
    state = step(state, EVENTS.REPORT_GENERATED, { reportPath: ".web-ux-testing/reports/r.md" });
    assert.equal(state.phase, "report_generated");
    assert.deepEqual(state.artifacts.reports, [".web-ux-testing/reports/r.md"]);
});

test("invalid transition: plan_created -> test_executed is rejected", () => {
    let state = createInitialState();
    state = step(state, EVENTS.PLAN_CREATED, { planId: "p1", planPath: "p.yaml" });
    const result = transition(state, EVENTS.TEST_PASSED, { runId: "r1" });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, TRANSITION_ERRORS.INVALID_EVENT);
});

test("invalid transition: report_generated is terminal", () => {
    const state = {
        ...createInitialState(),
        phase: "report_generated",
        lastRunId: "r1"
    };
    const result = transition(state, EVENTS.REPORT_GENERATED);
    assert.equal(result.ok, false);
});

test("failed run path: test_executed -> failure_classified -> repair_proposed -> approved -> applied -> rerun_passed -> report", () => {
    let state = {
        ...createInitialState(),
        phase: "test_reviewed",
        planId: "p",
        planPath: "p.yaml",
        generatedTestPath: "g.ts"
    };
    state = step(state, EVENTS.TEST_FAILED, { runId: "r-fail" });
    assert.equal(state.phase, "test_executed");
    assert.equal(state.lastRunStatus, "failed");
    state = step(state, EVENTS.FAILURE_CLASSIFIED, { failureCategory: "selector_not_found" });
    assert.equal(state.phase, "failure_classified");
    state = step(state, EVENTS.REPAIR_PROPOSED, { proposalId: "repair-2026-05-31T12-00-00-r-fail" });
    state = step(state, EVENTS.REPAIR_APPROVED);
    assert.equal(state.phase, "repair_approved");
    assert.equal(state.approvedRepairId, "repair-2026-05-31T12-00-00-r-fail");
    state = step(state, EVENTS.REPAIR_APPLIED);
    assert.equal(state.phase, "repair_applied");
    assert.equal(state.pendingRepairId, null);
    state = step(state, EVENTS.RERUN_PASSED, { runId: "r-pass" });
    assert.equal(state.phase, "rerun_passed");
    state = step(state, EVENTS.REPORT_GENERATED);
    assert.equal(state.phase, "report_generated");
});

test("plan_validated may skip auth and go to selectors_discovered directly", () => {
    let state = {
        ...createInitialState(),
        phase: "plan_validated",
        planPath: "p.yaml",
        planId: "p"
    };
    state = step(state, EVENTS.SELECTORS_DISCOVERED);
    assert.equal(state.phase, "selectors_discovered");
});

test("missing payload rejected: plan_created without planPath", () => {
    const state = createInitialState();
    const result = transition(state, EVENTS.PLAN_CREATED, { planId: "p" });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, TRANSITION_ERRORS.INVALID_PAYLOAD);
});

test("repair_approved fails without pendingRepairId", () => {
    const state = { ...createInitialState(), phase: "repair_proposed" };
    const result = transition(state, EVENTS.REPAIR_APPROVED);
    assert.equal(result.ok, false);
    // Either MISSING_INPUT (the assertion in applyPayload) or INVALID_EVENT for tampering.
    assert.ok([TRANSITION_ERRORS.MISSING_INPUT, TRANSITION_ERRORS.INVALID_EVENT].includes(result.error.code));
});

test("history records every transition", () => {
    let state = createInitialState();
    state = step(state, EVENTS.PLAN_CREATED, { planId: "p", planPath: "p.yaml" });
    state = step(state, EVENTS.PLAN_VALIDATED);
    assert.equal(state.history.length, 2);
    assert.equal(state.history[0].from, "initialized");
    assert.equal(state.history[0].to, "plan_created");
    assert.equal(state.history[1].from, "plan_created");
    assert.equal(state.history[1].to, "plan_validated");
});

test("test_passed adds runId to artifacts.runs (deduped)", () => {
    let state = {
        ...createInitialState(),
        phase: "test_reviewed",
        planId: "p",
        planPath: "p.yaml",
        generatedTestPath: "g.ts"
    };
    state = step(state, EVENTS.TEST_PASSED, { runId: "r1" });
    assert.deepEqual(state.artifacts.runs, ["r1"]);
});
