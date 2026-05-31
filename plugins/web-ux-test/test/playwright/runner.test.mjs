import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { buildPlaywrightArgs } from "../../lib/playwright/runner.mjs";

test("buildPlaywrightArgs uses browser flag instead of project name", () => {
    const cwd = path.resolve("/tmp/project");
    const specPath = path.join(cwd, ".web-ux-testing/generated-tests/checkout.spec.ts");
    const runDir = path.join(cwd, ".web-ux-testing/runs/run-1");
    const args = buildPlaywrightArgs({ cwd, specPath, browser: "chromium", runDir });

    assert.ok(args.includes("--browser=chromium"));
    assert.equal(args.some((arg) => arg.startsWith("--project=")), false);
});
