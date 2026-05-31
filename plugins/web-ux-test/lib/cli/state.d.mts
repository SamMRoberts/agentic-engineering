export interface StateShowResult {
    ok: boolean;
    phase: string;
    planId: string | null;
    planPath: string | null;
    generatedTestPath: string | null;
    lastRunId: string | null;
    lastRunStatus: string | null;
    lastFailureCategory: string | null;
    pendingRepairId: string | null;
    approvedRepairId: string | null;
    nextAllowedActions: string[];
    nextHint: string;
    allowedEvents: string[];
    artifacts: Record<string, unknown>;
}
export function runStateShow(opts?: { cwd?: string }): StateShowResult;
export function runStateValidate(opts?: { cwd?: string }): { ok: boolean; errors: string[] };
