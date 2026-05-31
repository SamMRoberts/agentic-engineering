import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readYamlFile } from "../../lib/yaml-utils.mjs";
import { validateAgainstSchema } from "../../lib/schema-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, "../fixtures");

function loadFixture(name) {
    return readYamlFile(path.join(fixtureDir, name));
}

test("test-plan schema accepts the spec example", () => {
    const plan = loadFixture("plan-valid-example.yaml");
    const errors = validateAgainstSchema(plan, "test-plan.schema.yaml");
    assert.deepEqual(errors, [], `expected no errors but got: ${errors.join("; ")}`);
});

test("test-plan schema rejects missing target.baseUrl", () => {
    const plan = loadFixture("plan-invalid-missing-baseurl.yaml");
    const errors = validateAgainstSchema(plan, "test-plan.schema.yaml");
    assert.ok(errors.length >= 1, "expected at least one error");
    assert.ok(
        errors.some((e) => e.includes("baseUrl")),
        `expected error to mention baseUrl, got: ${errors.join("; ")}`
    );
});

test("test-plan schema rejects unknown action", () => {
    const plan = loadFixture("plan-invalid-bad-action.yaml");
    const errors = validateAgainstSchema(plan, "test-plan.schema.yaml");
    assert.ok(
        errors.some((e) => e.includes("action")),
        `expected error mentioning action, got: ${errors.join("; ")}`
    );
});

test("test-plan schema rejects click step missing selector", () => {
    const plan = loadFixture("plan-invalid-missing-selector.yaml");
    const errors = validateAgainstSchema(plan, "test-plan.schema.yaml");
    assert.ok(
        errors.some((e) => e.includes("selector")),
        `expected error mentioning selector, got: ${errors.join("; ")}`
    );
});

test("workflow-state schema accepts a fresh initialized state", () => {
    const state = {
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
    const errors = validateAgainstSchema(state, "workflow-state.schema.yaml");
    assert.deepEqual(errors, [], `expected no errors but got: ${errors.join("; ")}`);
});

test("workflow-state schema rejects an unknown phase", () => {
    const state = {
        version: 1,
        phase: "warp_speed",
        history: [],
        artifacts: { runs: [], reports: [], repairs: [] }
    };
    const errors = validateAgainstSchema(state, "workflow-state.schema.yaml");
    assert.ok(errors.length > 0, "expected at least one error");
});

test("run-record schema accepts a passing run", () => {
    const record = {
        runId: "2026-05-31T12-00-00-create-page-flow",
        planId: "create-page-flow",
        planPath: ".web-ux-testing/plans/create-page-flow.yaml",
        specPath: "generated-tests/create-page-flow.spec.ts",
        startedAt: "2026-05-31T12:00:00.000Z",
        finishedAt: "2026-05-31T12:00:30.000Z",
        status: "passed",
        exitCode: 0,
        browser: "chromium",
        headless: true,
        authMode: "none",
        steps: [
            { id: "goto-app", title: "Go to /", status: "passed", durationMs: 200 }
        ],
        artifacts: {
            stdoutPath: ".web-ux-testing/runs/r/playwright-stdout.txt",
            stderrPath: ".web-ux-testing/runs/r/playwright-stderr.txt"
        }
    };
    const errors = validateAgainstSchema(record, "run-record.schema.yaml");
    assert.deepEqual(errors, [], `expected no errors but got: ${errors.join("; ")}`);
});

test("repair-proposal schema accepts a well-formed proposal", () => {
    const proposal = {
        proposalId: "repair-2026-05-31T12-00-00-create-page-flow",
        runId: "2026-05-31T12-00-00-create-page-flow",
        failureCategory: "selector_not_found",
        summary: "Replace brittle text selector with a data-testid selector.",
        proposedChanges: [
            {
                file: ".web-ux-testing/plans/create-page-flow.yaml",
                reason: "Use data-testid for stability.",
                before: "text=Add New",
                after: "[data-testid='add-new-button']"
            }
        ],
        requiresApproval: true,
        approvedAt: null,
        appliedAt: null,
        backupPath: null
    };
    const errors = validateAgainstSchema(proposal, "repair-proposal.schema.yaml");
    assert.deepEqual(errors, [], `expected no errors but got: ${errors.join("; ")}`);
});

test("repair-proposal schema rejects requiresApproval=false", () => {
    const proposal = {
        proposalId: "repair-2026-05-31T12-00-00-x",
        runId: "2026-05-31T12-00-00-x",
        failureCategory: "unknown",
        summary: "Auto-apply attempt.",
        proposedChanges: [
            { file: ".web-ux-testing/plans/x.yaml", reason: "r", before: "a", after: "b" }
        ],
        requiresApproval: false
    };
    const errors = validateAgainstSchema(proposal, "repair-proposal.schema.yaml");
    assert.ok(errors.length > 0, "expected at least one error rejecting requiresApproval=false");
});

test("report-manifest schema accepts a generated report manifest", () => {
    const manifest = {
        runId: "2026-05-31T12-00-00-create-page-flow",
        planId: "create-page-flow",
        generatedAt: "2026-05-31T12:05:00.000Z",
        status: "failed",
        failureCategory: "selector_not_found",
        markdownPath: ".web-ux-testing/reports/r.md",
        htmlPath: ".web-ux-testing/reports/r.html",
        finalWorkflowPhase: "failure_classified"
    };
    const errors = validateAgainstSchema(manifest, "report-manifest.schema.yaml");
    assert.deepEqual(errors, [], `expected no errors but got: ${errors.join("; ")}`);
});
