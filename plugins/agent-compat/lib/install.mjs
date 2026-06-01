import fs from "node:fs";
import path from "node:path";

export const START_MARKER = "<!-- agent-compat:start -->";
export const END_MARKER = "<!-- agent-compat:end -->";

export function managedSection(content) {
    return `${START_MARKER}\n${content.trimEnd()}\n${END_MARKER}\n`;
}

export function upsertManagedSection(existing, content) {
    const nextSection = managedSection(content);
    const start = existing.indexOf(START_MARKER);
    const end = existing.indexOf(END_MARKER);

    if (start === -1 && end === -1) {
        const prefix = existing.trimEnd();
        return prefix ? `${prefix}\n\n${nextSection}` : nextSection;
    }

    if (start === -1 || end === -1 || end < start) {
        throw new Error("managed marker section is malformed");
    }

    const afterEnd = end + END_MARKER.length;
    const before = existing.slice(0, start);
    const after = existing.slice(afterEnd).replace(/^\n?/, "");
    return `${before}${nextSection}${after}`;
}

export function writeFileEnsuringDir(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
}

export function installManagedSection(filePath, content) {
    const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
    const next = upsertManagedSection(existing, content);
    writeFileEnsuringDir(filePath, next);
    return { filePath, changed: existing !== next };
}
