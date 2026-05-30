import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { validatePlan, type PlanValidationResult } from "../../lib/plan-validation.mjs";
import {
    hashPlan,
    hasUnresolvedExecution,
    latestRecordForTarget,
    type WorkflowState
} from "./workflow-state.ts";

export interface Scenario {
    id: string;
    title?: string;
    priority?: string;
    surface?: string;
    test_file?: string;
    test_command?: string;
    executable_steps?: unknown[];
    convert_to_regression_test?: boolean;
}

export interface TestPlan {
    target?: {
        url?: string;
        stage?: string;
        auth_strategy?: string;
        dev_command?: string;
    };
    runner?: string;
    cli_session?: {
        test_command?: string;
        test_dir?: string;
    };
    safety?: {
        destructive_actions_allowed?: boolean;
    };
    scenarios?: Scenario[];
}

export interface PlanSummary {
    plan: TestPlan;
    planHash: string;
    validation: PlanValidationResult;
    runner: string | null;
    scenarioIds: string[];
    destructiveScenarioIds: string[];
    regressionCandidateIds: string[];
    cliTargetAvailable: boolean;
    targetStage: string | null;
}

export interface ExecutionTarget {
    targetId: string;
    scenarioId?: string;
    runner: string;
    kind: "cli-plan-command" | "cli-plan-dir" | "cli-scenario" | "mcp-scenario";
    testCommand?: string;
    testDir?: string;
    testFile?: string;
    executableSteps?: unknown[];
    title?: string;
}

export function parsePlanYaml(planYaml: string): TestPlan {
    const parsed = YAML.parse(planYaml);
    if (!parsed || typeof parsed !== "object") {
        throw new Error("Plan YAML must parse to an object.");
    }
    return parsed as TestPlan;
}

export async function readPlanFile(planPath: string): Promise<{ planYaml: string; plan: TestPlan }> {
    const planYaml = await fs.readFile(planPath, "utf-8");
    return { planYaml, plan: parsePlanYaml(planYaml) };
}

export function isDestructiveScenario(scenario: Scenario): boolean {
    const text = `${scenario.id} ${scenario.title ?? ""}`;
    return /delete|remove|pay|purchase|charge|transfer|wipe|send|submit|create|update/i.test(text)
        && scenario.priority === "P1";
}

function hasCliTarget(scenario: Scenario): boolean {
    return Boolean(
        (typeof scenario.test_file === "string" && scenario.test_file.trim().length > 0)
        || (typeof scenario.test_command === "string" && scenario.test_command.trim().length > 0)
        || (Array.isArray(scenario.executable_steps) && scenario.executable_steps.length > 0)
    );
}

export function summarizePlan(plan: TestPlan): PlanSummary {
    const validation = validatePlan(plan);
    const scenarios = Array.isArray(plan.scenarios) ? plan.scenarios : [];
    const runner = typeof plan.runner === "string" ? plan.runner : null;
    const regressionCandidateIds = scenarios
        .filter((scenario) => scenario.convert_to_regression_test === true)
        .map((scenario) => scenario.id);
    const cliTargetAvailable = Boolean(
        (typeof plan.cli_session?.test_command === "string" && plan.cli_session.test_command.trim().length > 0)
        || (typeof plan.cli_session?.test_dir === "string" && plan.cli_session.test_dir.trim().length > 0)
        || scenarios.some(hasCliTarget)
    );

    return {
        plan,
        planHash: hashPlan(plan),
        validation,
        runner,
        scenarioIds: scenarios.map((scenario) => scenario.id),
        destructiveScenarioIds: scenarios.filter(isDestructiveScenario).map((scenario) => scenario.id),
        regressionCandidateIds,
        cliTargetAvailable,
        targetStage: typeof plan.target?.stage === "string" ? plan.target.stage : null
    };
}

