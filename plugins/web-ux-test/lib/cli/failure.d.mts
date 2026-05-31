export interface FailureResult { ok: boolean; errors?: string[]; phase?: string; category?: string; matchedRule?: string | null; errorSummary?: string }
export function runFailureClassify(opts?: { cwd?: string }): Promise<FailureResult>;
