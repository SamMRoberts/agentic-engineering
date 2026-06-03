import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(pluginRoot, "..", "..");
const hooksPath = join(pluginRoot, "hooks.json");

test("canonical hook commands resolve from the repository root", () => {
    const hooksConfig = JSON.parse(readFileSync(hooksPath, "utf8"));
    const commands = hookCommands(hooksConfig);

    assert.ok(commands.length > 0, "expected hooks.json to define hook commands");

    for (const command of commands) {
        assert.doesNotMatch(command, /^node scripts\//, `${command} should not rely on plugin cwd`);
        assert.match(command, /^node plugins\/vibe-sentinelscripts\//, `${command} should use a repo-root-safe plugin path`);

        const [, scriptPath] = command.split(/\s+/, 3);
        assert.ok(existsSync(join(repoRoot, scriptPath)), `${scriptPath} should exist from the repository root`);
    }
});

function hookCommands(hooksConfig) {
    const hooks = hooksConfig.hooks ?? {};
    return Object.values(hooks)
        .flat()
        .map((hook) => hook.command)
        .filter((command) => typeof command === "string");
}
