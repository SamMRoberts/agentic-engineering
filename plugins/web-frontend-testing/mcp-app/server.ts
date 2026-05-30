import {
    registerAppResource,
    registerAppTool,
    RESOURCE_MIME_TYPE
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import YAML from "yaml";
import { validatePlan, type PlanValidationResult } from "../lib/plan-validation.mjs";

const DIST_DIR = import.meta.filename.endsWith(".ts")
    ? path.join(import.meta.dirname, "dist")
    : import.meta.dirname;

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;
type Severity = (typeof SEVERITY_ORDER)[number];

interface Finding {
    id: string;
    scenario_id?: string;
    severity: Severity | string;
    category?: string;
    summary?: string;
    observed?: string;
    expected?: string;
    evidence?: Record<string, unknown>;
    reproduction?: Record<string, unknown>;
    suggested_fix?: string;
}

interface PlanScenario {
    id: string;
    title?: string;
    priority?: string;
    surface?: string;
}

interface ReportPayload {
    reportDir: string;
    planPath: string | null;
    planYaml: string | null;
    planValidation: PlanValidationResult | null;
    run: {
        url?: string;
        stage?: string;
        runner?: string;
        auth_strategy?: string;
        scenarioCount: number;
        generatedAt: string;
    };
    counts: Record<Severity, number> & { total: number };
    scenarios: PlanScenario[];
    findings: Finding[];
    executiveReportPath: string | null;
    engineeringReportPath: string | null;
    warnings: string[];
}

interface UpdatePlanPayload {
    planPath: string;
    planYaml: string;
    written: boolean;
    dryRun: boolean;
    confirmationRequired: boolean;
    validation: PlanValidationResult;
}

interface UpdatePlanRequest {
    planPath: string;
    planYaml: string;
    dryRun?: boolean;
    confirmedWrite?: boolean;
}

interface UpdatePlanResult {
    isError: boolean;
    payload: UpdatePlanPayload;
}

async function readYamlIfPresent(filePath: string): Promise<unknown | null> {
    try {
        const raw = await fs.readFile(filePath, "utf-8");
        return YAML.parse(raw);
    } catch {
        return null;
    }
}

async function readTextIfPresent(filePath: string): Promise<string | null> {
    try {
        return await fs.readFile(filePath, "utf-8");
    } catch {
        return null;
    }
}

async function listFindings(findingsDir: string, warnings: string[]): Promise<Finding[]> {
    let entries: string[] = [];
    try {
        entries = await fs.readdir(findingsDir);
    } catch {
        return [];
    }
    const findings: Finding[] = [];
    for (const entry of entries) {
        if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue;
        const full = path.join(findingsDir, entry);
        const parsed = await readYamlIfPresent(full);
        if (parsed == null) {
            warnings.push(`Could not parse ${entry}`);
            continue;
        }
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
            if (!item || typeof item !== "object") continue;
            const f = item as Finding;
            if (!f.id || !f.severity) {
                warnings.push(`Skipped malformed finding in ${entry}`);
                continue;
            }
            findings.push(f);
        }
    }
    return findings;
}

