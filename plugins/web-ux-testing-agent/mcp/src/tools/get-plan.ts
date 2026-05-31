// Read-only: return the raw YAML and parsed object for one plan.
import { z } from "zod";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ServerContext, safeResolve, readText } from "../context.js";
import { parsePlan } from "../../../lib/plan-loader.mjs";
import { validatePlan } from "../../../lib/plan-validator.mjs";

export function registerGetPlan(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "get_plan",
    {
      title: "Get a web UX test plan",
      description: "Read one plan by file name (relative to the plans dir) and return its YAML, parsed object, and validation.",
      inputSchema: { plan: z.string().min(1).describe("Plan file name or workspace-relative path.") },
      outputSchema: {
        planPath: z.string(),
        yaml: z.string().nullable(),
        parsed: z.any().nullable(),
        validation: z.object({ errors: z.array(z.string()), warnings: z.array(z.string()) }).nullable()
      }
    },
    async ({ plan }) => {
      const planPath = plan.includes("/") ? safeResolve(ctx, plan) : path.join(ctx.plansDir, plan);
      const yaml = await readText(planPath);
      let parsed: unknown = null;
      let validation = null;
      if (yaml != null) {
        try {
          parsed = parsePlan(yaml, { format: planPath.endsWith(".json") ? "json" : "yaml" });
          validation = validatePlan(parsed);
        } catch (err) {
          validation = { errors: [`Could not parse: ${String(err)}`], warnings: [] };
        }
      }
      return {
        isError: yaml == null,
        content: [{ type: "text", text: yaml ?? `Plan not found: ${planPath}` }],
        structuredContent: { planPath, yaml, parsed, validation }
      };
    }
  );
}
