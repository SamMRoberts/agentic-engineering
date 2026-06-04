import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillPath = join(pluginRoot, "skills", "web-ux-gremlin", "SKILL.md");
const checklistPath = join(pluginRoot, "skills", "web-ux-gremlin", "checklists", "gremlin-mode.md");

const skill = readFileSync(skillPath, "utf8");
const checklist = readFileSync(checklistPath, "utf8");

test("skill exposes gremlin mode as an explicit workflow mode", () => {
  assert.match(skill, /## Modes/);
  assert.match(skill, /### Gremlin Mode/);
  assert.match(skill, /Default to gremlin mode/);
  assert.match(skill, /<mode>standard or gremlin<\/mode>/);
});

test("gremlin mode requires uncommon actions and recovery assertions", () => {
  assert.match(skill, /Rapid or duplicated interactions/);
  assert.match(skill, /Strange but user-enterable data/);
  assert.match(skill, /State disruption/);
  assert.match(skill, /Alternate input paths/);
  assert.match(skill, /Recovery pressure/);
  assert.match(skill, /gremlin action count driven by the selected intensity/);
  assert.match(skill, /one recovery assertion after each unusual action cluster/);
});

test("top-level orchestrator requires delegated Playwright execution", () => {
  assert.match(skill, /## Delegation Guardrails/);
  assert.match(skill, /must never run Playwright CLI commands directly/);
  assert.match(skill, /must never run Playwright MCP tool actions directly/);
  assert.match(skill, /Every Playwright action must be delegated/);
  assert.match(skill, /Delegate all Playwright execution to `playwright-test-healer`/);
  assert.doesNotMatch(skill, /Run the narrowest useful Playwright command after generation:/);
});

test("gremlin checklist covers mayhem tactics and safety boundaries", () => {
  for (const heading of [
    "## Interaction Mayhem",
    "## Input Mischief",
    "## State Disruption",
    "## Accessibility Mischief",
    "## Recovery Expectations",
    "## Safety Boundaries"
  ]) {
    assert.ok(checklist.includes(heading), `${heading} missing`);
  }

  assert.match(checklist, /Prefer deterministic gremlin actions over random behavior/);
  assert.match(checklist, /Do not run uncontrolled load/);
});
