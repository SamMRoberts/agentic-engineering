/**
 * Playwright spec runner.
 *
 * Spawns `npx playwright test --reporter=json` against a single spec, captures
 * stdout/stderr/exit and the JSON reporter output, persists run.json + raw
 * artifacts under .web-ux-testing/runs/<run-id>/.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { validateAgainstSchema } from "../schema-utils.mjs";

function pad2(n) {
    return String(n).padStart(2, "0");
}

export function makeRunId(planId, now = new Date()) {
    const stamp = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}-${pad2(now.getUTCMinutes())}-${pad2(now.getUTCSeconds())}`;
    return `${stamp}-${planId}`;
}

function spawnPlaywright(args, opts) {
    return new Promise((resolve, reject) => {
        const child = spawn("npx", ["--yes", "playwright", "test", ...args], {
            stdio: ["ignore", "pipe", "pipe"],
            ...opts
        });
        const stdout = [];
        const stderr = [];
        child.stdout.on("data", (chunk) => stdout.push(chunk));
        child.stderr.on("data", (chunk) => stderr.push(chunk));
        child.on("error", reject);
        child.on("close", (code) => {
            resolve({
                exitCode: code ?? 1,
                stdout: Buffer.concat(stdout).toString("utf8"),
                stderr: Buffer.concat(stderr).toString("utf8")
            });
        });
    });
}

function parsePlaywrightJson(stdout) {
    // Playwright JSON reporter writes a JSON object to stdout. Be defensive: find the JSON start.
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    const firstBrace = trimmed.indexOf("{");
    if (firstBrace === -1) return null;
    try {
        return JSON.parse(trimmed.slice(firstBrace));
    } catch {
        return null;
    }
}

function extractSteps(playwrightJson) {
    const steps = [];
    if (!playwrightJson?.suites) return steps;
    function walkSuite(suite) {
        for (const child of suite.suites ?? []) walkSuite(child);
        for (const spec of suite.specs ?? []) {
            for (const t of spec.tests ?? []) {
                for (const res of t.results ?? []) {
                    for (const s of res.steps ?? []) {
                        if (s.category !== "test.step") continue;
                        steps.push({
                            id: s.title,
                            title: s.title,
                            status: s.error ? "failed" : "passed",
                            durationMs: Math.max(0, Math.floor(s.duration ?? 0)),
                            errorMessage: s.error?.message
                        });
                    }
                }
            }
        }
    }
    for (const top of playwrightJson.suites) walkSuite(top);
    return steps;
}

/**
 * Execute a single Playwright spec and persist artifacts.
 *
 * Returns { runId, status, exitCode, runDir }.
 */
export async function executeSpec({
    cwd = process.cwd(),
    specPath,
    planId,
    planPath,
    runsDir,
    browser = "chromium",
    headless = true
} = {}) {
    if (!specPath) throw new Error("executeSpec requires specPath");
    if (!planId) throw new Error("executeSpec requires planId");
    const runId = makeRunId(planId);
    const runDir = path.join(runsDir, runId);
    fs.mkdirSync(runDir, { recursive: true });

    const startedAt = new Date().toISOString();
    const jsonReporterPath = path.join(runDir, "playwright-report.json");
    const args = [
        path.relative(cwd, specPath),
        "--reporter=json",
        `--project=${browser}`,
        `--output=${path.join(runDir, "trace")}`,
        ...(headless ? [] : ["--headed"])
    ];
    const env = {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: jsonReporterPath
    };

    let exitCode = 1;
    let stdout = "";
    let stderr = "";
    try {
        const result = await spawnPlaywright(args, { cwd, env });
        exitCode = result.exitCode;
        stdout = result.stdout;
        stderr = result.stderr;
    } catch (err) {
        stderr = `Failed to spawn Playwright: ${err.message}\nIs @playwright/test installed? Run \`npm install @playwright/test\` and \`npx playwright install\`.`;
    }
    const finishedAt = new Date().toISOString();

    fs.writeFileSync(path.join(runDir, "playwright-stdout.txt"), stdout);
    fs.writeFileSync(path.join(runDir, "playwright-stderr.txt"), stderr);

    let playwrightJson = null;
    if (fs.existsSync(jsonReporterPath)) {
        try {
            playwrightJson = JSON.parse(fs.readFileSync(jsonReporterPath, "utf8"));
        } catch {
            playwrightJson = null;
        }
    }
    if (!playwrightJson) {
        playwrightJson = parsePlaywrightJson(stdout);
    }

    const steps = extractSteps(playwrightJson);
    const status = exitCode === 0 ? "passed" : "failed";

    const runRecord = {
        runId,
        planId,
        planPath: planPath ?? "",
        specPath,
        startedAt,
        finishedAt,
        status,
        exitCode,
        browser,
        headless,
        authMode: "none",
        steps,
        artifacts: {
            stdoutPath: path.join(runDir, "playwright-stdout.txt"),
            stderrPath: path.join(runDir, "playwright-stderr.txt"),
            playwrightJsonPath: fs.existsSync(jsonReporterPath) ? jsonReporterPath : undefined
        }
    };
    // Strip undefined for schema cleanliness.
    runRecord.artifacts = Object.fromEntries(Object.entries(runRecord.artifacts).filter(([, v]) => v !== undefined));

    const errors = validateAgainstSchema(runRecord, "run-record.schema.yaml");
    if (errors.length > 0) {
        // Persist anyway under a debug name, but surface a warning to stderr.
        fs.writeFileSync(path.join(runDir, "run.invalid.json"), JSON.stringify(runRecord, null, 2));
        process.stderr.write(`WARN: run-record validation failed: ${errors.join("; ")}\n`);
    }
    fs.writeFileSync(path.join(runDir, "run.json"), JSON.stringify(runRecord, null, 2));

    return { runId, status, exitCode, runDir };
}
