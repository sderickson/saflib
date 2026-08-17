import { describe, expect, it } from "vitest";
import {
  checkPackageLayoutFromInputs,
  isAllowedRootTsFile,
  listPackageJsonExportTargetFiles,
} from "./package-layout.ts";

describe("listPackageJsonExportTargetFiles", () => {
  it("collects concrete targets including the package root export", () => {
    expect(
      listPackageJsonExportTargetFiles({
        ".": "./main.ts",
        "./test-app": "./test-app.ts",
        "./pages/*": "./pages/*.ts",
      }),
    ).toEqual(["main.ts", "test-app.ts"]);
  });
});

describe("isAllowedRootTsFile", () => {
  const spaExports = {
    ".": "./main.ts",
    "./i18n": "./i18n.ts",
    "./test-app": "./test-app.ts",
  };

  it("allows Vue SPA boot, router, and tooling configs", () => {
    expect(isAllowedRootTsFile("main.ts", spaExports)).toBe(true);
    expect(isAllowedRootTsFile("router.ts", spaExports)).toBe(true);
    expect(isAllowedRootTsFile("vitest.config.ts", spaExports)).toBe(true);
    expect(isAllowedRootTsFile("playwright.config.ts", spaExports)).toBe(true);
    expect(isAllowedRootTsFile("vite.config.ts", spaExports)).toBe(true);
  });

  it("allows public ./stem exports and the . export target", () => {
    expect(isAllowedRootTsFile("i18n.ts", spaExports)).toBe(true);
    expect(isAllowedRootTsFile("test-app.ts", spaExports)).toBe(true);
  });

  it("does not allow arbitrary root helpers", () => {
    expect(isAllowedRootTsFile("org-router-guard.ts", spaExports)).toBe(false);
  });
});

describe("checkPackageLayoutFromInputs", () => {
  it("does not flag SPA root boot/config files", () => {
    const issues = checkPackageLayoutFromInputs({
      packageJson: {
        exports: {
          ".": "./main.ts",
          "./i18n": "./i18n.ts",
        },
      },
      rootTsFiles: [
        "main.ts",
        "router.ts",
        "i18n.ts",
        "vitest.config.ts",
        "playwright.config.ts",
        "org-router-guard.ts",
      ],
    });
    expect(issues.map((i) => i.filePath)).toEqual(["org-router-guard.ts"]);
  });
});
