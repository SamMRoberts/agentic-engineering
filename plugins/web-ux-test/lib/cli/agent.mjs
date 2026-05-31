/**
 * `web-ux-test agent ...` — Copilot CLI adapter stubs.
 *
 * MVP: these commands document the contract but do not invoke any external
 * tooling. They exit 0 with a clear "not implemented" message and a pointer
 * to docs/copilot-cli-adapter.md.
 */

const NOT_IMPLEMENTED_MESSAGE = `[web-ux-test] The Copilot CLI adapter is a documented stub in the MVP release.

The contract for adapter output (status, summary, assumptions, risks, files, nextRequiredGate)
is defined in docs/copilot-cli-adapter.md. A future release will implement these subcommands.

In the meantime:
- Use \`web-ux-test plan validate\` to enforce plan correctness.
- Use \`web-ux-test failure classify\` and \`web-ux-test repair propose\` to drive the repair loop manually.`;

export function runAgentStub(subcommand) {
    return {
        ok: true,
        subcommand,
        notImplemented: true,
        message: NOT_IMPLEMENTED_MESSAGE,
        docs: "docs/copilot-cli-adapter.md"
    };
}
