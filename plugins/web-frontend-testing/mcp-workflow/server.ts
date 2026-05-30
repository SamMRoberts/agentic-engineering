import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
    buildExecutionTargets,
    checkExecutionGate,
    ensureReportFiles,
    getNextTarget,
    parsePlanYaml,
    readPlanFile,
    summarizePlan,
    type ExecutionTarget,
    type PlanSummary
} from "./src/plan-gates.ts";
import { scanSurfaceInventory, type SurfaceInventory } from "./src/surface-scan.ts";
import { renderLines, renderTarget, renderValidation } from "./src/text-renderers.ts";
import {
    latestRecordForTarget,
    readWorkflowState,
    resolveScopedPath,
    writeWorkflowState,
    type ExecutionRecord,
    type TargetStatus,
    type WorkflowState
} from "./src/workflow-state.ts";

const runnerSchema = z.enum(["playwright-cli", "playwright-mcp", "hybrid"]);
const stageSchema = z.enum(["local", "staging", "production"]);
const authStrategySchema = z.enum(["none", "shared", "per_test_seed", "storage_state"]);
const validationSchema = z.object({ errors: z.array(z.string()), warnings: z.array(z.string()) });

export interface IntakeValidationResult {
    decision: "allow" | "needs_clarification" | "block";
    clarifyingQuestions: string[];
    blockers: string[];
    normalized: {
        targetUrl?: string;
        devCommand?: string;
        stage?: string;
        authStrategy?: string;
        runner?: string;
        destructiveActionsAllowed?: boolean;
        showCliSession?: boolean;
        preTestAuthSessionEnabled?: boolean;
    };
}

export interface SavePlanResult {
    written: boolean;
    dryRun: boolean;
    confirmationRequired: boolean;
    planPath: string;
    summary: PlanSummary;
}

export interface ApprovalResult {
    approved: boolean;
    state: WorkflowState;
    summary: PlanSummary;
    blockers: string[];
}

export interface NextTargetResult {
    allowed: boolean;
    target: ExecutionTarget | null;
    blockers: string[];
    state: WorkflowState;
}

export interface ReportReadyResult {
    ready: boolean;
    missing: string[];
    files: Record<string, string>;
}

function okResult(text: string, structuredContent: Record<string, unknown>, isError = false): CallToolResult {
    return {
        isError,
        content: [{ type: "text", text }],
        structuredContent
    };
}

function scopedReportDir(workspaceRoot: string | undefined, reportDir: string): string {
    return resolveScopedPath(workspaceRoot, reportDir, "reportDir").absolute;
}

function scopedPlanPath(workspaceRoot: string | undefined, reportDir: string, planPath?: string): string {
    const report = scopedReportDir(workspaceRoot, reportDir);
    const candidate = planPath ?? path.join(report, "test-plan.yaml");
    const scoped = resolveScopedPath(workspaceRoot, candidate, "planPath").absolute;
    const relative = path.relative(report, scoped);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`planPath must stay inside reportDir (${report}).`);
    }
    return scoped;
}

function safeSummarize(planYaml: string): PlanSummary {
    return summarizePlan(parsePlanYaml(planYaml));
}

