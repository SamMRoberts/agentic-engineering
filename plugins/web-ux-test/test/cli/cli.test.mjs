import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { runInit } from "../../lib/cli/init.mjs";
import { runPlanValidate, runPlanCreate } from "../../lib/cli/plan.mjs";
import { runStateShow, runStateValidate } from "../../lib/cli/state.mjs";
import { runNext, runPhase } from "../../lib/cli/run.mjs";
import { runAuthSetup } from "../../lib/cli/auth.mjs";
import { runSelectorsDiscover } from "../../lib/cli/selectors.mjs";
import { runTestGenerate, runTestReview } from "../../lib/cli/test.mjs";
import { runAgentStub } from "../../lib/cli/agent.mjs";

function mktmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "wux-cli-"));
}

function fixturePath(name) {
    return path.resolve("test/fixtures", name);
}

test("init creates the expected project layout with auth gitignore", async () => {
    const cwd = mktmp();
    const result = await runInit({ cwd });
    assert.equal(result.ok, true);
    assert.equal(result.already, false);
    const expected = ["state.json", "project.yaml", "plans", "runs", "reports", "auth", "generated-tests"];
    for (const entry of expected) {
        assert.ok(fs.existsSync(path.join(cwd, ".web-ux-testing", entry)), `missing ${entry}`);
    }
    const gitignore = fs.readFileSync(path.join(cwd, ".web-ux-testing", "auth", ".gitignore"), "utf8");
    assert.match(gitignore, /^\*$/m);
    assert.match(gitignore, /!\.gitignore/);
});

test("init is idempotent (already-initialized returns ok with already=true)", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    const result = await runInit({ cwd });
    assert.equal(result.ok, true);
    assert.equal(result.already, true);
});

test("plan validate accepts the spec example", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    const result = await runPlanValidate({ planPath: fixturePath("plan-valid-example.yaml"), cwd });
    assert.equal(result.ok, true, `errors: ${(result.errors ?? []).join("; ")}`);
});

test("plan validate rejects invalid plan", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    const result = await runPlanValidate({ planPath: fixturePath("plan-invalid-missing-baseurl.yaml"), cwd });
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
});

test("state show reflects fresh init", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    const result = runStateShow({ cwd });
    assert.equal(result.phase, "initialized");
    assert.ok(result.nextAllowedActions.includes("plan create"));
});

test("state validate exits ok for fresh state", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    const result = runStateValidate({ cwd });
    assert.equal(result.ok, true);
});

test("run next from initialized cannot auto-advance without plan input", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    const result = await runNext({ cwd });
    // initialized -> plan_created requires payload (planId, planPath); runNext refuses.
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /requires explicit input|terminal/);
});

test("run phase test_executed from plan_created is rejected (transition error)", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    await runPlanCreate({ planPath: fixturePath("plan-valid-example.yaml"), cwd });
    const result = await runPhase({ targetPhase: "test_executed", cwd });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /Cannot reach phase|test_executed/);
});

test("end-to-end (sans Playwright execution): plan -> validate -> auth -> selectors -> generate -> review", async () => {
    const cwd = mktmp();
    await runInit({ cwd });
    const validate = await runPlanValidate({ planPath: fixturePath("plan-valid-example.yaml"), cwd });
    assert.equal(validate.ok, true);
    assert.equal(validate.phase, "plan_validated");
    const auth = await runAuthSetup({ cwd });
    assert.equal(auth.ok, true);
    assert.equal(auth.phase, "auth_configured");
    const sel = await runSelectorsDiscover({ cwd });
    assert.equal(sel.ok, true);
    assert.equal(sel.phase, "selectors_discovered");
    const gen = await runTestGenerate({ cwd });
    assert.equal(gen.ok, true);
    assert.equal(gen.phase, "test_skeleton_generated");
    assert.ok(fs.existsSync(gen.specPath));
    const review = await runTestReview({ cwd });
    assert.equal(review.ok, true);
    assert.equal(review.phase, "test_reviewed");
});

test("agent stubs return not-implemented payload (do not invoke external tools)", () => {
    for (const sub of ["draft-plan", "generate-test", "explain-failure", "propose-repair"]) {
        const result = runAgentStub(sub);
        assert.equal(result.ok, true);
        assert.equal(result.notImplemented, true);
        assert.equal(result.subcommand, sub);
        assert.match(result.message, /Copilot CLI adapter/);
    }
});
