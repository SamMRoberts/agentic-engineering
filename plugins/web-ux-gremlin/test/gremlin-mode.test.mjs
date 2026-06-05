import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(pluginRoot, "skills");
const skillPath = join(skillsRoot, "web-ux-gremlin", "SKILL.md");
const checklistPath = join(skillsRoot, "web-ux-gremlin", "checklists", "gremlin-mode.md");
const runContractPath = join(skillsRoot, "web-ux-gremlin", "checklists", "run-contract.md");
const stageHandoffsPath = join(skillsRoot, "web-ux-gremlin", "checklists", "stage-handoffs.md");

const skill = readFileSync(skillPath, "utf8");
const checklist = readFileSync(checklistPath, "utf8");
const runContract = readFileSync(runContractPath, "utf8");
const stageHandoffs = readFileSync(stageHandoffsPath, "utf8");

function readSkill(name) {
  return readFileSync(join(skillsRoot, name, "SKILL.md"), "utf8");
}

function bodyLineCount(markdown) {
  const lines = markdown.split(/\r?\n/);
  const firstDelimiter = lines.findIndex((line) => line === "---");
  const secondDelimiter = lines.findIndex((line, index) => index > firstDelimiter && line === "---");
  assert.notEqual(secondDelimiter, -1, "skill frontmatter must close with ---");
  return lines.slice(secondDelimiter + 1).filter((line) => line.trim() !== "").length;
}

test("public skill routes to private stage skills and stays concise", () => {
  assert.match(skill, /user-invocable: true/);
  assert.match(skill, /single public orchestrator/);
  assert.match(skill, /web-ux-gremlin-discovery/);
  assert.match(skill, /web-ux-gremlin-plan/);
  assert.match(skill, /web-ux-gremlin-generate/);
  assert.match(skill, /web-ux-gremlin-execute/);
  assert.match(skill, /web-ux-gremlin-heal/);
  assert.match(skill, /web-ux-gremlin-report/);
  assert.ok(bodyLineCount(skill) <= 120, "public skill body should stay compact");
});

test("private stage skills are present and not user invocable", () => {
  const expected = [
    "web-ux-gremlin-discovery",
    "web-ux-gremlin-plan",
    "web-ux-gremlin-generate",
    "web-ux-gremlin-execute",
    "web-ux-gremlin-heal",
    "web-ux-gremlin-report"
  ];
  const skillDirs = new Set(readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name));

  for (const name of expected) {
    assert.ok(skillDirs.has(name), `${name} skill directory missing`);
    assert.match(readSkill(name), /user-invocable: false/, `${name} must be private`);
  }
});

test("gremlin mode requires uncommon actions and recovery assertions", () => {
  assert.match(skill, /## Gremlin Mode/);
  assert.match(skill, /at least one explicit gremlin action/);
  assert.match(skill, /recovery assertion/);
  assert.match(skill, /high-chaos approval/);
  assert.match(skill, /checklists\/gremlin-mode\.md/);
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

test("run contract and handoff references preserve safety state", () => {
  assert.match(runContract, /Run contract: mode=/);
  assert.match(runContract, /high_chaos_approved/);
  assert.match(runContract, /safe_fixtures/);
  assert.match(runContract, /Ask for exact alternatives when browser or tool is `Other`/);

  for (const field of [
    "Scope:",
    "Assumptions:",
    "Out of scope:",
    "Auth policy:",
    "Safety constraints:",
    "Run contract:"
  ]) {
    assert.ok(stageHandoffs.includes(field), `${field} missing from handoff template`);
  }
});
