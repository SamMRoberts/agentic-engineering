/**
 * `web-ux-test report ...` — generate markdown + html reports for the latest run.
 */

import fs from "node:fs";
import path from "node:path";

import { readState, updateState, projectDir } from "../state/store.mjs";
import { transition } from "../workflow/engine.mjs";
import { EVENTS } from "../workflow/phases.mjs";
import { renderMarkdown } from "../reports/markdown.mjs";
import { renderHtml } from "../reports/html.mjs";

export async function runReportGenerate({ cwd = process.cwd() } = {}) {
    const current = readState(cwd);
    if (!current.lastRunId) {
        return { ok: false, errors: ["No lastRunId in state; nothing to report."] };
    }
    const runDir = path.join(projectDir(cwd), "runs", current.lastRunId);
    const runRecordPath = path.join(runDir, "run.json");
    if (!fs.existsSync(runRecordPath)) {
        return { ok: false, errors: [`Run record missing: ${runRecordPath}`] };
    }
    const runRecord = JSON.parse(fs.readFileSync(runRecordPath, "utf8"));
    const reportsDir = path.join(projectDir(cwd), "reports");
    fs.mkdirSync(reportsDir, { recursive: true });
    const mdPath = path.join(reportsDir, `${current.lastRunId}.md`);
    const htmlPath = path.join(reportsDir, `${current.lastRunId}.html`);
    fs.writeFileSync(mdPath, renderMarkdown({ runRecord, finalPhase: current.phase }));
    fs.writeFileSync(htmlPath, renderHtml({ runRecord, finalPhase: current.phase }));

    const next = await updateState((state) => {
        const r = transition(state, EVENTS.REPORT_GENERATED, { reportPath: mdPath });
        if (!r.ok) throw r.error;
        return r.state;
    }, { cwd });
    return {
        ok: true,
        phase: next.phase,
        markdownPath: mdPath,
        htmlPath
    };
}
