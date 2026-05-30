import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";

import { updateTestPlan } from "../server.ts";

function basePlan(overrides: Record<string, unknown> = {}) {
    return {
        plan_version: 1,
        target: {
            url: "https://example.com",
            stage: "local",
            auth_strategy: "none"
        },
        runner: "playwright-mcp",
        safety: {
            destructive_actions_allowed: false,
            forbidden_selectors: [],
            forbidden_urls: []
        },
        scope: {
            in_scope: ["home"],
            out_of_scope: ["admin"]
        },
        scenarios: [
            {
                id: "home-smoke",
                title: "Home renders",
                priority: "P2",
                surface: "route",
                preconditions: ["app reachable"],
                steps: [
                    { action: "navigate", target: "/", expect: "HTTP 200 and DOM ready" }
                ],
                success_criteria: ["primary landmark visible"],
                evidence_required: ["snapshot", "console"]
            }
        ],
        ...overrides
    };
}

async function withTempPlan<T>(fn: (planPath: string) => Promise<T>): Promise<T> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "web-frontend-plan-"));
    try {
        return await fn(path.join(dir, "test-plan.yaml"));
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

test("updateTestPlan validates dry runs without writing", async () => {
    await withTempPlan(async (planPath) => {
        const result = await updateTestPlan({
            planPath,
            planYaml: YAML.stringify(basePlan()),
            dryRun: true
        });

        assert.equal(result.isError, false);
        assert.equal(result.payload.written, false);
        assert.equal(result.payload.dryRun, true);
        assert.equal(result.payload.confirmationRequired, false);
        await assert.rejects(fs.access(planPath));
    });
});

test("updateTestPlan refuses non-dry writes without explicit confirmation", async () => {
    await withTempPlan(async (planPath) => {
        const result = await updateTestPlan({
            planPath,
            planYaml: YAML.stringify(basePlan())
        });

        assert.equal(result.isError, true);
        assert.equal(result.payload.written, false);
        assert.equal(result.payload.confirmationRequired, true);
        assert.deepEqual(result.payload.validation.errors, []);
        await assert.rejects(fs.access(planPath));
    });
});

test("updateTestPlan refuses invalid confirmed writes", async () => {
    await withTempPlan(async (planPath) => {
        const result = await updateTestPlan({
            planPath,
            planYaml: YAML.stringify(basePlan({ runner: "not-a-runner" })),
            confirmedWrite: true
        });

        assert.equal(result.isError, true);
        assert.equal(result.payload.written, false);
        assert.equal(result.payload.confirmationRequired, false);
        assert.ok(result.payload.validation.errors.length > 0);
        await assert.rejects(fs.access(planPath));
    });
});

test("updateTestPlan writes valid plans after explicit confirmation", async () => {
    await withTempPlan(async (planPath) => {
        const planYaml = YAML.stringify(basePlan());
        const result = await updateTestPlan({
            planPath,
            planYaml,
            confirmedWrite: true
        });

        assert.equal(result.isError, false);
        assert.equal(result.payload.written, true);
        assert.equal(result.payload.confirmationRequired, false);
        assert.equal(await fs.readFile(planPath, "utf-8"), planYaml);
    });
});
