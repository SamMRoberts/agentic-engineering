import fs from "node:fs";
import path from "node:path";

import { parseAgentMarkdown } from "./frontmatter.mjs";

const IGNORED_DIRS = new Set([".git", "node_modules", ".agent-compat"]);

function listDirSafe(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }
}

function findAgentFiles(dir, files = []) {
    for (const entry of listDirSafe(dir)) {
        if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name)) {
                findAgentFiles(path.join(dir, entry.name), files);
            }
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".agent.md")) {
            files.push(path.join(dir, entry.name));
        }
    }
    return files;
}

function detectKind(root, filePath) {
    const relativePath = path.relative(root, filePath).split(path.sep).join("/");
    const pluginMatch = relativePath.match(/^plugins\/([^/]+)\/agents\/([^/]+)\.agent\.md$/);
    if (pluginMatch) {
        return {
            kind: "plugin",
            pluginName: pluginMatch[1],
            topic: null,
            relativePath
        };
    }

    const standaloneMatch = relativePath.match(/^agents\/(.+)\/([^/]+)\.agent\.md$/);
    if (standaloneMatch) {
        return {
            kind: "standalone",
            pluginName: null,
            topic: standaloneMatch[1].split("/")[0],
            relativePath
        };
    }

    return {
        kind: "other",
        pluginName: null,
        topic: null,
        relativePath
    };
}

function readPluginManifest(root, pluginName) {
    if (!pluginName) return null;
    const manifestPath = path.join(root, "plugins", pluginName, "plugin.json");
    if (!fs.existsSync(manifestPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
        return null;
    }
}

export function discoverAgents({ root }) {
    const resolvedRoot = path.resolve(root);
    const agentFiles = findAgentFiles(resolvedRoot)
        .filter((filePath) => {
            const rel = path.relative(resolvedRoot, filePath).split(path.sep).join("/");
            return rel.startsWith("agents/") || /^plugins\/[^/]+\/agents\//.test(rel);
        })
        .sort((a, b) => a.localeCompare(b));

    const manifests = new Map();
    return agentFiles.map((filePath) => {
        const raw = fs.readFileSync(filePath, "utf8");
        const { frontmatter, body } = parseAgentMarkdown(raw, filePath);
        const context = detectKind(resolvedRoot, filePath);
        const manifest = context.pluginName
            ? manifests.get(context.pluginName) ?? readPluginManifest(resolvedRoot, context.pluginName)
            : null;
        if (context.pluginName && !manifests.has(context.pluginName)) {
            manifests.set(context.pluginName, manifest);
        }

        return {
            filePath,
            relativePath: context.relativePath,
            kind: context.kind,
            pluginName: context.pluginName,
            topic: context.topic,
            manifest,
            name: frontmatter.name,
            description: frontmatter.description,
            argumentHint: frontmatter["argument-hint"],
            tools: Array.isArray(frontmatter.tools) ? frontmatter.tools : [],
            agents: Array.isArray(frontmatter.agents) ? frontmatter.agents : [],
            handoffs: Array.isArray(frontmatter.handoffs) ? frontmatter.handoffs : [],
            userInvocable: frontmatter["user-invocable"],
            model: frontmatter.model,
            target: frontmatter.target,
            disableModelInvocation: frontmatter["disable-model-invocation"],
            frontmatter,
            body
        };
    });
}
