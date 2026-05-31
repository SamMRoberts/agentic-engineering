// Read-only: list available test plans in the configured plans directory.
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ServerContext, listFiles } from "../context.js";

export function registerListPlans(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "list_plans",
    {
      title: "List web UX test plans",
      description: "List plan files (*.plan.yaml / *.plan.json) in the configured plans directory.",
      inputSchema: {},
      outputSchema: { plansDir: z.string(), plans: z.array(z.string()) }
    },
    async () => {
      const plans = await listFiles(ctx.plansDir, [".plan.yaml", ".plan.yml", ".plan.json"]);
      const structured = { plansDir: ctx.plansDir, plans };
      return {
        content: [{ type: "text", text: plans.length ? plans.join("\n") : `No plans in ${ctx.plansDir}` }],
        structuredContent: structured
      };
    }
  );
}
