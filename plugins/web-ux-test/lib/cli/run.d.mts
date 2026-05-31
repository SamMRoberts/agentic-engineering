export interface RunResult { ok: boolean; errors?: string[]; fromPhase?: string; toPhase?: string; event?: string; phase?: string; requiredEvent?: string }
export function runNext(opts?: { cwd?: string }): Promise<RunResult>;
export function runPhase(opts: { targetPhase: string; cwd?: string }): Promise<RunResult>;
