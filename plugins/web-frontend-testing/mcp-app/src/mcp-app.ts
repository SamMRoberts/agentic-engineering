/**
 * MCP App client for the Web Frontend Report Viewer.
 *
 * Renders an interactive findings triage view AND a plan editor with
 * Validate/Save backed by the `update_test_plan` MCP tool.
 */
import {
    App,
    applyDocumentTheme,
    applyHostFonts,
    applyHostStyleVariables,
    type McpUiHostContext
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./mcp-app.css";

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
type Severity = (typeof SEVERITIES)[number];

interface Finding {
    id: string;
    scenario_id?: string;
    severity: string;
    category?: string;
    summary?: string;
    observed?: string;
    expected?: string;
    evidence?: Record<string, unknown>;
    reproduction?: Record<string, unknown>;
    suggested_fix?: string;
}

interface ValidationResult {
    errors: string[];
    warnings: string[];
}

interface ReportPayload {
    reportDir: string;
    planPath: string | null;
    planYaml: string | null;
    planValidation: ValidationResult | null;
    run: {
        url?: string;
        stage?: string;
        runner?: string;
        auth_strategy?: string;
        scenarioCount: number;
        generatedAt: string;
    };
    counts: Record<Severity, number> & { total: number };
    scenarios: Array<{ id: string; title?: string; priority?: string; surface?: string }>;
    findings: Finding[];
    executiveReportPath: string | null;
    engineeringReportPath: string | null;
    warnings: string[];
}

interface UpdatePlanPayload {
    planPath: string;
    planYaml: string;
    written: boolean;
    dryRun: boolean;
    validation: ValidationResult;
}

// ----- Element refs -----

function el<T extends HTMLElement = HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Missing #${id}`);
    return node as T;
}

const metaEl = el("meta");
const filterRow = el("filter-row");
const findingListEl = el("finding-list");
const emptyStateEl = el("empty-state");
const visibleCountEl = el("visible-count");
const openHtmlBtn = el<HTMLButtonElement>("open-html-btn");
const warningsEl = el("warnings");
const warningsListEl = el("warnings-list");

const tabFindings = el<HTMLButtonElement>("tab-findings");
const tabPlan = el<HTMLButtonElement>("tab-plan");
const panelFindings = el("panel-findings");
const panelPlan = el("panel-plan");

const planPathEl = el("plan-path");
const planEmptyEl = el("plan-empty");
const planTextarea = el<HTMLTextAreaElement>("plan-textarea");
const planActions = el("plan-actions");
const planValidateBtn = el<HTMLButtonElement>("plan-validate-btn");
const planSaveBtn = el<HTMLButtonElement>("plan-save-btn");
const planResetBtn = el<HTMLButtonElement>("plan-reset-btn");
const planDirtyEl = el("plan-dirty");
const planStatusEl = el("plan-status");
const planIssuesEl = el<HTMLDetailsElement>("plan-issues");
const planIssuesSummary = el("plan-issues-summary");
const planErrorsEl = el("plan-errors");
const planWarningsEl = el("plan-warnings");

// ----- State -----

const activeFilters = new Set<Severity>(SEVERITIES);
let currentPayload: ReportPayload | null = null;
let lastLoadedPlanYaml: string | null = null;

// ----- Helpers -----

function escapeHtml(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "\"": return "&quot;";
            case "'": return "&#39;";
            default: return ch;
        }
    });
}

function severityClass(sev: string): Severity {
    const s = sev.toLowerCase();
    return (SEVERITIES as readonly string[]).includes(s) ? (s as Severity) : "info";
}

// ----- Findings rendering -----

function renderMeta(payload: ReportPayload) {
    const rows: Array<[string, string | undefined]> = [
        ["Target", payload.run.url ?? "—"],
        ["Stage", payload.run.stage ?? "—"],
        ["Runner", payload.run.runner ?? "—"],
        ["Auth", payload.run.auth_strategy ?? "—"],
        ["Scenarios", String(payload.run.scenarioCount)],
        ["Report dir", payload.reportDir],
        ["Generated", payload.run.generatedAt]
    ];
    metaEl.innerHTML = rows
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
        .join("");
}

