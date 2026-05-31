import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeReport, renderMarkdown } from "../lib/report.mjs";
import { analyzeFailure } from "../lib/failure-triage.mjs";
import { verifyStorageState } from "../skills/auth-state/scripts/verify-storage-state.mjs";
import { summarize } from "../skills/report-generation/scripts/summarize-report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, "fixtures", name);

test("normalizeReport flattens Playwright steps and marks failure", () => {
  const pw = JSON.parse(fs.readFileSync(fixture("playwright-report.json"), "utf-8"));
  const report = normalizeReport(pw, { plan_id: "create-page", plan_title: "Create page" });
  assert.equal(report.status, "failed");
  assert.equal(report.steps.length, 3);
  const failed = report.steps.find((s) => s.status === "failed");
  assert.equal(failed.title, "Select the Pages tab");
  assert.match(failed.error.message, /Timeout 3000ms exceeded/);
});

test("renderMarkdown includes a status line and a failed-steps section", () => {
  const pw = JSON.parse(fs.readFileSync(fixture("playwright-report.json"), "utf-8"));
  const report = normalizeReport(pw, { plan_id: "create-page", plan_title: "Create page" });
  const md = renderMarkdown(report);
  assert.match(md, /# Web UX Test Report/);
  assert.match(md, /Status:\*\* ❌ failed/);
  assert.match(md, /## Failed steps/);
});

test("analyzeFailure classifies a timeout as a timing issue", () => {
  const pw = JSON.parse(fs.readFileSync(fixture("playwright-report.json"), "utf-8"));
  const report = normalizeReport(pw, { plan_id: "create-page" });
  const diag = analyzeFailure(report);
  assert.equal(diag.category, "timing_issue");
});

test("summarize produces a one-line failure summary", () => {
  const pw = JSON.parse(fs.readFileSync(fixture("playwright-report.json"), "utf-8"));
  const report = normalizeReport(pw, { plan_id: "create-page", plan_title: "Create page" });
  const text = summarize(report);
  assert.match(text, /❌ Create page failed/);
});

test("verifyStorageState flags empty and expired sessions", () => {
  assert.equal(verifyStorageState({ cookies: [], origins: [] }).ok, false);
  const now = 1_000_000;
  const expired = verifyStorageState({ cookies: [{ name: "s", expires: 500 }], origins: [] }, now);
  assert.equal(expired.ok, false);
  assert.equal(expired.info.expiredCookies, 1);
  const ok = verifyStorageState({ cookies: [{ name: "s", expires: now + 10000 }], origins: [] }, now);
  assert.equal(ok.ok, true);
});
