/**
 * Thin data client for the local fallback UI.
 *
 * It mirrors the MCP tool surface (list_plans, get_plan, save_plan,
 * validate_plan, list_reports, get_report). When a backend is configured at
 * `/api` (for example a small Express adapter that wraps the same `lib/*.mjs`
 * core the MCP server uses) the calls hit real data. Otherwise the client
 * falls back to bundled sample data so the UI is always explorable.
 */

export interface PlanSummary {
  id: string;
  title?: string;
  path: string;
}

export interface ReportSummary {
  run: string;
  plan_id?: string;
  status?: string;
}

const API_BASE = "/api";

async function tryApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { "content-type": "application/json" },
      ...init
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const SAMPLE_PLAN = `id: create-page
title: Create a new page
environment:
  base_url: \${WEB_UX_BASE_URL}
steps:
  - id: goto
    action: navigate
    url: /
  - id: open-menu
    action: click
    target:
      role: button
      name: Content
  - id: add-new
    action: click
    target:
      role: button
      name: Add New
  - id: verify
    action: assert_text
    target:
      role: heading
    text: Page created
`;

const SAMPLE_REPORT = {
  run_id: "2026-05-31T01-00-00",
  plan_id: "create-page",
  plan_title: "Create a new page",
  status: "failed",
  summary: { total: 1, passed: 0, failed: 1, skipped: 0 },
  steps: [
    { id: "goto", title: "navigate /", status: "passed", duration_ms: 540 },
    { id: "open-menu", title: "click Content", status: "passed", duration_ms: 220 },
    {
      id: "add-new",
      title: "click Add New",
      status: "failed",
      duration_ms: 5000,
      error: { message: "Timeout 5000ms exceeded waiting for locator getByRole('button', { name: 'Add New' })" }
    }
  ],
  artifacts: { trace: "trace.zip", screenshots: ["add-new.png"], video: "video.webm" },
  diagnosis: { category: "selector_drift", confidence: "medium", rationale: "Locator did not resolve; the control may have been renamed." }
};

export async function listPlans(): Promise<PlanSummary[]> {
  const api = await tryApi<{ plans: PlanSummary[] }>("/plans");
  if (api) return api.plans;
  return [{ id: "create-page", title: "Create a new page", path: "examples/create-page.plan.yaml" }];
}

export async function getPlan(id: string): Promise<string> {
  const api = await tryApi<{ source: string }>(`/plans/${encodeURIComponent(id)}`);
  if (api) return api.source;
  return SAMPLE_PLAN;
}

export async function savePlan(id: string, source: string): Promise<{ ok: boolean; message?: string }> {
  const api = await tryApi<{ ok: boolean; message?: string }>(`/plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ source })
  });
  if (api) return api;
  return { ok: false, message: "No backend connected — changes were not persisted (preview mode)." };
}

export async function validatePlan(source: string): Promise<{ valid: boolean; errors: string[] }> {
  const api = await tryApi<{ valid: boolean; errors: string[] }>("/validate", {
    method: "POST",
    body: JSON.stringify({ source })
  });
  if (api) return api;
  // Local heuristic fallback only — the authoritative validator is lib/plan-validator.mjs.
  const errors: string[] = [];
  if (!/\bid\s*:/.test(source)) errors.push("Plan is missing an `id`.");
  if (!/\bsteps\s*:/.test(source)) errors.push("Plan is missing `steps`.");
  return { valid: errors.length === 0, errors };
}

export async function listReports(): Promise<ReportSummary[]> {
  const api = await tryApi<{ reports: ReportSummary[] }>("/reports");
  if (api) return api.reports;
  return [{ run: SAMPLE_REPORT.run_id, plan_id: SAMPLE_REPORT.plan_id, status: SAMPLE_REPORT.status }];
}

export async function getReport(run: string): Promise<typeof SAMPLE_REPORT> {
  const api = await tryApi<typeof SAMPLE_REPORT>(`/reports/${encodeURIComponent(run)}`);
  if (api) return api;
  return SAMPLE_REPORT;
}

export type Report = typeof SAMPLE_REPORT;
