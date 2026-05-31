/**
 * Deterministic failure classifier.
 *
 * Reads a run directory's artifacts and assigns a category from the 8-category
 * enum (matching schemas/run-record.schema.yaml).
 */

import fs from "node:fs";
import path from "node:path";

import { RULES, UNKNOWN_CATEGORY } from "./rules.mjs";

function readIfExists(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8");
}

function extractErrorSummary(stdout, stderr, playwrightJson) {
    if (playwrightJson?.errors?.[0]?.message) return playwrightJson.errors[0].message;
    const lines = (stderr || stdout || "").split(/\r?\n/);
    // Prefer the first line that looks like an error message.
    const errorLine = lines.find((l) => /error|failed|timeout|unauthorized|forbidden|net::|expect/i.test(l));
    return (errorLine || lines.find((l) => l.trim().length > 0) || "").trim().slice(0, 500);
}

/**
 * Classify a run from its artifacts directory.
 */
export function classifyRunArtifacts({ runDir }) {
    const stdout = readIfExists(path.join(runDir, "playwright-stdout.txt"));
    const stderr = readIfExists(path.join(runDir, "playwright-stderr.txt"));
    let playwrightJson = null;
    const jsonPath = path.join(runDir, "playwright-report.json");
    if (fs.existsSync(jsonPath)) {
        try { playwrightJson = JSON.parse(fs.readFileSync(jsonPath, "utf8")); } catch { playwrightJson = null; }
    }
    return classify({ stdout, stderr, playwrightJson });
}

/**
 * Classify from raw artifacts. Returns { category, matchedRule, errorSummary }.
 */
export function classify({ stdout = "", stderr = "", playwrightJson = null, runRecord = null } = {}) {
    const ctx = { stdout, stderr, playwrightJson, runRecord };
    for (const rule of RULES) {
        try {
            if (rule.match(ctx)) {
                return {
                    category: rule.category,
                    matchedRule: rule.name,
                    errorSummary: extractErrorSummary(stdout, stderr, playwrightJson)
                };
            }
        } catch {
            // Rule predicate threw; skip and continue.
        }
    }
    return {
        category: UNKNOWN_CATEGORY,
        matchedRule: null,
        errorSummary: extractErrorSummary(stdout, stderr, playwrightJson)
    };
}
