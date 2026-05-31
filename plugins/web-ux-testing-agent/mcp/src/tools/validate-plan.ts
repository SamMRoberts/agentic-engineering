// Read-only: validate raw plan YAML against the schema + lint rules.
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerContext } from "../context.js";
import { parsePlan } from "../../../lib/plan-loader.mjs";
import { validatePlan } from "../../../lib/plan-validator.mjs";

export function registerValidatePlan(server: McpServer, _ctx: ServerContext): void {
  server.registerTool(
    "validate_plan",
    {
      title: "Validate web UX plan YAML",
      description: "Validate plan YAML (schema + safety lint) without writing anything. Returns errors and warnings.",
      inputSchema: { planYaml: z.string().min(1).describe("Full plan YAML to validate.") },
      outputSchema: {
        valid: z.boolean(),
        errors: z.array(z.string()),
        warnings: z.array(z.string())
      }
    },
    async ({ planYaml }) => {
      let result = { errors: [] as string[], warnings: [] as string[] };
      try {
        const parsed = parsePlan(planYaml);
        result = validatePlan(parsed);
      } catch (err) {
        result = { errors: [`Could not parse YAML: ${String(err)}`], warnings: [] };
      }
      const valid = result.errors.length === 0;
      const text = [
        ...result.warnings.map((w) => `WARN: ${w}`),
        ...result.errors.map((e) => `ERROR: ${e}`),
        valid ? "OK: plan is valid" : ""
      ]
        .filter(Boolean)
        .join("\n");
      return {
        isError: !valid,
        content: [{ type: "text", text }],
        structuredContent: { valid, errors: result.errors, warnings: result.warnings }
      };
    }
  );
}
