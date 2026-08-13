import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectWorkdirPackageIssues } from "./workdir-package-issues.ts";

describe("collectWorkdirPackageIssues", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags exports with no non-test importers and clears used ones", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "workdir-issues-"));
    tmpDirs.push(root);

    const pkgDir = path.join(root, "pkg");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "@test/pkg" }),
    );
    writeFileSync(
      path.join(pkgDir, "dead.ts"),
      "export function unusedOnly() { return 1; }\n",
    );
    writeFileSync(
      path.join(pkgDir, "live.ts"),
      "export function usedFn() { return 2; }\n",
    );
    writeFileSync(
      path.join(pkgDir, "caller.ts"),
      'import { usedFn } from "./live.ts";\nusedFn();\n',
    );
    writeFileSync(
      path.join(pkgDir, "live.test.ts"),
      'import { unusedOnly } from "./dead.ts";\nit("x", () => { unusedOnly(); });\n',
    );

    const result = await collectWorkdirPackageIssues({
      repoRoot: root,
      packageName: "@test/pkg",
    });

    expect(result.issues.map((i) => i.name).sort()).toEqual(["unusedOnly"]);
    expect(result.issues.map((i) => i.name)).not.toContain("usedFn");
  });
});
