import { test } from "node:test";
import assert from "node:assert/strict";

import { renderMarkdown } from "../../lib/reports/markdown.mjs";
import { renderHtml } from "../../lib/reports/html.mjs";

const passedRun = {
    runId: "2026-05-31T12-00-00-create-page-flow",
    planId: "create-page-flow",
    planPath: ".web-ux-testing/plans/create-page-flow.yaml",
    specPath: "generated-tests/create-page-flow.spec.ts",
    startedAt: "2026-05-31T12:00:00.000Z",
    finishedAt: "2026-05-31T12:00:10.000Z",
    status: "passed",
    exitCode: 0,
    browser: "chromium",
    headless: true,
    authMode: "none",
    steps: [
        { id: "goto-app", title: "goto-app", status: "passed", durationMs: 250 },
        { id: "verify-success", title: "verify-success", status: "passed", durationMs: 30 }
    ],
    artifacts: {
        stdoutPath: ".web-ux-testing/runs/r/playwright-stdout.txt",
        stderrPath: ".web-ux-testing/runs/r/playwright-stderr.txt"
    }
};

const failedRun = {
    ...passedRun,
    status: "failed",
    exitCode: 1,
    steps: [
        { id: "goto-app", title: "goto-app", status: "passed", durationMs: 250 },
        { id: "add-new", title: "add-new", status: "failed", durationMs: 1500, errorMessage: "locator not found" }
    ],
    failure: {
        category: "selector_not_found",
        failingStepId: "add-new",
        errorSummary: "locator not found while clicking text=Add New",
        matchedRule: "selector_not_found"
    }
};

test("markdown renderer includes status, run id, steps table, and artifacts", () => {
    const md = renderMarkdown({ runRecord: passedRun, finalPhase: "report_generated" });
    assert.match(md, /^# Web UX Test Report: create-page-flow/m);
    assert.match(md, /Status: Passed/);
    assert.match(md, /Run ID: 2026-05-31T12-00-00-create-page-flow/);
    assert.match(md, /## Executed Steps/);
    assert.match(md, /\| goto-app \| passed \|/);
    assert.match(md, /## Artifacts/);
});

test("markdown renderer surfaces failure summary and category on failed runs", () => {
    const md = renderMarkdown({ runRecord: failedRun, finalPhase: "failure_classified" });
    assert.match(md, /Status: Failed/);
    assert.match(md, /Failure category: selector_not_found/);
    assert.match(md, /add-new/);
    assert.match(md, /locator not found/);
});

test("html renderer produces a valid-looking HTML document and escapes content", () => {
    const html = renderHtml({ runRecord: passedRun, finalPhase: "report_generated" });
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<title>Web UX Test Report:/);
    assert.match(html, /class="status-passed"/);
    assert.match(html, /<table>/);
});

test("html renderer escapes html-special characters in step messages", () => {
    const dangerous = {
        ...failedRun,
        steps: [
            { id: "bad", title: "bad", status: "failed", durationMs: 1, errorMessage: "<script>alert(1)</script>" }
        ]
    };
    const html = renderHtml({ runRecord: dangerous, finalPhase: "failure_classified" });
    assert.ok(!html.includes("<script>alert(1)</script>"), "raw <script> must be escaped");
    assert.match(html, /&lt;script&gt;/);
});
