export interface ReportResult { ok: boolean; errors?: string[]; phase?: string; markdownPath?: string; htmlPath?: string }
export function runReportGenerate(opts?: { cwd?: string }): Promise<ReportResult>;
