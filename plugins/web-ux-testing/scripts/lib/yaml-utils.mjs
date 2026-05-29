import fs from "node:fs";
import YAML from "yaml";

export function readYamlFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return YAML.parse(raw);
}

export function toSafeFileName(value) {
  const safe = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safe || "unnamed";
}

export function walk(value, visitor, currentPath = []) {
  visitor(value, currentPath);

  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, [...currentPath, index]));
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => {
      walk(child, visitor, [...currentPath, key]);
    });
  }
}