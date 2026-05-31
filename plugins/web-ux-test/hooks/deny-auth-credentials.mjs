#!/usr/bin/env node
// PreToolUse: deny file-write tools whose payload appears to contain credential-shaped
// strings and whose target path is under .web-ux-testing/auth/. Mirrors the convention
// from the web-frontend-testing plugin.

import {
    readStdin,
    parsePayload,
    getToolName,
    getToolInput,
    getCandidatePaths,
    collectStringScalars,
    allow,
    deny
} from "./lib/hook-io.mjs";

const WRITE_TOOL_SUFFIXES = [
    "edit",
    "create_file",
    "write_file",
    "apply_patch",
    "multi_replace_string_in_file",
    "replace_string_in_file",
    "create"
];

const ENV_VAR_REFERENCE = /\$\{?[A-Z][A-Z0-9_]*\}?/;

const CREDENTIAL_PATTERNS = [
    { name: "JWT", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
    { name: "GitHub PAT", regex: /\bghp_[A-Za-z0-9]{20,}\b/ },
    { name: "OpenAI key", regex: /\bsk-[A-Za-z0-9]{20,}\b/ },
    { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "Slack token", regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
    { name: "Password literal", regex: /(?:^|[^A-Za-z0-9_])password["']?\s*[:=]\s*["'`][^"'`\s]{4,}/i },
    { name: "Authorization bearer header", regex: /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{10,}/i }
];

const AUTH_PATH_FRAGMENT = ".web-ux-testing/auth/";

function isWriteTool(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    return WRITE_TOOL_SUFFIXES.some((s) => lower === s || lower.endsWith(`/${s}`) || lower.endsWith(`_${s}`));
}

function isAuthPath(p) {
    if (typeof p !== "string") return false;
    return p.includes(AUTH_PATH_FRAGMENT);
}

function detectCredential(strings) {
    for (const value of strings) {
        if (typeof value !== "string" || !value.length) continue;
        if (ENV_VAR_REFERENCE.test(value)) continue;
        for (const { name, regex } of CREDENTIAL_PATTERNS) {
            if (regex.test(value)) return name;
        }
    }
    return null;
}

const raw = await readStdin();
const payload = parsePayload(raw);
const toolName = getToolName(payload);

if (!isWriteTool(toolName)) {
    allow();
    process.exit(0);
}

const toolInput = getToolInput(payload);
const paths = getCandidatePaths(toolInput);
if (!paths.some(isAuthPath)) {
    allow();
    process.exit(0);
}

const strings = collectStringScalars(toolInput);
const hit = detectCredential(strings);
if (hit) {
    deny(`web-ux-test safety: rejected write to .web-ux-testing/auth/ because the payload appears to contain a ${hit} literal. Reference credentials via environment variables (e.g. \${SESSION_TOKEN}) or capture sessions via \`npx playwright codegen --save-storage=...\` instead.`);
} else {
    allow();
}
