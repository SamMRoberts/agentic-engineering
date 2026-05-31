// Read-only: list run report directories (most recent first).
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ServerContext, listDirs } from "../context.js";

export function registerListReports(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_reports",
    {
      title: "List web UX run reports",
      description: "List run report directories under the configured reports directory.",
      inputSchema: {},
      outputSchema: { reportsDir: z.string(), reports: z.array(z.string()) }
    },
    async () => {
      const reports = (await listDirs(ctx.reportsDir)).reverse();
      return {
        content: [{ type: "text", text: reports.length ? reports.join("\n") : `No reports in ${ctx.reportsDir}` }],
        structuredContent: { reportsDir: ctx.reportsDir, reports }
      };
    }
  );
}
