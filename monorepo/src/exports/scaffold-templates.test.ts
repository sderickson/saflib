import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const monorepoRoot = path.join(import.meta.dirname, "../../../..");

function readTemplatePackageJson(relativePath: string) {
  const filePath = path.join(monorepoRoot, relativePath);
  return JSON.parse(readFileSync(filePath, "utf8")) as {
    exports?: Record<string, string>;
    sideEffects?: boolean | string[];
  };
}

describe("scaffold template import-graph defaults", () => {
  // Golden product packages under saflib/base (former workflows/templates).
  const patternExportTemplates = [
    "saflib/base/service/sdk/package.json",
    "saflib/base/service/db/package.json",
    "saflib/base/service/http/package.json",
    "saflib/base/clients/common/package.json",
  ];

  for (const templatePath of patternExportTemplates) {
    it(`${templatePath} uses pattern exports without a root barrel`, () => {
      const pkg = readTemplatePackageJson(templatePath);
      expect(pkg.exports).toBeDefined();
      expect(pkg.exports!["."]).toBeUndefined();
      expect(Object.keys(pkg.exports!).some((key) => key.includes("*"))).toBe(
        true,
      );
      expect(pkg.sideEffects).toBeDefined();
    });
  }

  it("sdk package marks client.ts as side-effectful", () => {
    const pkg = readTemplatePackageJson(
      "saflib/base/service/sdk/package.json",
    );
    expect(pkg.sideEffects).toEqual(["./client.ts"]);
  });

  it("vue client build package marks CSS as side-effectful", () => {
    const pkg = readTemplatePackageJson(
      "saflib/base/clients/build/package.json",
    );
    expect(pkg.sideEffects).toEqual(["**/*.css", "**/*.scss"]);
  });

  it("openapi spec package exposes dist fragment patterns", () => {
    const pkg = readTemplatePackageJson(
      "saflib/base/service/spec/package.json",
    );
    expect(pkg.exports?.["./operations/*"]).toBeDefined();
    expect(pkg.exports?.["./schemas/*"]).toBeDefined();
  });

  it("integrations stub exports mocks subpath", () => {
    const pkg = readTemplatePackageJson(
      "saflib/base/service/integrations/__integration-name__/package.json",
    );
    expect(pkg.exports?.["./mocks"]).toBe("./mocks/client.ts");
    expect(pkg.sideEffects).toBe(false);
  });
});
