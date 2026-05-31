#!/usr/bin/env node
// PostToolUse: when a write touches a YAML file under .web-ux-testing/plans/,
// schema-validate it and return decision: block if invalid. Keeps the
// validate-before-execution rule enforceable even when the agent forgets.

import fs from "node:fs";
import path from "node:path";

import {
    readStdin,
    parsePayload,
    getToolInput,
    getCandidatePaths,
    block,
    emit
} from "./lib/hook-io.mjs";
import { validatePlanFile } from "../lib/cli/plan.mjs";

const PLANS_FRAGMENT = ".web-ux-testing/plans/";

function isPlanPath(p) {
    if (typeof p !== "string") return false;
    if (!p.endsWith(".yaml") && !p.endsWith(".yml")) return false;
    return p.includes(PLANS_FRAGMENT);
}

const raw = await readStdin();
const payload = parsePayload(raw);
const toolInput = getToolInput(payload);
const candidates = getCandidatePaths(toolInput).filter(isPlanPath);

if (candidates.length === 0) {
    emit({});
    process.exit(0);
}

const messages = [];
let blocked = false;

for (const p of candidates) {
    const absolute = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    if (!fs.existsSync(absolute)) continue;
    const result = validatePlanFile(absolute);
    if (result.ok) {
        messages.push(`OK ${absolute}: plan validation passed.`);
    } else {
        blocked = true;
        for (const err of result.errors) {
            messages.push(`ERROR ${absolute}: ${err}`);
        }
    }
}

const systemMessage = `[web-ux-test] Plan validation:\n${messages.join("\n")}`;

if (blocked) {
    block(systemMessage);
    process.exit(1);
} else {
    emit({ decision: "approve", systemMessage });
    process.exit(0);
}
