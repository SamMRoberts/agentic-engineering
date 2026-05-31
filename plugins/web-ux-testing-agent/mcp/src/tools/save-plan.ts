// Mutating: validate and write plan YAML to disk. Refuses to write invalid
// plans, and requires confirmedWrite=true for non-dry writes.
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ServerContext, safeResolve } from "../context.js";
import { parsePlan } from "../../../lib/plan-loader.mjs";
import { validatePlan } from "../../../lib/plan-validator.mjs";

export function registerSavePlan(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "save_plan",
    {
      title: "Save a web UX test plan",
      description:
        "Validate then write plan YAML. dryRun=true validates only. Non-dry writes require confirmedWrite=true and are refused when validation has errors.",
      inputSchema: {
        plan: z.string().min(1).describe("Plan file name or workspace-relative path to write."),
        planYaml: z.string().min(1).describe("Full plan YAML content."),
        dryRun: z.boolean().optional().describe("Validate without writing. Default false."),
        confirmedWrite: z.boolean().optional().describe("Required true for non-dry writes.")
      },
      outputSchema: {
        planPath: z.string(),
        written: z.boolean(),
        dryRun: z.boolean(),
        confirmationRequired: z.boolean(),
        validation: z.object({ errors: z.array(z.string()), warnings: z.array(z.string()) })
      }
    },
    async ({ plan, planYaml, dryRun, confirmedWrite }) => {
      const planPath = plan.includes("/") ? safeResolve(ctx, plan) : path.join(ctx.plansDir, plan);
      const dry = dryRun === true;
      const confirmationRequired = !dry && confirmedWrite !== true;
      let validation = { errors: [] as string[], warnings: [] as string[] };
      try {
        validation = validatePlan(parsePlan(planYaml));
      } catch (err) {
        validation = { errors: [`Could not parse YAML: ${String(err)}`], warnings: [] };
      }
      const hasErrors = validation.errors.length > 0;
      const written = !dry && !confirmationRequired && !hasErrors;
      if (written) {
        await fs.mkdir(path.dirname(planPath), { recursive: true });
        await fs.writeFile(planPath, planYaml, "utf-8");
      }
      const text = [
        dry ? "Validation (dry-run)" : written ? "Plan written" : "Plan NOT written",
        confirmationRequired ? "confirmedWrite=true required for non-dry writes." : "",
        ...validation.errors.map((e) => `ERROR: ${e}`),
        ...validation.warnings.map((w) => `WARN: ${w}`)
      ]
        .filter(Boolean)
        .join("\n");
      return {
        isError: hasErrors || confirmationRequired,
        content: [{ type: "text", text }],
        structuredContent: { planPath, written, dryRun: dry, confirmationRequired, validation }
      };
    }
  );
}
