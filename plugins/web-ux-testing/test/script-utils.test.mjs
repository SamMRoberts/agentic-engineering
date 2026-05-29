import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { arg } from "../scripts/lib/cli-utils.mjs";
import { toSafeFileName } from "../scripts/lib/yaml-utils.mjs";

describe("arg", () => {
  it("reads --flag value syntax", () => {
    const value = arg("plan", "fallback.yaml", { argv: ["node", "script", "--plan", "custom.yaml"] });
    assert.equal(value, "custom.yaml");
  });

  it("reads --flag=value syntax", () => {
    const value = arg("plan", "fallback.yaml", { argv: ["node", "script", "--plan=custom.yaml"] });
    assert.equal(value, "custom.yaml");
  });

  it("falls back to positional when configured", () => {
    const value = arg("plan", "fallback.yaml", { argv: ["node", "script", "positional.yaml"], positionalIndex: 2 });
    assert.equal(value, "positional.yaml");
  });
});

describe("toSafeFileName", () => {
  it("normalizes ids and trims separators", () => {
    assert.equal(toSafeFileName(" FORM-001 Checkout "), "form-001-checkout");
  });

  it("returns unnamed when value has no safe characters", () => {
    assert.equal(toSafeFileName("!!!"), "unnamed");
  });
});
