import YAML from "yaml";

export class FrontmatterError extends Error {
    constructor(message) {
        super(message);
        this.name = "FrontmatterError";
    }
}

export function parseAgentMarkdown(raw, filePath) {
    if (!raw.startsWith("---\n")) {
        throw new FrontmatterError(`${filePath}: missing YAML frontmatter`);
    }

    const end = raw.indexOf("\n---", 4);
    if (end === -1) {
        throw new FrontmatterError(`${filePath}: unterminated YAML frontmatter`);
    }

    const frontmatterRaw = raw.slice(4, end);
    const bodyStart = raw.indexOf("\n", end + 4);
    const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1).trim();

    let frontmatter;
    try {
        frontmatter = YAML.parse(frontmatterRaw) ?? {};
    } catch (err) {
        throw new FrontmatterError(`${filePath}: invalid YAML frontmatter: ${err.message}`);
    }

    if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
        throw new FrontmatterError(`${filePath}: YAML frontmatter must be an object`);
    }

    return { frontmatter, body };
}
