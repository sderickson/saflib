import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkPackageLayout } from "./package-layout.ts";

function withTempPkg(files: Record<string, string>, fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-layout-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(dir, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("checkPackageLayout", () => {
  it("flags bin outside ./bin/", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({
          name: "@t/p",
          bin: { "my-cli": "./generate.ts" },
          scripts: {},
        }),
        "generate.ts": "export {};\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        expect(issues.some((i) => i.kind === "package-layout")).toBe(true);
      },
    );
  });

  it("flags saf-ts-run not targeting scripts/", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({
          name: "@t/p",
          scripts: { gen: "saf-ts-run ./generate.ts" },
        }),
        "generate.ts": "export {};\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        expect(
          issues.some((i) => i.name.includes("saf-ts-run must target")),
        ).toBe(true);
      },
    );
  });

  it("flags oversized files", () => {
    const body = Array.from({ length: 501 }, (_, i) => `// ${i}`).join("\n");
    withTempPkg(
      {
        "package.json": JSON.stringify({ name: "@t/p", scripts: {} }),
        "big.ts": body + "\n",
      },
      (dir) => {
        const issues = checkPackageLayout({
          packageDir: dir,
          maxSourceLines: 500,
        });
        expect(issues.some((i) => i.kind === "oversized-file")).toBe(true);
      },
    );
  });
});
