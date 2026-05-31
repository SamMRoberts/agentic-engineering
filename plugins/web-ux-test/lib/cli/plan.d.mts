export interface PlanValidateResult { ok: boolean; errors: string[]; plan?: unknown; planPath?: string; phase?: string | null; note?: string }
export interface PlanCreateResult { ok: boolean; errors?: string[]; planPath?: string; planId?: string; phase?: string }
export function runPlanValidate(opts: { planPath: string; cwd?: string }): Promise<PlanValidateResult>;
export function runPlanCreate(opts: { planPath: string; cwd?: string }): Promise<PlanCreateResult>;
export function validatePlanFile(filePath: string): { ok: boolean; errors: string[]; plan?: unknown };
