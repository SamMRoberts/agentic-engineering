import { test } from "node:test";
import assert from "node:assert/strict";
import { createContext, safeResolve } from "../src/context.js";
import { createServer } from "../src/server.js";

test("safeResolve rejects path traversal outside the workspace", () => {
  const ctx = createContext({ WEB_UX_WORKSPACE: "/tmp/ws" });
  assert.equal(safeResolve(ctx, "plans/a.yaml"), "/tmp/ws/plans/a.yaml");
  assert.throws(() => safeResolve(ctx, "../../etc/passwd"), /escapes workspace/);
});

test("createContext honors env overrides", () => {
  const ctx = createContext({
    WEB_UX_WORKSPACE: "/tmp/ws",
    WEB_UX_PLANS_DIR: "p",
    WEB_UX_REPORTS_DIR: "r"
  });
  assert.equal(ctx.plansDir, "/tmp/ws/p");
  assert.equal(ctx.reportsDir, "/tmp/ws/r");
});

test("createServer builds without throwing", () => {
  const server = createServer(createContext({ WEB_UX_WORKSPACE: "/tmp/ws" }));
  assert.ok(server);
});
