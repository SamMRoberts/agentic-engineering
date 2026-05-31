// Read-only: return a normalized report (json + markdown) for one run.
import { z } from "zod";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ServerContext, safeResolve, readText } from "../context.js";
import { renderMarkdown } from "../../../lib/report.mjs";

export function registerGetReport(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_report",
    {
      title: "Get a web UX run report",
      description: "Read report.json for a run directory and return the parsed report plus rendered Markdown.",
      inputSchema: { run: z.string().min(1).describe("Run directory name or workspace-relative path.") },
      outputSchema: { reportDir: z.string(), report: z.any().nullable(), markdown: z.string().nullable() }
    },
    async ({ run }) => {
      const reportDir = run.includes("/") ? safeResolve(ctx, run) : path.join(ctx.reportsDir, run);
      const raw = await readText(path.join(reportDir, "report.json"));
      if (raw == null) {
        return {
          isError: true,
          content: [{ type: "text", text: `No report.json in ${reportDir}` }],
          structuredContent: { reportDir, report: null, markdown: null }
        };
      }
      const report = JSON.parse(raw);
      const markdown = (await readText(path.join(reportDir, "report.md"))) ?? renderMarkdown(report);
      return {
        content: [{ type: "text", text: markdown }],
        structuredContent: { reportDir, report, markdown }
      };
    }
  );
}
