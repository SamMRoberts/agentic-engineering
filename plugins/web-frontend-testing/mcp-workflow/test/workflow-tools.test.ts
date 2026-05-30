import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";

import {
    approveTestPlan,
    createServer,
    getNextExecutionTarget,
    recordExecutionResult,
    saveTestPlan,
    validateReportReady,
    validateTestPlan
} from "../server.ts";
import { hashPlan, readWorkflowState } from "../src/workflow-state.ts";

function basePlan(overrides: Record<string, unknown> = {}) {
    return {
        plan_version: 1,
        target: {
            url: "https://example.com",
            stage: "local",
            auth_strategy: "none"
        },
        runner: "playwright-cli",
        cli_session: {
            test_command: "npx playwright test --grep home-smoke"
        },
        safety: {
            destructive_actions_allowed: false,
            forbidden_selectors: [],
            forbidden_urls: []
        },
        scope: {
            in_scope: ["home"],
            out_of_scope: ["admin"]
        },
        scenarios: [
            {
                id: "home-smoke",
                title: "Home renders",
                priority: "P2",
                surface: "route",
                preconditions: ["app reachable"],
                steps: [{ action: "navigate", target: "/", expect: "HTTP 200 and DOM ready" }],
                success_criteria: ["primary landmark visible"],
                evidence_required: ["snapshot", "console"],
                test_command: "npx playwright test --grep home-smoke"
            }
        ],
        ...overrides
    };
}

test("createServer constructs the workflow MCP server", () => {
    const server = createServer();
    assert.equal(server.isConnected(), false);
});

async function withWorkspace<T>(fn: (workspaceRoot: string, reportDir: string) => Promise<T>): Promise<T> {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "web-frontend-workflow-"));
    const reportDir = path.join(workspaceRoot, "reports", "web-frontend-testing", "run");
    try {
        await fs.mkdir(reportDir, { recursive: true });
        return await fn(workspaceRoot, reportDir);
    } finally {
        await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
}

async function saveValidPlan(workspaceRoot: string, reportDir: string, plan = basePlan()) {
    const planYaml = YAML.stringify(plan);
    const result = await saveTestPlan({ workspaceRoot, reportDir, planYaml, confirmedWrite: true });
    assert.equal(result.written, true);
    return { plan, planYaml, result };
}

test("validateTestPlan returns a stable semantic plan hash", async () => {
    const first = await validateTestPlan({ planYaml: YAML.stringify(basePlan()) });
    const second = await validateTestPlan({ planYaml: YAML.stringify(basePlan()) });

    assert.equal(first.validation.errors.length, 0);
    assert.equal(first.planHash, second.planHash);
    assert.equal(first.planHash, hashPlan(basePlan()));
});

test("saveTestPlan refuses out-of-report plan writes", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await assert.rejects(
            saveTestPlan({
                workspaceRoot,
                reportDir,
                planPath: path.join(workspaceRoot, "outside-plan.yaml"),
                planYaml: YAML.stringify(basePlan()),
                confirmedWrite: true
            }),
            /planPath must stay inside reportDir/
        );
    });
});

test("getNextExecutionTarget blocks before approval", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir);

        const next = await getNextExecutionTarget({ workspaceRoot, reportDir });

        assert.equal(next.allowed, false);
        assert.match(next.blockers.join("\n"), /not been explicitly approved/);
        assert.equal(next.target, null);
    });
});

test("approveTestPlan records approvals for the current plan hash", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        const { result } = await saveValidPlan(workspaceRoot, reportDir);

        const approval = await approveTestPlan({ workspaceRoot, reportDir, explicitUserApproval: true });
        const state = await readWorkflowState(reportDir);

        assert.equal(approval.approved, true);
        assert.equal(state.planHash, result.summary.planHash);
        assert.equal(state.approvedScenarioIds.includes("home-smoke"), true);
    });
});

test("getNextExecutionTarget returns exactly one approved target", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir);
        await approveTestPlan({ workspaceRoot, reportDir, explicitUserApproval: true });

        const next = await getNextExecutionTarget({ workspaceRoot, reportDir });

        assert.equal(next.allowed, true);
        assert.equal(next.target?.targetId, "cli-plan-command");
    });
});

test("getNextExecutionTarget blocks after plan changes invalidate approval", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir);
        await approveTestPlan({ workspaceRoot, reportDir, explicitUserApproval: true });
        const modified = basePlan({
            scenarios: [
                {
                    ...basePlan().scenarios[0],
                    title: "Home renders modified"
                }
            ]
        });
        await fs.writeFile(path.join(reportDir, "test-plan.yaml"), YAML.stringify(modified), "utf-8");

        const next = await getNextExecutionTarget({ workspaceRoot, reportDir });

        assert.equal(next.allowed, false);
        assert.match(next.blockers.join("\n"), /Current plan hash/);
    });
});

test("approveTestPlan blocks destructive scenarios without explicit destructive approval", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir, basePlan({
            scenarios: [
                {
                    ...basePlan().scenarios[0],
                    id: "delete-account",
                    title: "Delete account",
                    priority: "P1",
                    surface: "form",
                    test_command: "npx playwright test --grep delete-account"
                }
            ]
        }));

        const approval = await approveTestPlan({ workspaceRoot, reportDir, explicitUserApproval: true });

        assert.equal(approval.approved, false);
        assert.match(approval.blockers.join("\n"), /Destructive scenario approvals missing/);
    });
});

test("approveTestPlan blocks production plans without read-only approval", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir, basePlan({
            target: {
                url: "https://example.com",
                stage: "production",
                auth_strategy: "none"
            }
        }));

        const approval = await approveTestPlan({ workspaceRoot, reportDir, explicitUserApproval: true });

        assert.equal(approval.approved, false);
        assert.match(approval.blockers.join("\n"), /productionReadOnlyApproved=true/);
    });
});

test("recordExecutionResult refuses unknown target ids", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir);
        await approveTestPlan({ workspaceRoot, reportDir, explicitUserApproval: true });

        const result = await recordExecutionResult({
            workspaceRoot,
            reportDir,
            targetId: "unknown-target",
            status: "passed"
        });

        assert.equal(result.recorded, false);
        assert.match(result.blockers.join("\n"), /Unknown execution target/);
    });
});

test("recordExecutionResult records a known target and advances target selection", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir);
        await approveTestPlan({ workspaceRoot, reportDir, explicitUserApproval: true });
        const next = await getNextExecutionTarget({ workspaceRoot, reportDir });
        assert.equal(next.allowed, true);

        const result = await recordExecutionResult({
            workspaceRoot,
            reportDir,
            targetId: next.target!.targetId,
            status: "passed"
        });
        const after = await getNextExecutionTarget({ workspaceRoot, reportDir });

        assert.equal(result.recorded, true);
        assert.equal(after.allowed, false);
        assert.equal(after.target, null);
    });
});

test("validateReportReady reports missing report artifacts", async () => {
    await withWorkspace(async (workspaceRoot, reportDir) => {
        await saveValidPlan(workspaceRoot, reportDir);

        const ready = await validateReportReady({ workspaceRoot, reportDir });

        assert.equal(ready.ready, false);
        assert.deepEqual(ready.missing.sort(), ["engineeringReport", "executiveReport"].sort());
    });
});
