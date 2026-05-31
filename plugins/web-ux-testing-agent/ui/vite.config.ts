import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local fallback web UI. Talks to an optional backend that exposes the same
// data operations as the MCP tools at /api (see docs/mcp-app.md). When no
// backend is present the app runs against in-browser sample data.
export default defineConfig({
  plugins: [react()],
  server: { port: 5273 }
});
