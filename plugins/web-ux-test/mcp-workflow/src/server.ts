/**
 * Thin MCP server for web-ux-test.
 *
 * Every tool delegates to the plugin's lib/ (imported via ../../lib/cli/*.mjs and
 * ../../lib/state/store.mjs). No business logic lives here — the server is a
 * marshalling layer that converts MCP inputs into CLI handler calls and shapes
 * results into the standard { ok, state, nextAllowedActions, artifacts } envelope.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { runInit } from "../../lib/cli/init.mjs";
import { runPlanCreate, runPlanValidate } from "../../lib/cli/plan.mjs";
import { runStateShow } from "../../lib/cli/state.mjs";
import { runNext, runPhase } from "../../lib/cli/run.mjs";
import { runRunTestExecuted } from "../../lib/cli/execute.mjs";
import { runFailureClassify } from "../../lib/cli/failure.mjs";
import { runRepairApply, runRepairApprove, runRepairPropose } from "../../lib/cli/repair.mjs";
import { runReportGenerate } from "../../lib/cli/report.mjs";

function ok(text: string, structured: Record<string, unknown>): CallToolResult {
    return {
        content: [{ type: "text", text }],
        structuredContent: structured
    } as CallToolResult;
}

function fail(text: string, structured: Record<string, unknown>): CallToolResult {
    return {
        isError: true,
        content: [{ type: "text", text }],
        structuredContent: structured
    } as CallToolResult;
}

interface ToolResultLike { ok: boolean }

function envelope<T extends ToolResultLike>(toolResult: T, summary: string): CallToolResult {
    // Re-read state best-effort to provide nextAllowedActions and artifacts.
    let stateShow: ReturnType<typeof runStateShow> | null = null;
    try {
        stateShow = runStateShow();
    } catch {
        stateShow = null;
    }
    const structured = {
        ok: toolResult.ok,
        state: stateShow?.ok ? stateShow.phase : null,
        nextAllowedActions: stateShow?.ok ? stateShow.nextAllowedActions : [],
        artifacts: stateShow?.ok ? stateShow.artifacts : [],
        result: toolResult as unknown as Record<string, unknown>
    };
    return toolResult.ok ? ok(summary, structured) : fail(summary, structured);
}

export function createServer(): McpServer {
    const server = new McpServer(
        { name: "web-ux-test-workflow", version: "0.1.0" },
        { capabilities: { tools: {} } }
    );

    server.registerTool(
        "create_test_plan",
        {
            title: "Create a test plan",
            description: "Record an existing test plan YAML as the active plan; advances workflow to phase plan_created.",
            inputSchema: {
                planPath: z.string().describe("Filesystem path to the plan YAML.")
            }
        },
        async ({ planPath }) => {
            const r = await runPlanCreate({ planPath });
            return envelope(r, r.ok ? `Plan created (id=${r.planId}).` : `create_test_plan failed: ${(r.errors ?? []).join("; ")}`);
        }
    );

    server.registerTool(
        "validate_test_plan",
        {
            title: "Validate a test plan",
            description: "Schema-validate a test plan YAML. Best-effort advances workflow when possible.",
            inputSchema: { planPath: z.string() }
        },
        async ({ planPath }) => {
            const r = await runPlanValidate({ planPath });
            return envelope(r, r.ok ? "Plan validation passed." : `Plan validation failed: ${(r.errors ?? []).join("; ")}`);
        }
    );

    server.registerTool(
        "get_workflow_state",
        {
            title: "Get current workflow state",
            description: "Return the current phase, allowed next actions, and known artifacts.",
            inputSchema: {}
        },
        async () => {
            try {
                const s = runStateShow();
                return ok(`Phase: ${s.phase}`, {
                    ok: true,
                    state: s.phase,
                    nextAllowedActions: s.nextAllowedActions,
                    artifacts: s.artifacts,
                    result: s
                });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                return fail(`Failed to read state: ${msg}`, { ok: false, errors: [msg] });
            }
        }
    );

    server.registerTool(
        "run_next_workflow_step",
        {
            title: "Advance the workflow by one step (no-payload events only)",
            description: "Calls the engine-suggested next event. For events requiring payloads, use the matching dedicated tool.",
            inputSchema: {}
        },
        async () => {
            const r = await runNext();
            return envelope(r, r.ok ? `Advanced ${r.fromPhase} → ${r.toPhase}` : (r.errors ?? []).join("; "));
        }
    );

    server.registerTool(
        "run_test_phase",
        {
            title: "Execute Playwright spec (phase test_executed)",
            description: "Spawns Playwright against the generated spec; advances to test_executed.",
            inputSchema: {}
        },
        async () => {
            const r = await runRunTestExecuted();
            return envelope(r, r.ok ? `Run ${r.runId} ${r.runStatus} (exit=${r.exitCode})` : (r.errors ?? []).join("; "));
        }
    );

    server.registerTool(
        "classify_latest_failure",
        {
            title: "Classify the latest failing run",
            description: "Reads .web-ux-testing/runs/<lastRunId>/ and assigns a category.",
            inputSchema: {}
        },
        async () => {
            const r = await runFailureClassify();
            return envelope(r, r.ok ? `Failure category: ${r.category}` : (r.errors ?? []).join("; "));
        }
    );

    server.registerTool(
        "propose_repair",
        {
            title: "Record a repair proposal",
            description: "Validates a repair proposal file against the schema and the path allowlist. Requires explicit approval before apply.",
            inputSchema: { proposalPath: z.string() }
        },
        async ({ proposalPath }) => {
            const r = await runRepairPropose({ proposalPath });
            return envelope(r, r.ok ? `Repair proposed: ${r.proposalId}` : (r.errors ?? []).join("; "));
        }
    );

    server.registerTool(
        "approve_repair",
        {
            title: "Approve the pending repair",
            description: "Approves the pending repair so it can be applied.",
            inputSchema: {}
        },
        async () => {
            const r = await runRepairApprove();
            return envelope(r, r.ok ? `Repair approved: ${r.approvedRepairId}` : (r.errors ?? []).join("; "));
        }
    );

    server.registerTool(
        "apply_approved_repair",
        {
            title: "Apply the approved repair",
            description: "Performs the proposal's file edits transactionally and saves a backup. Exits non-zero unless state is repair_approved.",
            inputSchema: {}
        },
        async () => {
            const r = await runRepairApply();
            return envelope(r, r.ok ? "Repair applied." : (r.errors ?? []).join("; "));
        }
    );

    server.registerTool(
        "generate_report",
        {
            title: "Generate Markdown + HTML report for the latest run",
            description: "Writes .web-ux-testing/reports/<runId>.md and .html.",
            inputSchema: {}
        },
        async () => {
            const r = await runReportGenerate();
            return envelope(r, r.ok ? "Report generated." : (r.errors ?? []).join("; "));
        }
    );

    // Optional convenience tool kept low-level (used by test harness, not the canonical workflow).
    server.registerTool(
        "init_project",
        {
            title: "Initialize project layout",
            description: "Equivalent to `web-ux-test init`. Creates .web-ux-testing/ structure.",
            inputSchema: {}
        },
        async () => {
            const r = await runInit();
            return envelope(r, r.ok ? r.message : "init failed");
        }
    );

    // `run_phase` exposed for completeness — high-level callers should prefer run_next or the specific tool.
    server.registerTool(
        "run_phase",
        {
            title: "Advance into a specific phase",
            description: "Used only for no-payload phase advances. Use dedicated tools for payload-bearing events.",
            inputSchema: { targetPhase: z.string() }
        },
        async ({ targetPhase }) => {
            if (targetPhase === "test_executed") {
                const r = await runRunTestExecuted();
                return envelope(r, r.ok ? `Phase: ${r.phase}` : (r.errors ?? []).join("; "));
            }
            const r = await runPhase({ targetPhase });
            return envelope(r, r.ok ? `Phase: ${r.toPhase}` : (r.errors ?? []).join("; "));
        }
    );

    return server;
}
