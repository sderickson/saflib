import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const monorepoRoot = path.join(import.meta.dirname, "..", "..");

function readTemplatePackageJson(relativePath: string) {
  const filePath = path.join(monorepoRoot, relativePath);
  return JSON.parse(readFileSync(filePath, "utf8")) as {
    exports?: Record<string, string>;
    sideEffects?: boolean | string[];
  };
}

describe("scaffold template import-graph defaults", () => {
  const patternExportTemplates = [
    "saflib/sdk/workflows/templates/package.json",
    "saflib/drizzle/workflows/templates/package.json",
    "saflib/service/workflows/common-templates/package.json",
    "saflib/express/workflows/templates/package.json",
    "saflib/vue/workflows/template/common/package.json",
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

  it("sdk template marks client.ts as side-effectful", () => {
    const pkg = readTemplatePackageJson("saflib/sdk/workflows/templates/package.json");
    expect(pkg.sideEffects).toEqual(["./client.ts"]);
  });

  it("vue client build template marks CSS as side-effectful", () => {
    const pkg = readTemplatePackageJson(
      "saflib/vue/workflows/template/build/package.json",
    );
    expect(pkg.sideEffects).toEqual(["**/*.css", "**/*.scss"]);
  });

  it("openapi spec template exposes dist fragment patterns", () => {
    const pkg = readTemplatePackageJson(
      "saflib/openapi/workflows/templates/package.json",
    );
    expect(pkg.exports?.["./operations/*"]).toBeDefined();
    expect(pkg.exports?.["./schemas/*"]).toBeDefined();
  });

  it("integrations template exports mocks subpath", () => {
    const pkg = readTemplatePackageJson(
      "saflib/integrations/workflows/templates/package.json",
    );
    expect(pkg.exports?.["./mocks"]).toBe("./client.mocks.ts");
    expect(pkg.sideEffects).toBe(false);
  });
});