export function buildExecutionTargets(summary: PlanSummary): ExecutionTarget[] {
    const runner = summary.runner ?? "unknown";
    const plan = summary.plan;
    const scenarios = Array.isArray(plan.scenarios) ? plan.scenarios : [];

    if (runner === "playwright-cli") {
        if (typeof plan.cli_session?.test_command === "string" && plan.cli_session.test_command.trim().length > 0) {
            return [{ targetId: "cli-plan-command", runner, kind: "cli-plan-command", testCommand: plan.cli_session.test_command }];
        }
        if (typeof plan.cli_session?.test_dir === "string" && plan.cli_session.test_dir.trim().length > 0) {
            return [{ targetId: "cli-plan-dir", runner, kind: "cli-plan-dir", testDir: plan.cli_session.test_dir }];
        }
    }

    const targets: ExecutionTarget[] = [];
    for (const scenario of scenarios) {
        if (runner === "playwright-mcp") {
            targets.push({
                targetId: scenario.id,
                scenarioId: scenario.id,
                runner,
                kind: "mcp-scenario",
                title: scenario.title
            });
            continue;
        }

        if ((runner === "playwright-cli" || runner === "hybrid") && hasCliTarget(scenario)) {
            targets.push({
                targetId: scenario.id,
                scenarioId: scenario.id,
                runner,
                kind: "cli-scenario",
                testCommand: scenario.test_command,
                testFile: scenario.test_file,
                executableSteps: scenario.executable_steps,
                title: scenario.title
            });
        }
    }
    return targets;
}

export interface GateResult {
    allowed: boolean;
    blockers: string[];
}

export function checkExecutionGate(state: WorkflowState, summary: PlanSummary, scenarioId?: string): GateResult {
    const blockers: string[] = [];
    if (summary.validation.errors.length > 0) {
        blockers.push("Plan validation must pass before execution.");
    }
    if (!state.approvedAt || state.planHash !== summary.planHash) {
        blockers.push("Current plan hash has not been explicitly approved.");
    }
    if (summary.targetStage === "production" && !state.productionReadOnlyApproved) {
        blockers.push("Production targets require explicit read-only production approval.");
    }
    const approvedScenarios = new Set(state.approvedScenarioIds);
    const missingScenarioApprovals = scenarioId
        ? (!approvedScenarios.has(scenarioId) ? [scenarioId] : [])
        : summary.scenarioIds.filter((id) => !approvedScenarios.has(id));
    if (missingScenarioApprovals.length > 0) {
        blockers.push(`Scenario approval missing for: ${missingScenarioApprovals.join(", ")}.`);
    }
    const destructiveApprovals = new Set(state.destructiveScenarioIdsApproved);
    const missingDestructive = summary.destructiveScenarioIds.filter((id) => !destructiveApprovals.has(id));
    if (missingDestructive.length > 0) {
        blockers.push(`Destructive scenario approval missing for: ${missingDestructive.join(", ")}.`);
    }
    if ((summary.runner === "playwright-cli" || summary.runner === "hybrid") && !summary.cliTargetAvailable) {
        blockers.push("CLI or hybrid plans require a deterministic CLI target.");
    }
    if (hasUnresolvedExecution(state)) {
        blockers.push("A previous execution target is still marked running; record its result before requesting another target.");
    }
    return { allowed: blockers.length === 0, blockers };
}

export function getNextTarget(state: WorkflowState, summary: PlanSummary): ExecutionTarget | null {
    const targets = buildExecutionTargets(summary);
    for (const target of targets) {
        const record = latestRecordForTarget(state, target.targetId);
        if (!record || record.status === "pending") return target;
    }
    return null;
}

export async function ensureReportFiles(reportDir: string): Promise<{ ready: boolean; missing: string[]; files: Record<string, string> }> {
    const files = {
        plan: path.join(reportDir, "test-plan.yaml"),
        engineeringReport: path.join(reportDir, "engineering-report.md"),
        executiveReport: path.join(reportDir, "executive-report.html")
    };
    const missing: string[] = [];
    for (const [label, filePath] of Object.entries(files)) {
        try {
            await fs.access(filePath);
        } catch {
            missing.push(label);
        }
    }
    return { ready: missing.length === 0, missing, files };
}
