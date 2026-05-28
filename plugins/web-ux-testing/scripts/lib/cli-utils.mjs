import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export function arg(name, fallback, options = {}) {
  const argv = options.argv ?? process.argv;
  const equalsPrefix = `--${name}=`;
  const equalsMatch = argv.find((item) => item.startsWith(equalsPrefix));

  if (equalsMatch) {
    return equalsMatch.slice(equalsPrefix.length);
  }

  const flagIndex = argv.indexOf(`--${name}`);
  if (flagIndex >= 0 && argv[flagIndex + 1] && !argv[flagIndex + 1].startsWith("--")) {
    return argv[flagIndex + 1];
  }

  if (typeof options.positionalIndex === "number" && argv[options.positionalIndex]) {
    return argv[options.positionalIndex];
  }

  return fallback;
}

export function isCliEntry(importMetaUrl, options = {}) {
  const argv = options.argv ?? process.argv;
  return Boolean(argv[1] && path.resolve(argv[1]) === fileURLToPath(importMetaUrl));
}
