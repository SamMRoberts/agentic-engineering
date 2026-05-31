import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { readYamlFile } from "./yaml-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const pluginRoot = path.resolve(__dirname, "..");
export const schemasDir = path.join(pluginRoot, "schemas");

const schemaCache = new Map();
const ajvCache = new Map();

function createAjv() {
    const ajv = new Ajv2020({
        allErrors: true,
        strict: false
    });
    addFormats(ajv);
    return ajv;
}

export function schemaPath(schemaFileName) {
    return path.join(schemasDir, schemaFileName);
}

export function loadSchema(schemaFileName) {
    if (!schemaCache.has(schemaFileName)) {
        schemaCache.set(schemaFileName, readYamlFile(schemaPath(schemaFileName)));
    }
    return schemaCache.get(schemaFileName);
}

export function compileSchema(schemaFileName) {
    if (!ajvCache.has(schemaFileName)) {
        const ajv = createAjv();
        const schema = loadSchema(schemaFileName);
        ajvCache.set(schemaFileName, ajv.compile(schema));
    }
    return ajvCache.get(schemaFileName);
}

export function validateAgainstSchema(value, schemaFileName) {
    const validate = compileSchema(schemaFileName);
    const valid = validate(value);
    if (valid) return [];
    return (validate.errors ?? []).map(formatAjvError);
}

function formatAjvError(error) {
    const pathLabel = error.instancePath || "/";
    if (error.keyword === "required") {
        return `${pathLabel} must include required property "${error.params.missingProperty}"`;
    }
    if (error.keyword === "additionalProperties") {
        return `${pathLabel} must not include additional property "${error.params.additionalProperty}"`;
    }
    if (error.keyword === "enum") {
        return `${pathLabel} ${error.message} (${(error.params.allowedValues ?? []).join(", ")})`;
    }
    return `${pathLabel} ${error.message}`;
}

export function clearSchemaCaches() {
    schemaCache.clear();
    ajvCache.clear();
}
