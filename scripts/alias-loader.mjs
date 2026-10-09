import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = path.join(root, "src", specifier.slice(2));
    const candidates = [
      base,
      base + ".ts",
      base + ".tsx",
      path.join(base, "index.ts"),
    ];
    const found = candidates.find(
      (c) => fs.existsSync(c) && fs.statSync(c).isFile()
    );
    if (found) return next(pathToFileURL(found).href, context);
  }
  return next(specifier, context);
}
