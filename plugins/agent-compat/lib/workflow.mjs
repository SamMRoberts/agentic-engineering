import path from "node:path";

import { discoverAgents } from "./discovery.mjs";
import { installManagedSection, writeFileEnsuringDir } from "./install.mjs";
import { referencePathForAgent, renderHostStub, renderReferenceFile, targetsFor } from "./render.mjs";
import { validateAgents } from "./validation.mjs";

const OUTPUTS = {
    codex: ["codex", "AGENTS.md"],
    claude: ["claude", "custom-instructions.md"]
};

function buildTargetArtifacts({ target, agents, validation, baseOut }) {
    const targetRoot = path.join(baseOut, target);
    const references = agents.map((agent) => {
        const relativeParts = referencePathForAgent(agent);
        const relativePath = relativeParts.join("/");
        const filePath = path.join(targetRoot, ...relativeParts);
        const content = renderReferenceFile({ target, agent, outputPath: filePath });
        return { target, agent, relativePath, filePath, content };
    });

    const stubPath = path.join(baseOut, ...OUTPUTS[target]);
    const stub = {
        target,
        filePath: stubPath,
        content: renderHostStub({
            target,
            agents,
            validation,
            referenceEntries: references,
            outputPath: stubPath
        })
    };

    return { stub, references };
}

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
        const artifacts = buildTargetArtifacts({ target: selectedTarget, agents, validation, baseOut });
        writeFileEnsuringDir(artifacts.stub.filePath, artifacts.stub.content);
        for (const reference of artifacts.references) {
            writeFileEnsuringDir(reference.filePath, reference.content);
        }
        outputs.push({ ...artifacts.stub, references: artifacts.references });
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
    const baseOut = path.join(resolvedRoot, ".agent-compat");
    for (const selectedTarget of targetsFor(target)) {
        const artifacts = buildTargetArtifacts({ target: selectedTarget, agents, validation, baseOut });
        for (const reference of artifacts.references) {
            writeFileEnsuringDir(reference.filePath, reference.content);
        }
        const fileName = selectedTarget === "codex" ? codexFile : claudeFile;
        const filePath = path.resolve(resolvedRoot, fileName);
        const result = installManagedSection(filePath, artifacts.stub.content);
        outputs.push({ target: selectedTarget, ...result, references: artifacts.references });
    }

    return { ok: true, agents, validation, outputs };
}
