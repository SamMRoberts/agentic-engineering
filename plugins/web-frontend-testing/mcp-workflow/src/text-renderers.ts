import type { ExecutionTarget, PlanSummary } from "./plan-gates.ts";

export function renderLines(title: string, lines: string[]): string {
    return [title, ...lines.map((line) => `- ${line}`)].join("\n");
}

export function renderValidation(summary: PlanSummary): string {
    const lines = [
        `Plan hash: ${summary.planHash}`,
        `Runner: ${summary.runner ?? "unknown"}`,
        `Scenarios: ${summary.scenarioIds.length}`,
        `Validation errors: ${summary.validation.errors.length}`,
        `Validation warnings: ${summary.validation.warnings.length}`,
        `Destructive scenarios: ${summary.destructiveScenarioIds.length > 0 ? summary.destructiveScenarioIds.join(", ") : "none"}`
    ];
    for (const error of summary.validation.errors) lines.push(`ERROR: ${error}`);
    for (const warning of summary.validation.warnings) lines.push(`WARN: ${warning}`);
    return renderLines("Test plan validation", lines);
}

export function renderTarget(target: ExecutionTarget | null, blockers: string[]): string {
    if (blockers.length > 0) return renderLines("Execution blocked", blockers);
    if (!target) return renderLines("No execution target", ["All known targets already have terminal results."]);
    return renderLines("Next execution target", [
        `Target id: ${target.targetId}`,
        `Runner: ${target.runner}`,
        `Kind: ${target.kind}`,
        target.testCommand ? `Command: ${target.testCommand}` : "Command: not specified",
        target.testFile ? `Test file: ${target.testFile}` : "Test file: not specified"
    ]);
}
