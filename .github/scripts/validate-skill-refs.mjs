/**
 * Validates that scripts referenced in SKILL.md files exist and are scoped to the referencing skill.
 *
 * Checks two kinds of references:
 * 1. Direct `node skills/<skill>/scripts/...` invocations
 * 2. `npm run <script>` commands that must be defined in package.json and point to the skill's scripts folder
 *
 * Run from the plugin root directory:
 *   node ../../.github/scripts/validate-skill-refs.mjs
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, normalize } from "path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const skillsDir = "skills";
let errors = 0;
let checks = 0;
const scriptUsers = new Map();

// Load optional ignore list (.skill-ref-ignore) with patterns to skip
const ignoreFile = ".skill-ref-ignore";
const ignorePatterns = existsSync(ignoreFile)
  ? readFileSync(ignoreFile, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  : [];

function isIgnored(type, ref) {
  const key = `${type}:${ref}`;
  return ignorePatterns.some((pattern) => key === pattern);
}

function recordScriptUser(skill, script) {
  const users = scriptUsers.get(script) ?? new Set();
  users.add(skill);
  scriptUsers.set(script, users);
}

function expectedSkillScriptPrefix(skill) {
  return normalize(join(skillsDir, skill, "scripts")) + "/";
}

function validateSkillScriptPath(skill, script) {
  const normalized = normalize(script).replaceAll("\\", "/");
  const expectedPrefix = expectedSkillScriptPrefix(skill).replaceAll("\\", "/");

  if (!normalized.startsWith(expectedPrefix)) {
    console.error(
      `ERROR: Skill "${skill}" references script outside its scripts folder: ${script}`
    );
    errors++;
    return false;
  }

  if (!existsSync(script)) {
    console.error(`ERROR: Skill "${skill}" references missing script: ${script}`);
    errors++;
    return false;
  }

  recordScriptUser(skill, normalized);
  console.log(`OK: Skill "${skill}" -> ${script}`);
  return true;
}

function scriptPathFromNpmCommand(command) {
  const match = command.match(/(?:^|&&|;)\s*node\s+([^\s`"']+)/);
  return match?.[1]?.replace(/[,;)}\]]+$/, "");
}

if (!existsSync(skillsDir)) {
  console.error("ERROR: No skills directory found");
  process.exit(1);
}

const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const skill of skillDirs) {
  const skillFile = join(skillsDir, skill, "SKILL.md");
  if (!existsSync(skillFile)) continue;

  const content = readFileSync(skillFile, "utf8");

  // Check direct node skills/<skill>/scripts/... references
  const scriptRefs = [...content.matchAll(/`[^`]*node\s+([^\s`"]+)[^`]*`/g)].map((m) =>
    m[1].replace(/[,;)}\]]+$/, "")
  );

  for (const script of scriptRefs) {
    if (isIgnored("script", script)) continue;
    checks++;
    validateSkillScriptPath(skill, script);
  }

  // Check npm run ... references inside backtick-delimited commands
  const npmRefs = [...content.matchAll(/`[^`]*npm run ([a-zA-Z0-9_][a-zA-Z0-9:_-]*)[^`]*`/g)].map(
    (m) => m[1]
  );

  for (const npmScript of npmRefs) {
    if (isIgnored("npm", npmScript)) continue;
    checks++;
    const command = pkg.scripts?.[npmScript];
    if (!command) {
      console.error(
        `ERROR: Skill "${skill}" references undefined npm script: ${npmScript}`
      );
      errors++;
      continue;
    }

    const script = scriptPathFromNpmCommand(command);
    if (!script) {
      console.error(
        `ERROR: npm script "${npmScript}" does not invoke a node script: ${command}`
      );
      errors++;
      continue;
    }

    if (validateSkillScriptPath(skill, script)) {
      console.log(`OK: Skill "${skill}" -> npm run ${npmScript}`);
    }
  }
}

for (const [script, users] of scriptUsers) {
  if (users.size > 1) {
    console.error(
      `ERROR: Script "${script}" is referenced by multiple skills: ${[...users].join(", ")}`
    );
    errors++;
  }
}

console.log(`\nChecked ${checks} script reference(s) across ${skillDirs.length} skill(s)`);

if (errors > 0) {
  console.error(`FAILED: ${errors} broken reference(s) found`);
  process.exit(1);
}

console.log("All skill script references are scoped and valid");