export function startWorkflow(input: { workspaceRoot?: string; reportDir?: string } = {}) {
    const workspaceRoot = path.resolve(input.workspaceRoot ?? process.cwd());
    const reportDir = input.reportDir
        ? resolveScopedPath(workspaceRoot, input.reportDir, "reportDir").absolute
        : path.join(workspaceRoot, "reports", "web-frontend-testing", "<timestamp>");
    return {
        workflow: "web-frontend-testing",
        primaryPath: "Use the web-frontend-testing custom orchestrator agent when the host supports custom agent selection.",
        fallbackPath: "When custom agents are unavailable, call these workflow MCP tools in order and do not execute a target until get_next_execution_target returns allowed=true.",
        stages: ["intake", "scan", "plan", "approval", "execute-one-target", "record-result", "report"],
        requiredTools: [
            "validate_intake",
            "scan_surface_inventory",
            "validate_test_plan",
            "save_test_plan",
            "approve_test_plan",
            "get_next_execution_target",
            "record_execution_result",
            "validate_report_ready"
        ],
        reportDir,
        safetyGates: [
            "Plan validation must pass before execution.",
            "The user must review/edit or approve the current plan as-is.",
            "Approval is bound to the current plan hash; plan edits require re-approval.",
            "Production targets require explicit read-only approval.",
            "Destructive scenarios require explicit scenario approval.",
            "Request and execute exactly one target at a time."
        ],
        nestedAgentGuidance: {
            whenAvailable: "Delegate to the existing private agents exactly as the custom orchestrator would.",
            whenUnavailable: "Follow the same stages inline and use this MCP server as the gatekeeper."
        }
    };
}

export function validateIntake(input: {
    targetUrl?: string;
    devCommand?: string;
    stage?: string;
    authStrategy?: string;
    runner?: string;
    inScope?: string[];
    outOfScope?: string[];
    destructiveActionsAllowed?: boolean;
    showCliSession?: boolean;
    preTestAuthSessionEnabled?: boolean;
}): IntakeValidationResult {
    const blockers: string[] = [];
    const clarifyingQuestions: string[] = [];

    if (!input.targetUrl && !input.devCommand) {
        clarifyingQuestions.push("Provide a target URL or local dev command before planning.");
    }
    if (input.targetUrl) {
        try {
            new URL(input.targetUrl);
        } catch {
            blockers.push("targetUrl must be a valid URL.");
        }
    }
    if (!input.stage) clarifyingQuestions.push("Choose target stage: local, staging, or production.");
    else if (!stageSchema.safeParse(input.stage).success) blockers.push("stage must be local, staging, or production.");

    if (!input.authStrategy) clarifyingQuestions.push("Choose auth strategy: none, shared, per_test_seed, or storage_state.");
    else if (!authStrategySchema.safeParse(input.authStrategy).success) {
        blockers.push("authStrategy must be none, shared, per_test_seed, or storage_state.");
    }

    if (!input.runner) clarifyingQuestions.push("Choose runner: playwright-cli, playwright-mcp, or hybrid.");
    else if (!runnerSchema.safeParse(input.runner).success) blockers.push("runner must be playwright-cli, playwright-mcp, or hybrid.");

    if (!Array.isArray(input.inScope) || input.inScope.length === 0) {
        clarifyingQuestions.push("List at least one in-scope route or user flow.");
    }
    if (input.destructiveActionsAllowed == null) {
        clarifyingQuestions.push("State whether destructive actions are allowed.");
    }
    if (input.stage === "production" && input.destructiveActionsAllowed === true) {
        blockers.push("Production execution cannot allow destructive actions.");
    }
    if (input.preTestAuthSessionEnabled === true && input.authStrategy === "per_test_seed") {
        blockers.push("pre_test_auth_session cannot be enabled with per_test_seed auth.");
    }

    const decision = blockers.length > 0 ? "block" : clarifyingQuestions.length > 0 ? "needs_clarification" : "allow";
    return {
        decision,
        clarifyingQuestions,
        blockers,
        normalized: {
            targetUrl: input.targetUrl,
            devCommand: input.devCommand,
            stage: input.stage,
            authStrategy: input.authStrategy,
            runner: input.runner,
            destructiveActionsAllowed: input.destructiveActionsAllowed,
            showCliSession: input.showCliSession,
            preTestAuthSessionEnabled: input.preTestAuthSessionEnabled
        }
    };
}

export async function scanInventory(input: { workspaceRoot?: string; maxFiles?: number }): Promise<SurfaceInventory> {
    const root = resolveScopedPath(input.workspaceRoot, ".", "workspaceRoot").root;
    return scanSurfaceInventory(root, input.maxFiles ?? 1000);
}

