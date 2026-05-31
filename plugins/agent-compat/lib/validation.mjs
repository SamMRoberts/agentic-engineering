const CREDENTIAL_PATTERNS = [
    /\b(?:api[_-]?key|token|secret|password|passwd|private[_-]?key)\b\s*[:=]\s*['"]?[A-Za-z0-9_\-./+=]{12,}/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bghp_[A-Za-z0-9_]{20,}\b/,
    /\bsk-[A-Za-z0-9]{20,}\b/
];

const HOST_SPECIFIC_TOOL_PATTERNS = [
    /^vscode\//,
    /^github\.vscode-/,
    /^execute\//,
    /^run_vscode_command$/,
    /^fix-customization-evaluation-diagnostics$/
];

function hasCredentialShape(agent) {
    const searchable = [
        JSON.stringify(agent.frontmatter),
        agent.body
    ].join("\n");
    return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(searchable));
}

function agentLabel(agent) {
    return `${agent.name ?? "(missing name)"} (${agent.relativePath})`;
}

export function validateAgents(agents) {
    const errors = [];
    const warnings = [];
    const byName = new Map();

    for (const agent of agents) {
        if (!agent.name || typeof agent.name !== "string") {
            errors.push(`${agent.relativePath}: frontmatter.name is required`);
            continue;
        }

        if (byName.has(agent.name)) {
            errors.push(`duplicate agent name "${agent.name}": ${byName.get(agent.name).relativePath} and ${agent.relativePath}`);
        } else {
            byName.set(agent.name, agent);
        }

        if (!agent.description || typeof agent.description !== "string") {
            errors.push(`${agent.relativePath}: frontmatter.description is required`);
        }

        if (hasCredentialShape(agent)) {
            errors.push(`${agent.relativePath}: contains credential-shaped literal content`);
        }

        if (agent.model) {
            warnings.push(`${agentLabel(agent)} uses model "${agent.model}", which Codex/Claude overlays can only document, not enforce`);
        }

        if (agent.target) {
            warnings.push(`${agentLabel(agent)} targets "${agent.target}", which is host-specific compatibility metadata`);
        }

        if (agent.disableModelInvocation !== undefined) {
            warnings.push(`${agentLabel(agent)} uses disable-model-invocation, which Codex/Claude overlays can only document`);
        }

        for (const tool of agent.tools) {
            if (HOST_SPECIFIC_TOOL_PATTERNS.some((pattern) => pattern.test(tool))) {
                warnings.push(`${agentLabel(agent)} references host-specific tool "${tool}"`);
            }
        }

        for (const handoff of agent.handoffs) {
            if (handoff && typeof handoff === "object") {
                warnings.push(`${agentLabel(agent)} defines Copilot handoff "${handoff.label ?? "(unlabeled)"}", which will be rendered as guidance only`);
            }
        }
    }

    for (const agent of agents) {
        for (const referencedAgent of agent.agents) {
            if (!byName.has(referencedAgent)) {
                if (agent.kind === "plugin") {
                    errors.push(`${agent.relativePath}: references missing agent "${referencedAgent}"`);
                } else {
                    warnings.push(`${agentLabel(agent)} references external or unavailable agent "${referencedAgent}"`);
                }
            }
        }

        if (agent.kind === "plugin" && agent.manifest) {
            const privateAgents = Array.isArray(agent.manifest.privateAgents) ? agent.manifest.privateAgents : [];
            const entrypoint = agent.manifest.entrypointAgent;
            if (entrypoint === agent.name) {
                for (const privateAgent of privateAgents) {
                    if (!byName.has(privateAgent)) {
                        errors.push(`${agent.relativePath}: plugin manifest references missing private agent "${privateAgent}"`);
                    }
                }
            }
        }
    }

    return { ok: errors.length === 0, errors, warnings };
}
