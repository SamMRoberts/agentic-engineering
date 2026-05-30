#!/usr/bin/env node
// PreToolUse: require explicit user approval for playwright/browser_evaluate.
// This tool runs arbitrary JavaScript in the target page and is the highest-risk
// Playwright MCP tool: it can read DOM, exfiltrate data, mutate state, and
// bypass the UI. Force ask permission instead of silent allow.

import {
    readStdin,
    parsePayload,
    getToolName,
    getToolInput,
    collectStringScalars,
    allow,
    ask
} from "./lib/hook-io.mjs";

function isBrowserEvaluate(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower === "browser_evaluate"
        || lower.endsWith("/browser_evaluate")
        || lower.endsWith("_browser_evaluate");
}

const raw = await readStdin();
const payload = parsePayload(raw);
const toolName = getToolName(payload);

if (!isBrowserEvaluate(toolName)) {
    allow();
    process.exit(0);
}

const toolInput = getToolInput(payload);
const snippet = collectStringScalars(toolInput).find((s) => s.length > 0) ?? "(empty)";
const preview = snippet.length > 200 ? `${snippet.slice(0, 200)}…` : snippet;

ask(
    `web-frontend-testing safety: browser_evaluate runs arbitrary JavaScript in the target page. Confirm this is expected for the current scenario.\nSnippet: ${preview}`
);