export async function validateTestPlan(input: {
    workspaceRoot?: string;
    reportDir?: string;
    planPath?: string;
    planYaml?: string;
}): Promise<PlanSummary> {
    if (input.planYaml) return safeSummarize(input.planYaml);
    if (input.reportDir) {
        const planPath = scopedPlanPath(input.workspaceRoot, input.reportDir, input.planPath);
        const { plan } = await readPlanFile(planPath);
        return summarizePlan(plan);
    }
    if (input.planPath) {
        const scoped = resolveScopedPath(input.workspaceRoot, input.planPath, "planPath").absolute;
        const { plan } = await readPlanFile(scoped);
        return summarizePlan(plan);
    }
    throw new Error("Provide planYaml, planPath, or reportDir.");
}

export async function saveTestPlan(input: {
    workspaceRoot?: string;
    reportDir: string;
    planYaml: string;
    planPath?: string;
    dryRun?: boolean;
    confirmedWrite?: boolean;
}): Promise<SavePlanResult> {
    const reportDir = scopedReportDir(input.workspaceRoot, input.reportDir);
    const planPath = scopedPlanPath(input.workspaceRoot, reportDir, input.planPath);
    const dryRun = input.dryRun === true;
    const confirmationRequired = !dryRun && input.confirmedWrite !== true;
    const summary = safeSummarize(input.planYaml);

    if (!dryRun && !confirmationRequired && summary.validation.errors.length === 0) {
        await fs.mkdir(reportDir, { recursive: true });
        await fs.writeFile(planPath, input.planYaml, "utf-8");
        const state = await readWorkflowState(reportDir);
        await writeWorkflowState({
            ...state,
            reportDir,
            planPath,
            planHash: summary.planHash,
            runner: summary.runner ?? undefined,
            approvedAt: undefined,
            approvedScenarioIds: [],
            destructiveScenarioIdsApproved: [],
            blockers: []
        });
    }

    return {
        written: !dryRun && !confirmationRequired && summary.validation.errors.length === 0,
        dryRun,
        confirmationRequired,
        planPath,
        summary
    };
}

export async function approveTestPlan(input: {
    workspaceRoot?: string;
    reportDir: string;
    planPath?: string;
    explicitUserApproval?: boolean;
    approvedScenarioIds?: string[];
    destructiveScenarioIdsApproved?: string[];
    productionReadOnlyApproved?: boolean;
}): Promise<ApprovalResult> {
    const reportDir = scopedReportDir(input.workspaceRoot, input.reportDir);
    const planPath = scopedPlanPath(input.workspaceRoot, reportDir, input.planPath);
    const { plan } = await readPlanFile(planPath);
    const summary = summarizePlan(plan);
    const blockers: string[] = [];

    if (input.explicitUserApproval !== true) blockers.push("explicitUserApproval=true is required after user approval.");
    if (summary.validation.errors.length > 0) blockers.push("Plan validation must pass before approval.");

    const approvedScenarioIds = input.approvedScenarioIds ?? summary.scenarioIds;
    const missingScenarioIds = summary.scenarioIds.filter((id) => !approvedScenarioIds.includes(id));
    if (missingScenarioIds.length > 0) blockers.push(`Scenario approvals missing for: ${missingScenarioIds.join(", ")}.`);

    const destructiveScenarioIdsApproved = input.destructiveScenarioIdsApproved ?? [];
    const missingDestructive = summary.destructiveScenarioIds.filter((id) => !destructiveScenarioIdsApproved.includes(id));
    if (missingDestructive.length > 0) {
        blockers.push(`Destructive scenario approvals missing for: ${missingDestructive.join(", ")}.`);
    }
    if (summary.targetStage === "production" && input.productionReadOnlyApproved !== true) {
        blockers.push("Production plans require productionReadOnlyApproved=true.");
    }

    let state = await readWorkflowState(reportDir);
    if (blockers.length === 0) {
        state = await writeWorkflowState({
            ...state,
            reportDir,
            planPath,
            planHash: summary.planHash,
            runner: summary.runner ?? undefined,
            approvedAt: new Date().toISOString(),
            approvedScenarioIds,
            destructiveScenarioIdsApproved,
            productionReadOnlyApproved: input.productionReadOnlyApproved === true,
            blockers: []
        });
    }
    return { approved: blockers.length === 0, state, summary, blockers };
}

