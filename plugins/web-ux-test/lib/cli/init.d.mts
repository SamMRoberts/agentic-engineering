export interface InitResult { ok: boolean; already: boolean; projectDir: string; message: string }
export function runInit(opts?: { cwd?: string; force?: boolean }): Promise<InitResult>;
