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
        "src/generate.ts": "export {};\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        expect(issues.some((i) => i.kind === "package-layout")).toBe(true);
      },
    );
  });

  it("allows saf-ts-run targeting ./bin/", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({
          name: "@t/p",
          scripts: { gen: "saf-ts-run ./bin/generate.ts" },
        }),
        "bin/generate.ts": "export {};\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        expect(
          issues.some((i) => i.name.includes("saf-ts-run must target")),
        ).toBe(false);
      },
    );
  });

  it("flags saf-ts-run not targeting scripts/ or bin/", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({
          name: "@t/p",
          scripts: { gen: "saf-ts-run ./src/generate.ts" },
        }),
        "src/generate.ts": "export {};\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        expect(
          issues.some((i) => i.name.includes("saf-ts-run must target")),
        ).toBe(true);
      },
    );
  });

  it("flags source files at package root", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({ name: "@t/p", scripts: {} }),
        "helper.ts": "export const x = 1;\n",
        "helper.test.ts": "import { describe } from 'vitest';\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        const root = issues.filter((i) => i.kindLabel === "root");
        expect(root.map((i) => i.filePath).sort()).toEqual([
          "helper.test.ts",
          "helper.ts",
        ]);
      },
    );
  });

  it("allows drizzle.config.ts, schema.ts, index.ts, and client.ts at package root", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({ name: "@t/p", scripts: {} }),
        "drizzle.config.ts": "export default {};\n",
        "schema.ts": "export {};\n",
        "index.ts": "export {};\n",
        "client.ts": "export const getClient = () => null;\n",
        "helper.ts": "export const x = 1;\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        const root = issues.filter((i) => i.kindLabel === "root");
        expect(root.map((i) => i.filePath)).toEqual(["helper.ts"]);
      },
    );
  });

  it("allows root files that are direct package export targets", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({
          name: "@t/p",
          scripts: {},
          exports: {
            "./errors": "./errors.ts",
            "./fakes": "./fakes.ts",
          },
        }),
        "errors.ts": "export class E {}\n",
        "fakes.ts": "export const handlers = [];\n",
        "orphan.ts": "export const x = 1;\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        const root = issues.filter((i) => i.kindLabel === "root");
        expect(root.map((i) => i.filePath)).toEqual(["orphan.ts"]);
      },
    );
  });

  it("still flags root test files next to allowed entries", () => {
    withTempPkg(
      {
        "package.json": JSON.stringify({ name: "@t/p", scripts: {} }),
        "index.ts": "export {};\n",
        "index.test.ts": "import { describe } from 'vitest';\n",
        "client.ts": "export {};\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        const root = issues.filter((i) => i.kindLabel === "root");
        expect(root.map((i) => i.filePath)).toEqual(["index.test.ts"]);
      },
    );
  });

  it("flags oversized files above default 800", () => {
    const body = Array.from({ length: 801 }, (_, i) => `// ${i}`).join("\n");
    withTempPkg(
      {
        "package.json": JSON.stringify({ name: "@t/p", scripts: {} }),
        "src/big.ts": body + "\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        expect(issues.some((i) => i.kind === "oversized-file")).toBe(true);
      },
    );
  });

  it("skips *.fixtures.ts for oversized checks", () => {
    const body = Array.from({ length: 900 }, (_, i) => `// ${i}`).join("\n");
    withTempPkg(
      {
        "package.json": JSON.stringify({ name: "@t/p", scripts: {} }),
        "src/big.fixtures.ts": body + "\n",
      },
      (dir) => {
        const issues = checkPackageLayout({ packageDir: dir });
        expect(issues.some((i) => i.kind === "oversized-file")).toBe(false);
      },
    );
  });
});