function emptyCounts(): Record<Severity, number> & { total: number } {
    return { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
}

function tallyCounts(findings: Finding[]): Record<Severity, number> & { total: number } {
    const counts = emptyCounts();
    for (const f of findings) {
        const sev = String(f.severity).toLowerCase();
        if ((SEVERITY_ORDER as readonly string[]).includes(sev)) {
            counts[sev as Severity]++;
        }
        counts.total++;
    }
    return counts;
}

function safeValidate(plan: unknown): PlanValidationResult {
    try {
        return validatePlan(plan);
    } catch (err) {
        return { errors: [`Validator threw: ${String(err)}`], warnings: [] };
    }
}

async function loadReport(rawReportDir: string): Promise<ReportPayload> {
    const reportDir = path.resolve(rawReportDir);
    const warnings: string[] = [];

    const planPath = path.join(reportDir, "test-plan.yaml");
    const planYaml = await readTextIfPresent(planPath);
    let plan: { target?: Record<string, string>; runner?: string; scenarios?: PlanScenario[] } | null = null;
    let planValidation: PlanValidationResult | null = null;
    if (planYaml != null) {
        try {
            plan = YAML.parse(planYaml);
            planValidation = safeValidate(plan);
        } catch (err) {
            warnings.push(`Could not parse test-plan.yaml: ${String(err)}`);
            planValidation = { errors: [`Could not parse YAML: ${String(err)}`], warnings: [] };
        }
    } else {
        warnings.push(`No test-plan.yaml found at ${planPath}`);
    }

    const findingsDir = path.join(reportDir, "findings");
    const findings = await listFindings(findingsDir, warnings);

    const executiveReportPath = path.join(reportDir, "executive-report.html");
    const engineeringReportPath = path.join(reportDir, "engineering-report.md");

    const [hasExec, hasEng] = await Promise.all([
        fs.access(executiveReportPath).then(() => true).catch(() => false),
        fs.access(engineeringReportPath).then(() => true).catch(() => false)
    ]);

    const scenarios = Array.isArray(plan?.scenarios) ? plan!.scenarios : [];
    const counts = tallyCounts(findings);

    return {
        reportDir,
        planPath: planYaml != null ? planPath : null,
        planYaml,
        planValidation,
        run: {
            url: plan?.target?.url,
            stage: plan?.target?.stage,
            runner: plan?.runner,
            auth_strategy: plan?.target?.auth_strategy,
            scenarioCount: scenarios.length,
            generatedAt: new Date().toISOString()
        },
        counts,
        scenarios,
        findings,
        executiveReportPath: hasExec ? executiveReportPath : null,
        engineeringReportPath: hasEng ? engineeringReportPath : null,
        warnings
    };
}

function renderTextFallback(payload: ReportPayload): string {
    const lines: string[] = [];
    lines.push(`Web Frontend Testing — Executive Report`);
    lines.push(`Report dir: ${payload.reportDir}`);
    if (payload.run.url) lines.push(`Target: ${payload.run.url} (${payload.run.stage ?? "?"})`);
    lines.push(`Runner: ${payload.run.runner ?? "?"}`);
    lines.push(`Scenarios planned: ${payload.run.scenarioCount}`);
    lines.push(
        `Findings: ${payload.counts.total} total — ${SEVERITY_ORDER.map((s) => `${s}: ${payload.counts[s]}`).join(", ")}`
    );
    if (payload.planValidation) {
        lines.push(
            `Plan validation: ${payload.planValidation.errors.length} error(s), ${payload.planValidation.warnings.length} warning(s)`
        );
    }
    if (payload.executiveReportPath) lines.push(`Executive HTML: ${payload.executiveReportPath}`);
    if (payload.engineeringReportPath) lines.push(`Engineering report: ${payload.engineeringReportPath}`);
    if (payload.warnings.length > 0) lines.push(`Warnings: ${payload.warnings.join("; ")}`);

    if (payload.findings.length > 0) {
        lines.push("");
        lines.push("Top findings:");
        const top = [...payload.findings]
            .sort(
                (a, b) =>
                    SEVERITY_ORDER.indexOf(a.severity as Severity) -
                    SEVERITY_ORDER.indexOf(b.severity as Severity)
            )
            .slice(0, 5);
        for (const f of top) {
            lines.push(`- [${String(f.severity).toUpperCase()}] ${f.summary ?? f.id} (${f.scenario_id ?? f.id})`);
        }
    }

    return lines.join("\n");
}

function renderUpdateTextFallback(payload: UpdatePlanPayload): string {
    const lines: string[] = [];
    lines.push(
        payload.dryRun ? "Plan validation (dry-run)" : payload.written ? "Plan updated" : "Plan validation"
    );
    lines.push(`Plan: ${payload.planPath}`);
    if (payload.confirmationRequired) {
        lines.push("Write refused: confirmedWrite=true is required for non-dry writes.");
    }
    lines.push(`Errors: ${payload.validation.errors.length}`);
    lines.push(`Warnings: ${payload.validation.warnings.length}`);
    for (const e of payload.validation.errors) lines.push(`ERROR: ${e}`);
    for (const w of payload.validation.warnings) lines.push(`WARN: ${w}`);
    return lines.join("\n");
}

const validationSchema = z.object({
    errors: z.array(z.string()),
    warnings: z.array(z.string())
});

export async function updateTestPlan({
    planPath,
    planYaml,
    dryRun,
    confirmedWrite
}: UpdatePlanRequest): Promise<UpdatePlanResult> {
    const absolute = path.resolve(planPath);
    const dry = dryRun === true;
    const confirmationRequired = !dry && confirmedWrite !== true;

    let parsed: unknown;
    try {
        parsed = YAML.parse(planYaml);
    } catch (err) {
        const validation: PlanValidationResult = {
            errors: [`Could not parse YAML: ${String(err)}`],
            warnings: []
        };
        return {
            isError: true,
            payload: {
                planPath: absolute,
                planYaml,
                written: false,
                dryRun: dry,
                confirmationRequired,
                validation
            }
        };
    }

    const validation = safeValidate(parsed);
    const hasErrors = validation.errors.length > 0;
    const written = !dry && !confirmationRequired && !hasErrors;

    if (written) {
        await fs.mkdir(path.dirname(absolute), { recursive: true });
        await fs.writeFile(absolute, planYaml, "utf-8");
    }

    return {
        isError: hasErrors || confirmationRequired,
        payload: {
            planPath: absolute,
            planYaml,
            written,
            dryRun: dry,
            confirmationRequired,
            validation
        }
    };
}

export function createServer(): McpServer {
    const server = new McpServer({
        name: "Web Frontend Report Viewer",
        version: "0.3.0"
    });

    const resourceUri = "ui://web-frontend-report-viewer/mcp-app.html";

    registerAppTool(
        server,
        "view_executive_report",
        {
            title: "View Web Frontend Executive Report",
            description:
                "Loads a web-frontend-testing report directory (test-plan.yaml + findings/) and opens the interactive viewer/editor.",
            inputSchema: {
                reportDir: z
                    .string()
                    .min(1)
                    .describe(
                        "Absolute or workspace-relative path to a report directory, e.g. ./reports/web-frontend-testing/<timestamp>/"
                    )
            },
            outputSchema: z.object({
                reportDir: z.string(),
                planPath: z.string().nullable(),
                planYaml: z.string().nullable(),
                planValidation: validationSchema.nullable(),
                run: z.object({
                    url: z.string().optional(),
                    stage: z.string().optional(),
                    runner: z.string().optional(),
                    auth_strategy: z.string().optional(),
                    scenarioCount: z.number(),
                    generatedAt: z.string()
                }),
                counts: z.object({
                    critical: z.number(),
                    high: z.number(),
                    medium: z.number(),
                    low: z.number(),
                    info: z.number(),
                    total: z.number()
                }),
                scenarios: z.array(z.any()),
                findings: z.array(z.any()),
                executiveReportPath: z.string().nullable(),
                engineeringReportPath: z.string().nullable(),
                warnings: z.array(z.string())
            }),
            _meta: { ui: { resourceUri } }
        },
        async ({ reportDir }): Promise<CallToolResult> => {
            const payload = await loadReport(reportDir);
            return {
                content: [{ type: "text", text: renderTextFallback(payload) }],
                structuredContent: payload as unknown as Record<string, unknown>
            };
        }
    );

    registerAppTool(
        server,
        "update_test_plan",
        {
            title: "Validate or save a test plan",
            description:
                "Validate or write a test-plan.yaml. Set dryRun=true to validate without writing. Non-dry writes require confirmedWrite=true and refuse to write when validation produces errors. Returns the validation result and (when written) confirmation.",
            inputSchema: {
                planPath: z
                    .string()
                    .min(1)
                    .describe("Absolute or workspace-relative path to the test-plan.yaml file to write."),
                planYaml: z
                    .string()
                    .min(1)
                    .describe("Full YAML content for the test plan. Must parse as YAML and satisfy the plan schema/lint."),
                dryRun: z
                    .boolean()
                    .optional()
                    .describe("When true, only validate; do not write the file. Default false."),
                confirmedWrite: z
                    .boolean()
                    .optional()
                    .describe("Required as true for non-dry writes after explicit user confirmation.")
            },
            outputSchema: z.object({
                planPath: z.string(),
                planYaml: z.string(),
                written: z.boolean(),
                dryRun: z.boolean(),
                confirmationRequired: z.boolean(),
                validation: validationSchema
            }),
            _meta: { ui: { resourceUri } }
        },
        async ({ planPath, planYaml, dryRun, confirmedWrite }): Promise<CallToolResult> => {
            const { isError, payload } = await updateTestPlan({ planPath, planYaml, dryRun, confirmedWrite });
            return {
                isError,
                content: [{ type: "text", text: renderUpdateTextFallback(payload) }],
                structuredContent: payload as unknown as Record<string, unknown>
            };
        }
    );

    registerAppResource(
        server,
        resourceUri,
        resourceUri,
        { mimeType: RESOURCE_MIME_TYPE },
        async (): Promise<ReadResourceResult> => {
            const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
            return {
                contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }]
            };
        }
    );

    return server;
}
