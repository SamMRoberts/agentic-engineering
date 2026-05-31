// Entry point for the web-ux-testing-agent MCP server.
//   tsx main.ts --stdio   -> stdio transport (for Claude/Codex/Copilot MCP config)
//   tsx main.ts           -> HTTP (streamable) transport on PORT (default 8971)
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { createServer } from "./src/server.js";

async function main(): Promise<void> {
  const useStdio = process.argv.includes("--stdio");
  const server = createServer();

  if (useStdio) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "4mb" }));

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  app.post("/mcp", (req, res) => transport.handleRequest(req, res, req.body));
  app.get("/mcp", (req, res) => transport.handleRequest(req, res));
  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  const port = Number(process.env.PORT ?? 8971);
  app.listen(port, () => {
    process.stderr.write(`web-ux-testing-agent MCP server listening on http://localhost:${port}/mcp\n`);
  });
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${String(err)}\n`);
  process.exit(1);
});
