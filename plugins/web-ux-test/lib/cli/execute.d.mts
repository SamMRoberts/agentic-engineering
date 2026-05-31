export interface ExecuteResult { ok: boolean; errors?: string[]; phase?: string; runId?: string; runStatus?: string; exitCode?: number; runDir?: string }
export function runRunTestExecuted(opts?: { cwd?: string }): Promise<ExecuteResult>;
