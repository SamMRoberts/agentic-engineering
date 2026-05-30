/**
 * MCP App client for the Web Frontend Report Viewer.
 * Receives a structured report payload via app.ontoolresult and renders an
 * interactive findings triage view.
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

interface ReportPayload {
    reportDir: string;
    planPath: string | null;
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

const metaEl = document.getElementById("meta")!;
const filterRow = document.getElementById("filter-row")!;
const findingListEl = document.getElementById("finding-list")!;
const emptyStateEl = document.getElementById("empty-state")!;
const visibleCountEl = document.getElementById("visible-count")!;
const openHtmlBtn = document.getElementById("open-html-btn") as HTMLButtonElement;
const warningsEl = document.getElementById("warnings")!;
const warningsListEl = document.getElementById("warnings-list")!;

const activeFilters = new Set<Severity>(SEVERITIES);
let currentPayload: ReportPayload | null = null;

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
    warningsListEl.innerHTML = payload.warnings
        .map((w) => `<li>${escapeHtml(w)}</li>`)
        .join("");
}

function render(payload: ReportPayload) {
    currentPayload = payload;
    renderMeta(payload);
    renderFilters(payload);
    renderFindings();
    renderWarnings(payload);

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

const app = new App({ name: "Web Frontend Report Viewer", version: "0.1.0" });

app.onteardown = async () => ({});
app.onerror = (err) => {
    app.sendLog({ level: "error", data: { error: String(err) } }).catch(() => { });
};
app.onhostcontextchanged = handleHostContextChanged;

app.ontoolresult = (result: CallToolResult) => {
    const structured = result.structuredContent as unknown as ReportPayload | undefined;
    if (!structured || typeof structured !== "object") {
        app.sendLog({ level: "warning", data: "Tool returned no structured content" }).catch(() => { });
        return;
    }
    render(structured);
};

app.connect().then(() => {
    const ctx = app.getHostContext();
    if (ctx) handleHostContextChanged(ctx);
});
