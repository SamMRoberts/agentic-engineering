// Read-only analysis: classify a run's failure and suggest minimal repairs. This
// is the deterministic triage pass; live investigation still uses Playwright MCP
// via the debugger subagent.
import { z } from "zod";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ServerContext, safeResolve, readText } from "../context.js";
import { analyzeFailure } from "../../../lib/failure-triage.mjs";

export function registerDebugFailure(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "debug_failure",
    {
      title: "Diagnose a failed web UX run",
      description:
        "Analyze a run's report.json and return a failure category, confidence, rationale, and recommended repairs. For live inspection, hand off to Playwright MCP.",
      inputSchema: { run: z.string().min(1).describe("Run directory name or workspace-relative path.") },
      outputSchema: {
        category: z.string(),
        confidence: z.string(),
        rationale: z.string(),
        recommended_repairs: z.array(z.string())
      }
    },
    async ({ run }) => {
      const reportDir = run.includes("/") ? safeResolve(ctx, run) : path.join(ctx.reportsDir, run);
      const raw = await readText(path.join(reportDir, "report.json"));
      if (raw == null) {
        return {
          isError: true,
          content: [{ type: "text", text: `No report.json in ${reportDir}` }],
          structuredContent: { category: "unknown", confidence: "low", rationale: "No report found.", recommended_repairs: [] }
        };
      }
      const diag = analyzeFailure(JSON.parse(raw));
      const text = `Category: ${diag.category} (${diag.confidence})\n${diag.rationale}\n` +
        diag.recommended_repairs.map((r) => `- ${r}`).join("\n");
      return { content: [{ type: "text", text }], structuredContent: diag };
    }
  );
}