function renderFilters(payload: ReportPayload) {
    filterRow.innerHTML = SEVERITIES.map((sev) => {
        const count = payload.counts[sev] ?? 0;
        const pressed = activeFilters.has(sev) ? "true" : "false";
        return `
      <li>
        <button type="button" class="filter-chip" data-severity="${sev}" aria-pressed="${pressed}">
          <span class="badge ${sev}">${sev}</span>
          <span class="count" aria-label="${count} findings">${count}</span>
        </button>
      </li>
    `;
    }).join("");

    filterRow.querySelectorAll<HTMLButtonElement>("button.filter-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sev = btn.dataset.severity as Severity;
            if (activeFilters.has(sev)) {
                activeFilters.delete(sev);
            } else {
                activeFilters.add(sev);
            }
            btn.setAttribute("aria-pressed", activeFilters.has(sev) ? "true" : "false");
            renderFindings();
        });
    });
}

function renderFindings() {
    if (!currentPayload) return;
    const visible = currentPayload.findings
        .filter((f) => activeFilters.has(severityClass(f.severity)))
        .sort(
            (a, b) =>
                SEVERITIES.indexOf(severityClass(a.severity)) -
                SEVERITIES.indexOf(severityClass(b.severity))
        );

    visibleCountEl.textContent = String(visible.length);
    emptyStateEl.hidden = visible.length > 0;

    findingListEl.innerHTML = visible
        .map((f) => {
            const sev = severityClass(f.severity);
            const detailRows: Array<[string, string | null]> = [
                ["Observed", f.observed ?? null],
                ["Expected", f.expected ?? null],
                ["Category", f.category ?? null],
                ["Suggested fix", f.suggested_fix ?? null]
            ];
            const detailsHtml = detailRows
                .filter(([, v]) => v != null && v !== "")
                .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v!)}</dd>`)
                .join("");

            const evidenceJson = f.evidence
                ? `<dt>Evidence</dt><dd><pre>${escapeHtml(JSON.stringify(f.evidence, null, 2))}</pre></dd>`
                : "";
            const reproJson = f.reproduction
                ? `<dt>Reproduction</dt><dd><pre>${escapeHtml(JSON.stringify(f.reproduction, null, 2))}</pre></dd>`
                : "";

            return `
        <li>
          <details class="finding">
            <summary>
              <span class="badge ${sev}">${escapeHtml(sev)}</span>
              <span class="summary-text">${escapeHtml(f.summary ?? f.id)}</span>
              <span class="scenario-id">${escapeHtml(f.scenario_id ?? f.id)}</span>
            </summary>
            <dl class="details">
              ${detailsHtml}
              ${evidenceJson}
              ${reproJson}
            </dl>
          </details>
        </li>
      `;
        })
        .join("");
}

function renderWarnings(payload: ReportPayload) {
    if (payload.warnings.length === 0) {
        warningsEl.hidden = true;
        return;
    }
    warningsEl.hidden = false;
    warningsListEl.innerHTML = payload.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("");
}

// ----- Plan editor -----

function setPlanStatus(message: string, kind: "" | "ok" | "error" = "") {
    planStatusEl.textContent = message;
    planStatusEl.className = "plan-status" + (kind ? ` ${kind}` : "");
}

function renderPlanIssues(validation: ValidationResult | null) {
    if (!validation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
        planIssuesEl.hidden = true;
        planErrorsEl.innerHTML = "";
        planWarningsEl.innerHTML = "";
        return;
    }
    planIssuesEl.hidden = false;
    planIssuesEl.open = validation.errors.length > 0;
    planIssuesSummary.textContent = `Validation — ${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`;
    planErrorsEl.innerHTML = validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("");
    planWarningsEl.innerHTML = validation.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("");
}

function updatePlanDirty() {
    if (!currentPayload) return;
    const dirty = planTextarea.value !== lastLoadedPlanYaml;
    planDirtyEl.hidden = !dirty;
    planSaveBtn.disabled = !dirty || !currentPayload.planPath;
}

function renderPlanEditor(payload: ReportPayload) {
    if (!payload.planPath || payload.planYaml == null) {
        planEmptyEl.hidden = false;
        planTextarea.hidden = true;
        planActions.hidden = true;
        planPathEl.textContent = "—";
        renderPlanIssues(null);
        setPlanStatus("");
        return;
    }
    planEmptyEl.hidden = true;
    planTextarea.hidden = false;
    planActions.hidden = false;
    planPathEl.textContent = payload.planPath;

    lastLoadedPlanYaml = payload.planYaml;
    planTextarea.value = payload.planYaml;
    renderPlanIssues(payload.planValidation);

    if (payload.planValidation && payload.planValidation.errors.length > 0) {
        setPlanStatus("Plan has validation errors.", "error");
    } else if (payload.planValidation && payload.planValidation.warnings.length > 0) {
        setPlanStatus("Plan is valid with warnings.", "");
    } else {
        setPlanStatus("Plan is valid.", "ok");
    }
    updatePlanDirty();
}

async function runUpdatePlan(dryRun: boolean) {
    if (!currentPayload || !currentPayload.planPath) return;
    const payload = currentPayload;
    const planYaml = planTextarea.value;

    setPlanStatus(dryRun ? "Validating…" : "Saving…");
    planValidateBtn.disabled = true;
    planSaveBtn.disabled = true;

    try {
        const result = await app.callServerTool({
            name: "update_test_plan",
            arguments: { planPath: payload.planPath, planYaml, dryRun, confirmedWrite: !dryRun }
        });
        const structured = result.structuredContent as UpdatePlanPayload | undefined;
        if (!structured) {
            setPlanStatus("Tool returned no structured content.", "error");
            return;
        }

        renderPlanIssues(structured.validation);

        if (structured.validation.errors.length > 0) {
            setPlanStatus(
                dryRun
                    ? "Validation failed. See errors below."
                    : "Save refused — fix validation errors first.",
                "error"
            );
        } else if (structured.written) {
            lastLoadedPlanYaml = structured.planYaml;
            payload.planYaml = structured.planYaml;
            payload.planValidation = structured.validation;
            const warns = structured.validation.warnings.length;
            setPlanStatus(
                warns > 0 ? `Saved with ${warns} warning(s).` : "Saved.",
                "ok"
            );
        } else {
            setPlanStatus("Validation passed.", "ok");
        }
    } catch (err) {
        setPlanStatus(`Tool call failed: ${String(err)}`, "error");
        app.sendLog({ level: "error", data: { tool: "update_test_plan", error: String(err) } }).catch(() => { });
    } finally {
        planValidateBtn.disabled = false;
        updatePlanDirty();
    }
}

planTextarea.addEventListener("input", updatePlanDirty);
planValidateBtn.addEventListener("click", () => runUpdatePlan(true));
planSaveBtn.addEventListener("click", () => runUpdatePlan(false));
planResetBtn.addEventListener("click", () => {
    if (lastLoadedPlanYaml == null) return;
    planTextarea.value = lastLoadedPlanYaml;
    renderPlanIssues(currentPayload?.planValidation ?? null);
    setPlanStatus("Reverted to last loaded plan.");
    updatePlanDirty();
});

// ----- Tabs -----

function selectTab(name: "findings" | "plan") {
    const findings = name === "findings";
    tabFindings.setAttribute("aria-selected", findings ? "true" : "false");
    tabPlan.setAttribute("aria-selected", findings ? "false" : "true");
    panelFindings.hidden = !findings;
    panelPlan.hidden = findings;
}

tabFindings.addEventListener("click", () => selectTab("findings"));
tabPlan.addEventListener("click", () => selectTab("plan"));

// ----- Top-level render -----

function render(payload: ReportPayload) {
    currentPayload = payload;
    renderMeta(payload);
    renderFilters(payload);
    renderFindings();
    renderWarnings(payload);
    renderPlanEditor(payload);

    if (payload.executiveReportPath) {
        openHtmlBtn.hidden = false;
        openHtmlBtn.onclick = async () => {
            try {
                await app.openLink({ url: `file://${payload.executiveReportPath}` });
            } catch (err) {
                await app.sendLog({ level: "error", data: { error: String(err) } });
            }
        };
    } else {
        openHtmlBtn.hidden = true;
    }
}

function handleHostContextChanged(ctx: McpUiHostContext) {
    if (ctx.theme) applyDocumentTheme(ctx.theme);
    if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
    if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

// ----- App lifecycle -----

const app = new App({ name: "Web Frontend Report Viewer", version: "0.3.0" });

app.onteardown = async () => ({});
app.onerror = (err) => {
    app.sendLog({ level: "error", data: { error: String(err) } }).catch(() => { });
};
app.onhostcontextchanged = handleHostContextChanged;

app.ontoolresult = (result: CallToolResult) => {
    const structured = result.structuredContent as unknown;
    if (!structured || typeof structured !== "object") return;

    // Distinguish report payload from update payload by their shape.
    if ("findings" in structured && "counts" in structured) {
        render(structured as ReportPayload);
    }
    // update_test_plan results are handled inline via callServerTool().
};

app.connect().then(() => {
    const ctx = app.getHostContext();
    if (ctx) handleHostContextChanged(ctx);
});
