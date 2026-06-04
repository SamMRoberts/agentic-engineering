import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hooksPath = join(pluginRoot, "hooks.json");

test("canonical hook commands use plugin-root-relative node invocations", () => {
    const hooksConfig = JSON.parse(readFileSync(hooksPath, "utf8"));
    const commands = hookCommands(hooksConfig);

    assert.ok(commands.length > 0, "expected hooks.json to define hook commands");

    for (const command of commands) {
        assert.match(
            command,
            /^node \.\/bin\/vibe-sentinel\.mjs /,
            `${command} should use node ./bin/vibe-sentinel.mjs (plugin-root-relative)`
        );

        // Extract the script path and verify it exists relative to the plugin root
        const parts = command.split(/\s+/);
        const scriptPath = parts[1]; // ./bin/vibe-sentinel.mjs
        const absoluteScriptPath = resolve(pluginRoot, scriptPath);
        assert.ok(
            existsSync(absoluteScriptPath),
            `${scriptPath} should exist relative to plugin root (resolved: ${absoluteScriptPath})`
        );

        // Verify subcommand is valid
        const subcommand = parts[2];
        assert.ok(
            ["assumption-gate", "change-control", "scope-guard"].includes(subcommand),
            `${subcommand} should be a valid script name`
        );
    }
});

test("hook commands use forward slashes for cross-platform compatibility", () => {
    const hooksConfig = JSON.parse(readFileSync(hooksPath, "utf8"));
    const commands = hookCommands(hooksConfig);

    for (const command of commands) {
        assert.doesNotMatch(
            command,
            /\\/,
            `${command} must not contain backslashes (use forward slashes for cross-platform paths)`
        );
    }
});

test("hook commands do not use environment variables or absolute paths", () => {
    const hooksConfig = JSON.parse(readFileSync(hooksPath, "utf8"));
    const commands = hookCommands(hooksConfig);

    for (const command of commands) {
        assert.doesNotMatch(command, /\$HOME|\$\{HOME\}|%USERPROFILE%/, `${command} must not reference HOME`);
        assert.doesNotMatch(command, /^node \/|^node [A-Z]:/, `${command} must not use an absolute path`);
    }
});

function hookCommands(hooksConfig) {
    const hooks = hooksConfig.hooks ?? {};
    return Object.values(hooks)
        .flat()
        .map((hook) => hook.command)
        .filter((command) => typeof command === "string");
}
