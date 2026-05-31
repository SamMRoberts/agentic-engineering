// MCP server for web-ux-testing-agent. Registers eight data tools plus two MCP
// App launchers (plan editor, report viewer). Read-only tools are separated from
// mutating tools (save_plan, run_plan), which require explicit confirmation.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE
} from "@modelcontextprotocol/ext-apps/server";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { createContext, type ServerContext } from "./context.js";
import { registerListPlans } from "./tools/list-plans.js";
import { registerGetPlan } from "./tools/get-plan.js";
import { registerSavePlan } from "./tools/save-plan.js";
import { registerValidatePlan } from "./tools/validate-plan.js";
import { registerRunPlan } from "./tools/run-plan.js";
import { registerListReports } from "./tools/list-reports.js";
import { registerGetReport } from "./tools/get-report.js";
import { registerDebugFailure } from "./tools/debug-failure.js";

const PLAN_EDITOR_URI = "ui://web-ux-testing-agent/plan-editor.html";
const REPORT_VIEWER_URI = "ui://web-ux-testing-agent/report-viewer.html";

function appDir(): string {
  // When built, HTML lives next to dist; in dev it lives under src/apps.
  return import.meta.filename.endsWith(".ts")
    ? path.join(import.meta.dirname, "apps")
    : path.join(import.meta.dirname, "apps");
}

async function readAppHtml(name: string): Promise<string> {
  const candidates = [
    path.join(appDir(), name, "index.html"),
    path.join(import.meta.dirname, name === "plan-editor" ? "plan-editor.html" : "report-viewer.html")
  ];
  for (const c of candidates) {
    try {
      return await fs.readFile(c, "utf-8");
    } catch {
      /* try next */
    }
  }
  return `<!doctype html><html><body><p>App ${name} not built.</p></body></html>`;
}

export function createServer(ctx: ServerContext = createContext()): McpServer {
  const server = new McpServer({ name: "web-ux-testing-agent", version: "0.1.0" });

  // Data tools.
  registerListPlans(server, ctx);
  registerGetPlan(server, ctx);
  registerSavePlan(server, ctx);
  registerValidatePlan(server, ctx);
  registerRunPlan(server, ctx);
  registerListReports(server, ctx);
  registerGetReport(server, ctx);
  registerDebugFailure(server, ctx);

  // MCP App launchers.
  registerAppTool(
    server,
    "open_plan_editor",
    {
      title: "Open the Web UX Plan Editor",
      description: "Open the interactive plan editor app. Pass an optional plan name to preload.",
      inputSchema: { plan: z.string().optional().describe("Plan file name to preload.") },
      outputSchema: { plansDir: z.string(), plan: z.string().nullable() },
      _meta: { ui: { resourceUri: PLAN_EDITOR_URI } }
    },
    async ({ plan }): Promise<CallToolResult> => ({
      content: [{ type: "text", text: `Plan editor ready (plansDir: ${ctx.plansDir}).` }],
      structuredContent: { plansDir: ctx.plansDir, plan: plan ?? null }
    })
  );

  registerAppTool(
    server,
    "open_report_viewer",
    {
      title: "Open the Web UX Report Viewer",
      description: "Open the interactive report viewer app. Pass an optional run directory to preload.",
      inputSchema: { run: z.string().optional().describe("Run directory name to preload.") },
      outputSchema: { reportsDir: z.string(), run: z.string().nullable() },
      _meta: { ui: { resourceUri: REPORT_VIEWER_URI } }
    },
    async ({ run }): Promise<CallToolResult> => ({
      content: [{ type: "text", text: `Report viewer ready (reportsDir: ${ctx.reportsDir}).` }],
      structuredContent: { reportsDir: ctx.reportsDir, run: run ?? null }
    })
  );

  registerAppResource(
    server,
    PLAN_EDITOR_URI,
    PLAN_EDITOR_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => ({
      contents: [{ uri: PLAN_EDITOR_URI, mimeType: RESOURCE_MIME_TYPE, text: await readAppHtml("plan-editor") }]
    })
  );

  registerAppResource(
    server,
    REPORT_VIEWER_URI,
    REPORT_VIEWER_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => ({
      contents: [{ uri: REPORT_VIEWER_URI, mimeType: RESOURCE_MIME_TYPE, text: await readAppHtml("report-viewer") }]
    })
  );

  return server;
}
