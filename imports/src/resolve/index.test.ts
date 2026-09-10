import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildPackageIndex } from "./index.ts";

describe("buildPackageIndex", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores package.json files under .saf-docker staging", () => {
    const root = mkdtempSync(path.join(tmpdir(), "build-package-index-"));
    tmpDirs.push(root);

    writeProductTree(root, {
      "package.json": { name: "@product/root", workspaces: ["packages/*"] },
      "packages/a/package.json": { name: "@product/a" },
      ".saf-docker/stage/foo/package.json": {
        name: "@product/root",
        overrides: { vite: "9.9.9" },
      },
    });

    const index = buildPackageIndex(root);
    expect(index.get("@product/root")?.dir).toBe(root);
    expect(index.size).toBe(2);
  });
});

function writeProductTree(
  root: string,
  files: Record<string, Record<string, unknown>>,
): void {
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(contents, null, 2) + "\n");
  }
}
