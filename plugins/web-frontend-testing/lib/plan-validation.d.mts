// Type declarations for plan-validation.mjs (consumed by mcp-app/server.ts).
// Sibling .d.mts so TypeScript with moduleResolution: bundler resolves it
// automatically when the .mjs is imported.

export interface PlanValidationResult {
    errors: string[];
    warnings: string[];
}

export function validatePlan(plan: unknown): PlanValidationResult;
export function validatePlanFile(planPath: string): PlanValidationResult;
export function printValidationResult(result: PlanValidationResult): void;
export function runValidatePlanCli(options?: { usage?: string }): void;
