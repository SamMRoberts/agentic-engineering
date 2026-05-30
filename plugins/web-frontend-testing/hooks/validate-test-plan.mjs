#!/usr/bin/env node
// PostToolUse: when a write touches a file named test-plan.yaml, run the
// deterministic plan validator and surface ERRORs back to the agent so the
// "validate before execution" rule cannot be skipped.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
    readStdin,
    parsePayload,
    getToolInput,
    getCandidatePaths
} from "./lib/hook-io.mjs";
import { validatePlanFile } from "../lib/plan-validation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAN_BASENAME = "test-plan.yaml";

function isPlanPath(p) {
    if (typeof p !== "string") return false;
    return path.basename(p) === PLAN_BASENAME;
}

const raw = await readStdin();
const payload = parsePayload(raw);
const toolInput = getToolInput(payload);
const candidates = getCandidatePaths(toolInput).filter(isPlanPath);

if (candidates.length === 0) {
    // Nothing to do; do not block.
    process.exit(0);
}

const messages = [];
let blocked = false;

for (const planPath of candidates) {
    const absolute = path.isAbsolute(planPath) ? planPath : path.resolve(process.cwd(), planPath);
    if (!fs.existsSync(absolute)) continue;
    try {
        const result = validatePlanFile(absolute);
        for (const warning of result.warnings) {
            messages.push(`WARN ${absolute}: ${warning}`);
        }
        for (const error of result.errors) {
            messages.push(`ERROR ${absolute}: ${error}`);
            blocked = true;
        }
        if (result.errors.length === 0 && result.warnings.length === 0) {
            messages.push(`OK ${absolute}: plan validation passed.`);
        }
    } catch (err) {
        messages.push(`ERROR ${absolute}: validator failed to load plan (${err.message})`);
        blocked = true;
    }
}

const systemMessage = `[web-frontend-testing] Plan validation:\n${messages.join("\n")}`;

const output = {
    systemMessage
};

if (blocked) {
    output.decision = "block";
    output.stopReason = "test-plan.yaml failed validation. Fix the reported ERRORs before continuing to execution.";
}

process.stdout.write(JSON.stringify(output));
