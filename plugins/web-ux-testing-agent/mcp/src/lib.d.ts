// Ambient declarations for the shared JS lib consumed by the MCP server.
declare module "../../../lib/plan-loader.mjs" {
  export function loadPlan(filePath: string): Record<string, unknown>;
  export function parsePlan(raw: string, opts?: { format?: "json" | "yaml" }): Record<string, unknown>;
  export function stringifyPlan(plan: unknown): string;
}
declare module "../../../lib/plan-validator.mjs" {
  export function validatePlan(plan: unknown): { errors: string[]; warnings: string[] };
}
declare module "../../../lib/report.mjs" {
  export function normalizeReport(pwJson: unknown, meta?: Record<string, unknown>): Record<string, unknown>;
  export function renderMarkdown(report: unknown): string;
}
declare module "../../../lib/failure-triage.mjs" {
  export function analyzeFailure(report: unknown): {
    category: string;
    confidence: string;
    rationale: string;
    recommended_repairs: string[];
  };
}
