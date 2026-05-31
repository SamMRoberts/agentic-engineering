// Shared context + filesystem helpers for the MCP tools. All directories are
// resolved relative to a configurable workspace root; defaults keep plans and
// reports inside the consuming repository, never outside it.
import fs from "node:fs/promises";
import path from "node:path";

export interface ServerContext {
  /** Directory that holds *.plan.yaml / *.plan.json files. */
  plansDir: string;
  /** Directory that holds per-run report folders (report.json + report.md). */
  reportsDir: string;
  /** Absolute workspace root used to reject path traversal. */
  workspaceRoot: string;
}

export function createContext(env = process.env): ServerContext {
  const workspaceRoot = path.resolve(env.WEB_UX_WORKSPACE ?? process.cwd());
  return {
    workspaceRoot,
    plansDir: path.resolve(workspaceRoot, env.WEB_UX_PLANS_DIR ?? "web-ux/plans"),
    reportsDir: path.resolve(workspaceRoot, env.WEB_UX_REPORTS_DIR ?? "reports/web-ux")
  };
}

/** Resolve a user-supplied path and ensure it stays inside the workspace root. */
export function safeResolve(ctx: ServerContext, p: string): string {
  const resolved = path.resolve(ctx.workspaceRoot, p);
  const rel = path.relative(ctx.workspaceRoot, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace root: ${p}`);
  }
  return resolved;
}

export async function readText(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function pathExists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

export async function listFiles(dir: string, exts: string[]): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && exts.some((x) => e.name.endsWith(x)))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}
