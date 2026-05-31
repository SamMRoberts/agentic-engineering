// Collect Playwright artifacts (trace, video, screenshots) from a results
// directory and return paths relative to a report directory.
import fs from "node:fs";
import path from "node:path";

export interface CollectedArtifacts {
  trace?: string;
  video?: string;
  screenshots: string[];
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

export function collectArtifacts(resultsDir: string, reportDir: string): CollectedArtifacts {
  const artifacts: CollectedArtifacts = { screenshots: [] };
  for (const file of walk(resultsDir)) {
    const rel = path.relative(reportDir, file);
    if (file.endsWith(".zip") || file.includes("trace")) artifacts.trace = rel;
    else if (file.endsWith(".webm") || file.endsWith(".mp4")) artifacts.video = rel;
    else if (file.endsWith(".png") || file.endsWith(".jpeg")) artifacts.screenshots.push(rel);
  }
  return artifacts;
}