export async function getNextExecutionTarget(input: {
    workspaceRoot?: string;
    reportDir: string;
    planPath?: string;
}): Promise<NextTargetResult> {
    const reportDir = scopedReportDir(input.workspaceRoot, input.reportDir);
    const planPath = scopedPlanPath(input.workspaceRoot, reportDir, input.planPath);
    const { plan } = await readPlanFile(planPath);
    const summary = summarizePlan(plan);
    const state = await readWorkflowState(reportDir);
    const target = getNextTarget(state, summary);
    const gate = checkExecutionGate(state, summary, target?.scenarioId);
    return { allowed: gate.allowed && target != null, target: gate.allowed ? target : null, blockers: gate.blockers, state };
}

export async function recordExecutionResult(input: {
    workspaceRoot?: string;
    reportDir: string;
    planPath?: string;
    targetId: string;
    status: TargetStatus;
    summary?: string;
    artifactPaths?: string[];
    findingsPaths?: string[];
}): Promise<{ recorded: boolean; state: WorkflowState; blockers: string[] }> {
    const reportDir = scopedReportDir(input.workspaceRoot, input.reportDir);
    const state = await readWorkflowState(reportDir);
    const blockers: string[] = [];
    if (!state.planHash) blockers.push("No approved plan state exists for this report directory.");
    const planPath = input.planPath ?? state.planPath;
    if (!planPath) {
        blockers.push("No plan path is recorded for this workflow state.");
    } else {
        try {
            const absolutePlanPath = scopedPlanPath(input.workspaceRoot, reportDir, planPath);
            const { plan } = await readPlanFile(absolutePlanPath);
            const targetIds = new Set(buildExecutionTargets(summarizePlan(plan)).map((target) => target.targetId));
            if (!targetIds.has(input.targetId)) blockers.push(`Unknown execution target: ${input.targetId}.`);
        } catch (error) {
            blockers.push(`Could not verify execution target: ${String(error)}`);
        }
    }
    const lastRecord = latestRecordForTarget(state, input.targetId);
    if (lastRecord && ["passed", "failed", "blocked", "stopped"].includes(lastRecord.status)) {
        blockers.push(`Target ${input.targetId} already has terminal status ${lastRecord.status}.`);
    }
    const artifactPaths = (input.artifactPaths ?? []).map((artifactPath) =>
        resolveScopedPath(input.workspaceRoot, artifactPath, "artifactPath").absolute
    );
    const findingsPaths = (input.findingsPaths ?? []).map((findingsPath) =>
        resolveScopedPath(input.workspaceRoot, findingsPath, "findingsPath").absolute
    );

    if (blockers.length > 0) return { recorded: false, state, blockers };

    const record: ExecutionRecord = {
        targetId: input.targetId,
        status: input.status,
        summary: input.summary,
        artifactPaths,
        findingsPaths,
        recordedAt: new Date().toISOString()
    };
    const updated = await writeWorkflowState({ ...state, executionRecords: [...state.executionRecords, record] });
    return { recorded: true, state: updated, blockers };
}

export async function validateReportReady(input: { workspaceRoot?: string; reportDir: string }): Promise<ReportReadyResult> {
    const reportDir = scopedReportDir(input.workspaceRoot, input.reportDir);
    return ensureReportFiles(reportDir);
}

