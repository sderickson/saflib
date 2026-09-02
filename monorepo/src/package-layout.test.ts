import { describe, expect, it } from "vitest";
import {
  checkPackageLayoutFromInputs,
  isAllowedRootTsFile,
  isColocatedRootTestFile,
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
  it("flags mixed drizzle/express/openapi identifier deps", () => {
    const issues = checkPackageLayoutFromInputs({
      packageJson: {
        name: "@scope/mixed",
        dependencies: {
          "@saflib/drizzle": "*",
          "@saflib/express": "*",
        },
      },
    });
    expect(issues.map((i) => i.kindLabel)).toEqual(["kind"]);
    expect(issues[0]?.name).toContain("@saflib/drizzle");
    expect(issues[0]?.name).toContain("@saflib/express");
  });

  it("does not flag a unique identifier dep", () => {
    const issues = checkPackageLayoutFromInputs({
      packageJson: {
        name: "@scope/db",
        dependencies: { "@saflib/drizzle": "*" },
      },
    });
    expect(issues.filter((i) => i.kindLabel === "kind")).toEqual([]);
  });

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

  it("allows monolith run.ts as root file and saf-ts-run entrypoint", () => {
    const issues = checkPackageLayoutFromInputs({
      packageJson: {
        exports: { "./run": "./run.ts" },
        scripts: { start: "saf-ts-run ./run.ts" },
      },
      rootTsFiles: ["run.ts"],
    });
    expect(issues).toEqual([]);
  });

  it("allows root tests colocated with a root source file of the same stem", () => {
    expect(
      isColocatedRootTestFile("audit-map.test.ts", [
        "audit-map.ts",
        "audit.ts",
      ]),
    ).toBe(true);
    const issues = checkPackageLayoutFromInputs({
      packageJson: {
        exports: { ".": "./audit.ts", "./audit-map": "./audit-map.ts" },
      },
      rootTsFiles: ["audit-map.ts", "audit-map.test.ts", "audit.ts"],
    });
    expect(issues.map((i) => i.filePath)).toEqual([]);
  });

  it("does not allow root index.test.ts via colocation rule", () => {
    expect(
      isColocatedRootTestFile("index.test.ts", ["index.ts"]),
    ).toBe(false);
  });
});
