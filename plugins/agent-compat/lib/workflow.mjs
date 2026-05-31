import path from "node:path";

import { discoverAgents } from "./discovery.mjs";
import { installManagedSection, writeFileEnsuringDir } from "./install.mjs";
import { renderOverlay, targetsFor } from "./render.mjs";
import { validateAgents } from "./validation.mjs";

const OUTPUTS = {
    codex: ["codex", "AGENTS.md"],
    claude: ["claude", "custom-instructions.md"]
};

export function scan({ root }) {
    return discoverAgents({ root });
}

export function validate({ root }) {
    const agents = scan({ root });
    const validation = validateAgents(agents);
    return { agents, validation };
}

export function generate({ root, target = "all", outDir }) {
    const resolvedRoot = path.resolve(root);
    const agents = scan({ root: resolvedRoot });
    const validation = validateAgents(agents);
    if (!validation.ok) {
        return { ok: false, agents, validation, outputs: [] };
    }

    const baseOut = path.resolve(outDir ?? path.join(resolvedRoot, ".agent-compat"));
    const outputs = [];
    for (const selectedTarget of targetsFor(target)) {
        const content = renderOverlay({ target: selectedTarget, agents, validation });
        const outputPath = path.join(baseOut, ...OUTPUTS[selectedTarget]);
        writeFileEnsuringDir(outputPath, content);
        outputs.push({ target: selectedTarget, filePath: outputPath, content });
    }

    return { ok: true, agents, validation, outputs };
}

export function install({ root, target = "all", codexFile = "AGENTS.md", claudeFile = "custom-instructions.md" }) {
    const resolvedRoot = path.resolve(root);
    const agents = scan({ root: resolvedRoot });
    const validation = validateAgents(agents);
    if (!validation.ok) {
        return { ok: false, agents, validation, outputs: [] };
    }

    const outputs = [];
    for (const selectedTarget of targetsFor(target)) {
        const content = renderOverlay({ target: selectedTarget, agents, validation });
        const fileName = selectedTarget === "codex" ? codexFile : claudeFile;
        const filePath = path.resolve(resolvedRoot, fileName);
        const result = installManagedSection(filePath, content);
        outputs.push({ target: selectedTarget, ...result });
    }

    return { ok: true, agents, validation, outputs };
}
