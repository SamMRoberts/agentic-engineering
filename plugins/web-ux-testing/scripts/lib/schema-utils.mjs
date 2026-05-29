import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import { readYamlFile } from "./yaml-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const pluginRoot = path.resolve(__dirname, "..", "..");

function createAjv() {
  return new Ajv2020({
    allErrors: true,
    strict: false
  });
}

function schemaPath(schemaFileName) {
  return path.join(pluginRoot, "schemas", schemaFileName);
}

export function validateAgainstSchema(value, schemaFileName) {
  const schema = readYamlFile(schemaPath(schemaFileName));
  const validate = createAjv().compile(schema);
  const valid = validate(value);

  if (valid) {
    return [];
  }

  return (validate.errors ?? []).map(formatAjvError);
}

function formatAjvError(error) {
  const pathLabel = error.instancePath || "/";

  if (error.keyword === "required") {
    return `${pathLabel} must include required property ${error.params.missingProperty}`;
  }

  return `${pathLabel} ${error.message}`;
}