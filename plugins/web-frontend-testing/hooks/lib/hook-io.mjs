// Helpers shared by hook scripts.
// Each hook reads a JSON payload on stdin and emits a JSON decision on stdout.
// Field naming varies by host; helpers below try several common shapes.

export async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
}

export function parsePayload(raw) {
    if (!raw || !raw.trim()) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

export function getToolName(payload) {
    return (
        payload?.tool_name
        ?? payload?.toolName
        ?? payload?.tool?.name
        ?? ""
    );
}

export function getToolInput(payload) {
    return (
        payload?.tool_input
        ?? payload?.toolInput
        ?? payload?.tool?.input
        ?? payload?.input
        ?? {}
    );
}

export function emit(decision) {
    process.stdout.write(JSON.stringify(decision));
}

export function allow() {
    emit({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "allow"
        }
    });
}

export function ask(reason) {
    emit({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: reason
        }
    });
}

export function deny(reason) {
    emit({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason
        }
    });
}

export function collectStringScalars(value, out = []) {
    if (typeof value === "string") {
        out.push(value);
        return out;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectStringScalars(item, out);
        return out;
    }
    if (value && typeof value === "object") {
        for (const v of Object.values(value)) collectStringScalars(v, out);
    }
    return out;
}

const PATH_LIKE_KEYS = ["filePath", "file_path", "path", "uri", "target", "filename"];

export function getCandidatePaths(toolInput) {
    const paths = new Set();
    if (!toolInput || typeof toolInput !== "object") return [];
    const stack = [toolInput];
    while (stack.length) {
        const cur = stack.pop();
        if (cur == null || typeof cur !== "object") continue;
        if (Array.isArray(cur)) {
            for (const v of cur) stack.push(v);
            continue;
        }
        for (const [key, value] of Object.entries(cur)) {
            if (typeof value === "string" && PATH_LIKE_KEYS.includes(key)) {
                paths.add(value);
            } else if (value && typeof value === "object") {
                stack.push(value);
            }
        }
    }
    return [...paths];
}