const planSummaryOutputSchema = z.object({
    planHash: z.string(),
    validation: validationSchema,
    runner: z.string().nullable(),
    scenarioIds: z.array(z.string()),
    destructiveScenarioIds: z.array(z.string()),
    regressionCandidateIds: z.array(z.string()),
    cliTargetAvailable: z.boolean(),
    targetStage: z.string().nullable()
});

export function createServer(): McpServer {
    const server = new McpServer({ name: "Web Frontend Testing Workflow", version: "0.4.0" });

    server.registerTool(
        "start_workflow",
        {
            title: "Start Web Frontend Testing Workflow",
            description: "Return the canonical web-frontend-testing fallback runbook and safety gates for hosts that cannot select the custom orchestrator agent.",
            inputSchema: { workspaceRoot: z.string().optional(), reportDir: z.string().optional() },
            outputSchema: z.object({ workflow: z.string(), stages: z.array(z.string()), requiredTools: z.array(z.string()) }),
            annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const payload = startWorkflow(input);
            return okResult(renderLines("Web frontend testing workflow", payload.safetyGates), payload);
        }
    );

    server.registerTool(
        "validate_intake",
        {
            title: "Validate Testing Intake",
            description: "Validate target, scope, auth, runner, and destructive-action policy before planning. Returns allow, needs_clarification, or block.",
            inputSchema: {
                targetUrl: z.string().optional(),
                devCommand: z.string().optional(),
                stage: z.string().optional(),
                authStrategy: z.string().optional(),
                runner: z.string().optional(),
                inScope: z.array(z.string()).optional(),
                outOfScope: z.array(z.string()).optional(),
                destructiveActionsAllowed: z.boolean().optional(),
                showCliSession: z.boolean().optional(),
                preTestAuthSessionEnabled: z.boolean().optional()
            },
            outputSchema: z.object({ decision: z.string(), clarifyingQuestions: z.array(z.string()), blockers: z.array(z.string()) }),
            annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const payload = validateIntake(input);
            const lines = [...payload.blockers, ...payload.clarifyingQuestions];
            return okResult(
                renderLines(`Intake decision: ${payload.decision}`, lines),
                payload as unknown as Record<string, unknown>,
                payload.decision === "block"
            );
        }
    );

    server.registerTool(
        "scan_surface_inventory",
        {
            title: "Scan Frontend Surface Inventory",
            description: "Scan the workspace for likely frontend routes, existing tests, package scripts, and Playwright configs. Does not execute code or generate findings.",
            inputSchema: { workspaceRoot: z.string().optional(), maxFiles: z.number().int().positive().optional() },
            outputSchema: z.object({ workspaceRoot: z.string(), packageScripts: z.record(z.string(), z.string()) }),
            annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const payload = await scanInventory(input);
            return okResult(
                renderLines("Surface inventory", [
                    `Route files: ${payload.routeFiles.length}`,
                    `Existing tests: ${payload.existingTests.length}`,
                    `Playwright configs: ${payload.playwrightConfigs.length}`
                ]),
                payload as unknown as Record<string, unknown>
            );
        }
    );

    server.registerTool(
        "validate_test_plan",
        {
            title: "Validate Test Plan",
            description: "Validate a test-plan.yaml and return validation output, plan hash, runner metadata, destructive scenarios, regression candidates, and CLI target availability.",
            inputSchema: { workspaceRoot: z.string().optional(), reportDir: z.string().optional(), planPath: z.string().optional(), planYaml: z.string().optional() },
            outputSchema: planSummaryOutputSchema,
            annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const summary = await validateTestPlan(input);
            return okResult(renderValidation(summary), summary as unknown as Record<string, unknown>, summary.validation.errors.length > 0);
        }
    );

    server.registerTool(
        "save_test_plan",
        {
            title: "Save Test Plan",
            description: "Validate and optionally write test-plan.yaml inside the report directory. Non-dry writes require confirmedWrite=true and validation errors always refuse the write.",
            inputSchema: {
                workspaceRoot: z.string().optional(),
                reportDir: z.string(),
                planYaml: z.string(),
                planPath: z.string().optional(),
                dryRun: z.boolean().optional(),
                confirmedWrite: z.boolean().optional()
            },
            outputSchema: z.object({ written: z.boolean(), dryRun: z.boolean(), confirmationRequired: z.boolean(), planPath: z.string(), summary: planSummaryOutputSchema }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const payload = await saveTestPlan(input);
            const isError = payload.confirmationRequired || payload.summary.validation.errors.length > 0;
            return okResult(renderValidation(payload.summary), payload as unknown as Record<string, unknown>, isError);
        }
    );

    server.registerTool(
        "approve_test_plan",
        {
            title: "Approve Current Test Plan",
            description: "Record explicit user approval for the current plan hash and approved scenario ids. Required before get_next_execution_target can return a target.",
            inputSchema: {
                workspaceRoot: z.string().optional(),
                reportDir: z.string(),
                planPath: z.string().optional(),
                explicitUserApproval: z.boolean().optional(),
                approvedScenarioIds: z.array(z.string()).optional(),
                destructiveScenarioIdsApproved: z.array(z.string()).optional(),
                productionReadOnlyApproved: z.boolean().optional()
            },
            outputSchema: z.object({ approved: z.boolean(), blockers: z.array(z.string()) }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const payload = await approveTestPlan(input);
            return okResult(renderLines("Plan approval", payload.blockers), payload as unknown as Record<string, unknown>, !payload.approved);
        }
    );

    server.registerTool(
        "get_next_execution_target",
        {
            title: "Get Next Approved Execution Target",
            description: "Return exactly one approved CLI or MCP target to execute next. Blocks if approval is missing, stale, or unsafe.",
            inputSchema: { workspaceRoot: z.string().optional(), reportDir: z.string(), planPath: z.string().optional() },
            outputSchema: z.object({ allowed: z.boolean(), target: z.any().nullable(), blockers: z.array(z.string()) }),
            annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const payload = await getNextExecutionTarget(input);
            return okResult(renderTarget(payload.target, payload.blockers), payload as unknown as Record<string, unknown>, !payload.allowed);
        }
    );

    server.registerTool(
        "record_execution_result",
        {
            title: "Record Execution Result",
            description: "Record the result for one execution target after the host ran it through CLI or Playwright MCP.",
            inputSchema: {
                workspaceRoot: z.string().optional(),
                reportDir: z.string(),
                planPath: z.string().optional(),
                targetId: z.string(),
                status: z.enum(["pending", "running", "passed", "failed", "blocked", "stopped"]),
                summary: z.string().optional(),
                artifactPaths: z.array(z.string()).optional(),
                findingsPaths: z.array(z.string()).optional()
            },
            outputSchema: z.object({ recorded: z.boolean(), blockers: z.array(z.string()) }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
        },
        async (input) => {
            const payload = await recordExecutionResult(input);
            return okResult(renderLines("Execution result", payload.blockers), payload as unknown as Record<string, unknown>, !payload.recorded);
        }
    );

    server.registerTool(
        "validate_report_ready",
        {
            title: "Validate Report Readiness",
            description: "Check that test-plan.yaml, engineering-report.md, and executive-report.html exist before opening the report viewer.",
            inputSchema: { workspaceRoot: z.string().optional(), reportDir: z.string() },
            outputSchema: z.object({ ready: z.boolean(), missing: z.array(z.string()), files: z.record(z.string(), z.string()) }),
            annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
        },
        async (input) => {
            const payload = await validateReportReady(input);
            return okResult(
                renderLines("Report readiness", payload.missing),
                payload as unknown as Record<string, unknown>,
                !payload.ready
            );
        }
    );

    return server;
}
