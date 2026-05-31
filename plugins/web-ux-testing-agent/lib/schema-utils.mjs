// Shared schema loading + AJV compilation for the web-ux-testing-agent plugin.
// Source of truth for plan/step/report/environment validation. Reused by skills
// scripts, the runner CLI, the MCP server, and tests.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemasDir = path.resolve(here, "..", "schemas");

const SCHEMA_FILES = [
  "test-step.schema.json",
  "environment.schema.json",
  "test-plan.schema.json",
  "test-report.schema.json"
];

let ajv;

/** Build (once) an AJV instance with every plugin schema registered by $id and file name. */
export function getAjv() {
  if (ajv) return ajv;
  ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const file of SCHEMA_FILES) {
    const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, file), "utf-8"));
    // Register under both the file name (for relative $ref) and its $id.
    ajv.addSchema(schema, file);
  }
  return ajv;
}

/** Return a compiled validator for one of the named plugin schemas. */
export function getValidator(schemaFile) {
  const instance = getAjv();
  const validate = instance.getSchema(schemaFile);
  if (!validate) throw new Error(`Unknown schema: ${schemaFile}`);
  return validate;
}

/** Format AJV errors into stable, human-readable strings. */
export function formatAjvErrors(errors) {
  if (!errors) return [];
  return errors.map((e) => {
    const where = e.instancePath || "(root)";
    return `${where} ${e.message}${e.params && e.params.allowedValues ? ` (allowed: ${e.params.allowedValues.join(", ")})` : ""}`;
  });
}
