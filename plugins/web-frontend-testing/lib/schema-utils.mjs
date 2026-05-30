import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { readYamlFile } from "./yaml-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const pluginRoot = path.resolve(__dirname, "..");

function createAjv() {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    return ajv;
}

function schemaPath(schemaFileName) {
    return path.join(pluginRoot, "schemas", schemaFileName);
}

export function validateAgainstSchema(value, schemaFileName) {
    const schema = readYamlFile(schemaPath(schemaFileName));
    const validate = createAjv().compile(schema);
    if (validate(value)) return [];
    return (validate.errors ?? []).map(formatAjvError);
}

function formatAjvError(error) {
    const where = error.instancePath || "/";
    if (error.keyword === "required") {
        return `${where} must include required property "${error.params.missingProperty}"`;
    }
    if (error.keyword === "enum") {
        return `${where} ${error.message} (${(error.params.allowedValues ?? []).join(" | ")})`;
    }
    if (error.keyword === "pattern") {
        return `${where} ${error.message} (pattern: ${error.params.pattern})`;
    }
    return `${where} ${error.message}`;
}
