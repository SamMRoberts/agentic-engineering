import fs from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage", "reports", ".next"]);
const ROUTE_DIR_NAMES = new Set(["app", "pages", "routes"]);
const TEST_FILE_PATTERN = /(?:^|\/)(?:tests?|e2e|specs?)\/.*\.(?:spec|test)\.[cm]?[jt]sx?$/;

export interface SurfaceInventory {
    workspaceRoot: string;
    packageScripts: Record<string, string>;
    packageManagers: string[];
    playwrightConfigs: string[];
    existingTests: string[];
    routeFiles: string[];
    frontendSourceFiles: string[];
    warnings: string[];
}

async function walk(root: string, current: string, results: string[], maxFiles: number): Promise<void> {
    if (results.length >= maxFiles) return;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }> = [];
    try {
        entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        if (results.length >= maxFiles) return;
        if (entry.isDirectory()) {
            if (IGNORED_DIRS.has(entry.name)) continue;
            await walk(root, path.join(current, entry.name), results, maxFiles);
        } else if (entry.isFile()) {
            results.push(path.relative(root, path.join(current, entry.name)));
        }
    }
}

function isFrontendSource(file: string): boolean {
    return /\.(?:[cm]?[jt]sx?|vue|svelte)$/.test(file)
        && /(?:^|\/)(?:src|app|pages|routes|components)\//.test(file);
}

function isRouteFile(file: string): boolean {
    const parts = file.split(path.sep);
    return parts.some((part) => ROUTE_DIR_NAMES.has(part))
        && /\.(?:[cm]?[jt]sx?|vue|svelte)$/.test(file)
        && !/(?:^|\/)(?:components|test|tests)\//.test(file);
}

async function readPackageScripts(root: string): Promise<Record<string, string>> {
    try {
        const parsed = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf-8")) as {
            scripts?: Record<string, string>;
        };
        return parsed.scripts ?? {};
    } catch {
        return {};
    }
}

export async function scanSurfaceInventory(workspaceRoot: string, maxFiles = 1000): Promise<SurfaceInventory> {
    const root = path.resolve(workspaceRoot);
    const files: string[] = [];
    await walk(root, root, files, maxFiles);

    const packageManagers = files.filter((file) => ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"].includes(file));
    const playwrightConfigs = files.filter((file) => /^playwright\.config\.[cm]?[jt]s$/.test(file));
    const existingTests = files.filter((file) => TEST_FILE_PATTERN.test(file));
    const routeFiles = files.filter(isRouteFile).slice(0, 100);
    const frontendSourceFiles = files.filter(isFrontendSource).slice(0, 200);
    const warnings = files.length >= maxFiles ? [`Scan stopped after ${maxFiles} files; inventory may be partial.`] : [];

    return {
        workspaceRoot: root,
        packageScripts: await readPackageScripts(root),
        packageManagers,
        playwrightConfigs,
        existingTests,
        routeFiles,
        frontendSourceFiles,
        warnings
    };
}
