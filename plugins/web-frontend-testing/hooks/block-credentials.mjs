#!/usr/bin/env node
// PreToolUse: deny file-write tools whose payload contains credential-shaped strings.
// Reuses credential patterns from lib/plan-lint.mjs so detection stays in one place.

import {
    readStdin,
    parsePayload,
    getToolName,
    getToolInput,
    collectStringScalars,
    allow,
    deny
} from "./lib/hook-io.mjs";

// Tools that write file content. Matched as suffix to tolerate vendor prefixes.
const WRITE_TOOL_SUFFIXES = [
    "edit",
    "create_file",
    "write_file",
    "apply_patch",
    "multi_replace_string_in_file",
    "replace_string_in_file"
];

const ENV_VAR_REFERENCE = /\$\{?[A-Z][A-Z0-9_]*\}?/;

const CREDENTIAL_PATTERNS = [
    { name: "JWT", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
    { name: "GitHub PAT", regex: /\bghp_[A-Za-z0-9]{20,}\b/ },
    { name: "OpenAI key", regex: /\bsk-[A-Za-z0-9]{20,}\b/ },
    { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "Slack token", regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
    { name: "Password literal", regex: /(?:^|[^A-Za-z0-9_])password\s*[:=]\s*["'`][^"'`\s]{4,}/i },
    { name: "Authorization bearer header", regex: /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{10,}/i }
];

function matchesWriteTool(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    return WRITE_TOOL_SUFFIXES.some((suffix) => lower === suffix || lower.endsWith(`/${suffix}`) || lower.endsWith(`_${suffix}`));
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

if (!matchesWriteTool(toolName)) {
    allow();
    process.exit(0);
}

const toolInput = getToolInput(payload);
const strings = collectStringScalars(toolInput);
const hit = detectCredential(strings);

if (hit) {
    deny(`web-frontend-testing safety: rejected write because the payload appears to contain a ${hit} literal. Reference secrets via env vars (e.g. \${SESSION_TOKEN}) or storage-state paths instead.`);
} else {
    allow();
}
