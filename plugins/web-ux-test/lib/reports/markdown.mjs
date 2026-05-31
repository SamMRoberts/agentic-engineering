/**
 * Markdown report renderer.
 *
 * Input: { runRecord, finalPhase } — runRecord matches schemas/run-record.schema.yaml.
 * Output: a markdown string for ".web-ux-testing/reports/<runId>.md".
 */

function row(step) {
    const note = step.errorMessage ? step.errorMessage.replace(/\|/g, "\\|").slice(0, 200) : (step.title ?? "");
    return `| ${step.id} | ${step.status} | ${note} |`;
}

export function renderMarkdown({ runRecord, finalPhase }) {
    const lines = [];
    lines.push(`# Web UX Test Report: ${runRecord.planId}`);
    lines.push("");
    lines.push(`Status: ${runRecord.status === "passed" ? "Passed" : "Failed"}  `);
    lines.push(`Run ID: ${runRecord.runId}  `);
    lines.push(`Plan: ${runRecord.planId}  `);
    lines.push(`Browser: ${runRecord.browser}  `);
    lines.push(`Headless: ${runRecord.headless}  `);
    lines.push(`Auth mode: ${runRecord.authMode ?? "none"}  `);
    lines.push(`Started: ${runRecord.startedAt}  `);
    lines.push(`Finished: ${runRecord.finishedAt}  `);
    lines.push(`Exit code: ${runRecord.exitCode}  `);
    lines.push(`Final workflow phase: ${finalPhase ?? "(unknown)"}`);
    if (runRecord.failure) {
        lines.push("");
        lines.push(`Failure category: ${runRecord.failure.category}`);
    }
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    if (runRecord.status === "passed") {
        lines.push(`All ${runRecord.steps.length} step(s) passed.`);
    } else {
        const failingStep = runRecord.steps.find((s) => s.status === "failed");
        lines.push(`The test failed${failingStep ? ` at step "${failingStep.id}"` : ""}.`);
        if (runRecord.failure?.errorSummary) {
            lines.push("");
            lines.push("> " + runRecord.failure.errorSummary);
        }
    }
    lines.push("");
    lines.push("## Executed Steps");
    lines.push("");
    lines.push("| Step | Status | Notes |");
    lines.push("|---|---|---|");
    for (const step of runRecord.steps ?? []) {
        lines.push(row(step));
    }
    lines.push("");
    lines.push("## Artifacts");
    lines.push("");
    const a = runRecord.artifacts ?? {};
    if (a.stdoutPath) lines.push(`- Playwright stdout: \`${a.stdoutPath}\``);
    if (a.stderrPath) lines.push(`- Playwright stderr: \`${a.stderrPath}\``);
    if (a.playwrightJsonPath) lines.push(`- Playwright JSON reporter: \`${a.playwrightJsonPath}\``);
    if (a.tracePath) lines.push(`- Trace: \`${a.tracePath}\``);
    for (const sp of a.screenshotPaths ?? []) lines.push(`- Screenshot: \`${sp}\``);
    lines.push("");
    return lines.join("\n");
}
