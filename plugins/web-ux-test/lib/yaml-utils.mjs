import fs from "node:fs";
import YAML from "yaml";

export function readYamlFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    return YAML.parse(raw);
}

export function parseYaml(raw) {
    return YAML.parse(raw);
}

export function stringifyYaml(value) {
    return YAML.stringify(value, { lineWidth: 0 });
}

export function walk(value, visitor, currentPath = []) {
    visitor(value, currentPath);

    if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, visitor, [...currentPath, index]));
        return;
    }

    if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
            walk(child, visitor, [...currentPath, key]);
        }
    }
}
