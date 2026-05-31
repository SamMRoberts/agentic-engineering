/**
 * web-ux-test-workflow MCP server entrypoint.
 * Stdio transport only in MVP (HTTP can be added later).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.ts";

async function main(): Promise<void> {
    if (!process.argv.includes("--stdio")) {
        process.stderr.write("ERROR: only --stdio transport is supported in MVP. Run with: tsx src/main.ts --stdio\n");
        process.exit(2);
    }
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`ERROR: ${msg}\n`);
    process.exit(1);
});
