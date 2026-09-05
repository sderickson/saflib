import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupDeclarationArtifacts } from "./cleanup-declarations.ts";

describe("cleanupDeclarationArtifacts", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  function makeTempTree(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saf-cleanup-decl-"));
    tempDirs.push(dir);
    return dir;
  }

  it("removes co-located maps and declarations but keeps allowlisted and dist/types", () => {
    const root = makeTempTree();
    fs.mkdirSync(path.join(root, "pkg"), { recursive: true });
    fs.mkdirSync(path.join(root, "pkg", "dist", "types"), { recursive: true });

    const staleMap = path.join(root, "pkg", "index.d.ts.map");
    const staleDts = path.join(root, "pkg", "index.d.ts");
    const allowed = path.join(root, "pkg", "env.d.ts");
    const distDts = path.join(root, "pkg", "dist", "types", "index.d.ts");
    const distMap = path.join(root, "pkg", "dist", "types", "index.d.ts.map");

    for (const file of [staleMap, staleDts, allowed, distDts, distMap]) {
      fs.writeFileSync(file, "{}", "utf8");
    }

    const result = cleanupDeclarationArtifacts({ root });

    expect(result.removed).toEqual(
      expect.arrayContaining([staleMap, staleDts]),
    );
    expect(fs.existsSync(staleMap)).toBe(false);
    expect(fs.existsSync(staleDts)).toBe(false);
    expect(fs.existsSync(allowed)).toBe(true);
    expect(fs.existsSync(distDts)).toBe(true);
    expect(fs.existsSync(distMap)).toBe(true);
  });

  it("supports dry run", () => {
    const root = makeTempTree();
    const staleMap = path.join(root, "foo.d.ts.map");
    fs.writeFileSync(staleMap, "{}", "utf8");

    const result = cleanupDeclarationArtifacts({ root, dryRun: true });

    expect(result.removed).toEqual([staleMap]);
    expect(fs.existsSync(staleMap)).toBe(true);
  });
});
