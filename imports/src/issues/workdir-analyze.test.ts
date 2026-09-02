import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeWorkdirPackage } from "./workdir-analyze.ts";

describe("analyzeWorkdirPackage", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags exports with no non-test importers and clears used ones", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "workdir-analyze-"));
    tmpDirs.push(root);

    const pkgDir = path.join(root, "pkg");
    const srcDir = path.join(pkgDir, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "@test/pkg" }),
    );
    writeFileSync(
      path.join(srcDir, "dead.ts"),
      "export function unusedOnly() { return 1; }\n",
    );
    writeFileSync(
      path.join(srcDir, "live.ts"),
      "export function usedFn() { return 2; }\n",
    );
    writeFileSync(
      path.join(srcDir, "caller.ts"),
      'import { usedFn } from "./live.ts";\nusedFn();\n',
    );
    writeFileSync(
      path.join(srcDir, "live.test.ts"),
      'import { unusedOnly } from "./dead.ts";\nit("x", () => { unusedOnly(); });\n',
    );
    writeFileSync(
      path.join(pkgDir, "root-helper.ts"),
      "export function rootHelper() { return 0; }\n",
    );

    const result = await analyzeWorkdirPackage({
      monorepoRoot: root,
      packageName: "@test/pkg",
    });

    expect(result).not.toBeNull();
    expect(result!.issues.map((i) => `${i.kind}:${i.name}`).sort()).toEqual([
      "dead-code:rootHelper",
      "dead-code:unusedOnly",
      "package-layout:root-helper.ts at package root (move into a thematic folder)",
    ]);
    expect(result!.issues.map((i) => i.name)).not.toContain("usedFn");
    expect(result!.issues.some((i) => i.kind === "package-layout")).toBe(true);
  });

  it("skips scaffold template exports", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "workdir-analyze-"));
    tmpDirs.push(root);

    const pkgDir = path.join(root, "emails");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "@test/email" }),
    );
    writeFileSync(
      path.join(pkgDir, "__target-name__.ts"),
      "export function __targetName__() { return {}; }\n",
    );

    const result = await analyzeWorkdirPackage({
      monorepoRoot: root,
      packageName: "@test/email",
    });

    expect(result!.issues.some((i) => i.name === "__targetName__")).toBe(false);
  });
});
