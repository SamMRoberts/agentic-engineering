/**
 * Validates that scripts referenced in SKILL.md files actually exist in the plugin.
 *
 * Checks two kinds of references:
 * 1. Direct `node scripts/...` invocations
 * 2. `npm run <script>` commands that must be defined in package.json
 *
 * Run from the plugin root directory:
 *   node ../../.github/scripts/validate-skill-refs.mjs
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const skillsDir = "skills";
let errors = 0;
let checks = 0;

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

  // Check direct node scripts/... references
  const scriptRefs = [...content.matchAll(/`[^`]*node (scripts\/[^\s`"]+)[^`]*`/g)].map(
    (m) => m[1].replace(/[,;)}\]]+$/, "")
  );

  for (const script of scriptRefs) {
    if (isIgnored("script", script)) continue;
    checks++;
    if (!existsSync(script)) {
      console.error(`ERROR: Skill "${skill}" references missing script: ${script}`);
      errors++;
    } else {
      console.log(`OK: Skill "${skill}" -> ${script}`);
    }
  }

  // Check npm run ... references inside backtick-delimited commands
  const npmRefs = [...content.matchAll(/`[^`]*npm run ([a-zA-Z0-9_][a-zA-Z0-9:_-]*)[^`]*`/g)].map(
    (m) => m[1]
  );

  for (const npmScript of npmRefs) {
    if (isIgnored("npm", npmScript)) continue;
    checks++;
    if (!pkg.scripts?.[npmScript]) {
      console.error(
        `ERROR: Skill "${skill}" references undefined npm script: ${npmScript}`
      );
      errors++;
    } else {
      console.log(`OK: Skill "${skill}" -> npm run ${npmScript}`);
    }
  }
}

console.log(`\nChecked ${checks} script reference(s) across ${skillDirs.length} skill(s)`);

if (errors > 0) {
  console.error(`FAILED: ${errors} broken reference(s) found`);
  process.exit(1);
}

console.log("All script references validated successfully");
