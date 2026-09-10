import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Materialize fixture entries like `/app/foo/package.json` under a real temp directory.
 * The first path segment (`/app`, `/product`, …) is stripped; `root` replaces it.
 */
export function writeFixtureTree(
  root: string,
  files: Record<string, string>,
  stripPrefix: string,
): void {
  const prefix = stripPrefix.endsWith("/") ? stripPrefix : `${stripPrefix}/`;
  for (const [key, content] of Object.entries(files)) {
    if (!key.startsWith(prefix)) {
      throw new Error(`Expected fixture key "${key}" to start with "${prefix}"`);
    }
    const rel = key.slice(prefix.length);
    const filePath = join(root, rel);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
}

export function createFixtureRoot(name: string): string {
  const slug = name.replace(/[^\w-]+/g, "-");
  return mkdtempSync(join(tmpdir(), `saf-${slug}-`));
}

export function removeFixtureRoot(root: string): void {
  rmSync(root, { recursive: true, force: true });
}
