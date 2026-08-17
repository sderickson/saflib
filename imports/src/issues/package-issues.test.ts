import { describe, expect, it } from "vitest";
import { collectPackageIssues } from "./package-issues.ts";

describe("collectPackageIssues", () => {
  it("skips dead-code on package.json export targets", () => {
    const issues = collectPackageIssues({
      packageName: "@pkg/spa",
      directory: "clients/app",
      exports: [
        {
          name: "main",
          kind: "const",
          filePath: "clients/app/main.ts",
          usedBy: [],
        },
        {
          name: "mountTestApp",
          kind: "const",
          filePath: "clients/app/test-app.ts",
          usedBy: [],
        },
        {
          name: "helper",
          kind: "function",
          filePath: "clients/app/pages/Foo.logic.ts",
          usedBy: [],
        },
      ],
      publicExportFilePaths: [
        "clients/app/main.ts",
        "clients/app/test-app.ts",
      ],
    });
    expect(issues.map((i) => i.name)).toEqual(["helper"]);
  });
});
