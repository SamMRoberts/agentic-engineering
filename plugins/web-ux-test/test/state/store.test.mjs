import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
    initState,
    readState,
    updateState,
    writeState,
    isInitialized,
    statePath,
    StateError
} from "../../lib/state/store.mjs";
import { createInitialState } from "../../lib/workflow/engine.mjs";

function mktmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "wux-state-"));
}

test("initState creates a fresh state.json", async () => {
    const cwd = mktmp();
    assert.equal(isInitialized(cwd), false);
    const state = await initState({ cwd });
    assert.equal(state.phase, "initialized");
    assert.ok(fs.existsSync(statePath(cwd)));
});

test("initState fails when state already exists", async () => {
    const cwd = mktmp();
    await initState({ cwd });
    await assert.rejects(() => initState({ cwd }), (err) => err instanceof StateError);
});

test("readState returns a structurally valid state", async () => {
    const cwd = mktmp();
    await initState({ cwd });
    const state = readState(cwd);
    assert.equal(state.phase, "initialized");
    assert.deepEqual(state.history, []);
});

test("updateState round-trips through schema validation", async () => {
    const cwd = mktmp();
    await initState({ cwd });
    const next = await updateState((s) => ({ ...s, planId: "p1", planPath: ".web-ux-testing/plans/p1.yaml" }), { cwd });
    assert.equal(next.planId, "p1");
    const reread = readState(cwd);
    assert.equal(reread.planId, "p1");
});

test("writeState rejects an invalid state", async () => {
    const cwd = mktmp();
    await initState({ cwd });
    const bad = { ...createInitialState(), phase: "warp_speed" };
    await assert.rejects(() => writeState(bad, { cwd }), (err) => err instanceof StateError);
});

test("readState throws when uninitialized", () => {
    const cwd = mktmp();
    assert.throws(() => readState(cwd), (err) => err instanceof StateError);
});

test("concurrent updateState calls serialize via the lock", async () => {
    const cwd = mktmp();
    await initState({ cwd });
    const results = await Promise.all(
        Array.from({ length: 5 }).map((_, i) =>
            updateState((s) => ({ ...s, planId: `p${i}`, planPath: `pp${i}.yaml` }), { cwd, timeoutMs: 10_000 })
        )
    );
    // Last write wins for value, but every call returned without throwing.
    assert.equal(results.length, 5);
    const final = readState(cwd);
    assert.match(final.planId, /^p\d$/);
});
