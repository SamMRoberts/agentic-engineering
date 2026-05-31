// Mutating (executes tests): run a plan through the Playwright CLI runner and
// return the normalized report. This is the deterministic execution path; it
// shells out to the runner CLI rather than driving a browser via MCP.
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { type ServerContext, safeResolve, readText } from "../context.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function runnerEntry(): string {
  // mcp/src/tools -> plugin root -> runner/src/cli.ts
  return path.resolve(import.meta.dirname, "..", "..", "..", "runner", "src", "cli.ts");
}

export function registerRunPlan(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "run_plan",
    {
      title: "Run a web UX plan (Playwright CLI)",
      description:
        "Generate and execute a plan's Playwright spec via the CLI runner, then return the normalized report. Use the debugger tools/MCP only for failure investigation, not as the default runner.",
      inputSchema: {
        plan: z.string().min(1).describe("Plan file name or workspace-relative path."),
        confirmedRun: z.boolean().optional().describe("Required true to actually execute tests (side effects).")
      },
      outputSchema: {
        ran: z.boolean(),
        status: z.string(),
        reportDir: z.string().nullable(),
        report: z.any().nullable(),
        stderr: z.string()
      }
    },
    async ({ plan, confirmedRun }) => {
      const planPath = plan.includes("/") ? safeResolve(ctx, plan) : path.join(ctx.plansDir, plan);
      if (confirmedRun !== true) {
        return {
          isError: true,
          content: [{ type: "text", text: "Refused: set confirmedRun=true to execute tests (this performs real browser actions)." }],
          structuredContent: { ran: false, status: "refused", reportDir: null, report: null, stderr: "" }
        };
      }
      const reportDir = path.join(ctx.reportsDir, String(Date.now()));
      const stderr = await new Promise<string>((resolve) => {
        let buf = "";
        const child = spawn("npx", ["tsx", runnerEntry(), "run", planPath, "--report-dir", reportDir], {
          cwd: ctx.workspaceRoot,
          env: process.env
        });
        child.stderr.on("data", (d) => (buf += d.toString()));
        child.on("close", () => resolve(buf));
        child.on("error", (e) => resolve(buf + String(e)));
      });
      const reportRaw = await readText(path.join(reportDir, "report.json"));
      const report = reportRaw ? JSON.parse(reportRaw) : null;
      const status = report?.status ?? "unknown";
      return {
        isError: status !== "passed",
        content: [{ type: "text", text: report ? `${status}: ${reportDir}/report.md` : `No report produced.\n${stderr}` }],
        structuredContent: { ran: true, status, reportDir, report, stderr }
      };
    }
  );
}
