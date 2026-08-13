import { describe, expect, it } from "vitest";
import { collectPackageIssues } from "@saflib/imports";

describe("collectPackageIssues (re-export)", () => {
  it("lists card exports with empty usedBy as dead code", () => {
    const issues = collectPackageIssues(
      {
        packageName: "@pkg",
        exports: [
          {
            name: "usedFn",
            kind: "function",
            filePath: "pkg/a.ts",
            usedBy: [
              {
                packageName: "@other",
                filePath: "x.ts",
                repoPath: "other/x.ts",
              },
            ],
          },
          {
            name: "deadFn",
            kind: "function",
            filePath: "pkg/b.ts",
            usedBy: [],
          },
          {
            name: "OnlyType",
            kind: "type",
            filePath: "pkg/t.ts",
            usedBy: [],
          },
        ],
      },
      { packageDirectory: "pkg" },
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]!.name).toBe("deadFn");
    expect(issues[0]!.kind).toBe("dead-code");
    expect(issues[0]!.filePath).toBe("b.ts");
  });
});
