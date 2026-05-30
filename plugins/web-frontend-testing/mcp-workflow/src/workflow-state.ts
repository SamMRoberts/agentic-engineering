import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type TargetStatus = "pending" | "running" | "passed" | "failed" | "blocked" | "stopped";

export interface ExecutionRecord {
    targetId: string;
    status: TargetStatus;
    summary?: string;
    artifactPaths: string[];
    findingsPaths: string[];
    recordedAt: string;
}

export interface WorkflowState {
    version: 1;
    reportDir: string;
    planPath?: string;
    planHash?: string;
    runner?: string;
    approvedAt?: string;
    approvedScenarioIds: string[];
    destructiveScenarioIdsApproved: string[];
    productionReadOnlyApproved: boolean;
    executionRecords: ExecutionRecord[];
    blockers: string[];
    updatedAt: string;
}

export interface ScopedPath {
    root: string;
    absolute: string;
}

export function resolveScopedPath(workspaceRoot: string | undefined, candidate: string, label: string): ScopedPath {
    if (!candidate || candidate.trim().length === 0) {
        throw new Error(`${label} is required.`);
    }
    const root = path.resolve(workspaceRoot ?? process.cwd());
    const absolute = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(root, candidate);
    const relative = path.relative(root, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`${label} must stay inside workspaceRoot (${root}).`);
    }
    return { root, absolute };
}

export function statePathForReportDir(reportDir: string): string {
    return path.join(reportDir, "workflow-state.json");
}

export function createInitialState(reportDir: string): WorkflowState {
    const now = new Date().toISOString();
    return {
        version: 1,
        reportDir,
        approvedScenarioIds: [],
        destructiveScenarioIdsApproved: [],
        productionReadOnlyApproved: false,
        executionRecords: [],
        blockers: [],
        updatedAt: now
    };
}

export async function readWorkflowState(reportDir: string): Promise<WorkflowState> {
    const statePath = statePathForReportDir(reportDir);
    try {
        const raw = await fs.readFile(statePath, "utf-8");
        const parsed = JSON.parse(raw) as WorkflowState;
        return {
            ...createInitialState(reportDir),
            ...parsed,
            reportDir,
            approvedScenarioIds: Array.isArray(parsed.approvedScenarioIds) ? parsed.approvedScenarioIds : [],
            destructiveScenarioIdsApproved: Array.isArray(parsed.destructiveScenarioIdsApproved)
                ? parsed.destructiveScenarioIdsApproved
                : [],
            executionRecords: Array.isArray(parsed.executionRecords) ? parsed.executionRecords : [],
            blockers: Array.isArray(parsed.blockers) ? parsed.blockers : []
        };
    } catch {
        return createInitialState(reportDir);
    }
}

export async function writeWorkflowState(state: WorkflowState): Promise<WorkflowState> {
    const updated: WorkflowState = { ...state, updatedAt: new Date().toISOString() };
    await fs.mkdir(updated.reportDir, { recursive: true });
    await fs.writeFile(statePathForReportDir(updated.reportDir), `${JSON.stringify(updated, null, 2)}\n`, "utf-8");
    return updated;
}

export function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);
        return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
}

export function hashPlan(plan: unknown): string {
    return crypto.createHash("sha256").update(stableStringify(plan)).digest("hex");
}

export function hasUnresolvedExecution(state: WorkflowState): boolean {
    return state.executionRecords.some((record) => record.status === "running");
}

export function latestRecordForTarget(state: WorkflowState, targetId: string): ExecutionRecord | undefined {
    return [...state.executionRecords].reverse().find((record) => record.targetId === targetId);
}
