import { describe, expect, it } from "vitest";
import {
  collectPackageIssues,
  countIssuesByKind,
  debtCountFromIssueCounts,
} from "./package-issues.ts";

describe("collectPackageIssues", () => {
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

  it("lists same-file-only exports", () => {
    const issues = collectPackageIssues(
      {
        packageName: "@pkg",
        exports: [
          {
            name: "helper",
            kind: "function",
            filePath: "pkg/a.ts",
            usedBy: [
              {
                packageName: "@pkg",
                filePath: "a.ts",
                repoPath: "pkg/a.ts",
              },
            ],
          },
        ],
      },
      { packageDirectory: "pkg" },
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe("same-file-only-export");
    expect(issues[0]!.name).toBe("helper");
  });

  it("lists unused db queries", () => {
    const issues = collectPackageIssues({
      packageName: "@pkg-db",
      dbInventory: {
        entities: [
          {
            entity: "matter",
            queries: [
              {
                fileName: "create.ts",
                filePath: "db/queries/matter/create.ts",
                exportName: "createMatter",
                usedBy: [],
              },
              {
                fileName: "get.ts",
                filePath: "db/queries/matter/get.ts",
                exportName: "getMatter",
                usedBy: [
                  {
                    packageName: "@http",
                    filePath: "r.ts",
                    repoPath: "http/r.ts",
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(issues.map((i) => i.name)).toEqual(["createMatter"]);
  });

  it("merges layoutIssues into the result list", () => {
    const issues = collectPackageIssues({
      packageName: "@pkg",
      exports: [
        {
          name: "deadFn",
          kind: "function",
          filePath: "pkg/b.ts",
          usedBy: [],
        },
      ],
      layoutIssues: [
        {
          kind: "package-layout",
          title: "Package layout",
          name: "root.ts at package root (move into a thematic folder)",
          kindLabel: "root",
          filePath: "root.ts",
          repoPath: "pkg/root.ts",
        },
        {
          kind: "oversized-file",
          title: "Oversized file",
          name: "big.ts (900 LoC > 800)",
          kindLabel: "file",
          filePath: "big.ts",
          repoPath: "pkg/big.ts",
        },
      ],
    });

    expect(issues.map((i) => i.kind).sort()).toEqual([
      "dead-code",
      "oversized-file",
      "package-layout",
    ]);
  });
});

describe("debt helpers", () => {
  it("excludes same-file-only from debtCount", () => {
    const counts = countIssuesByKind([
      {
        kind: "dead-code",
        title: "",
        name: "a",
        kindLabel: "",
        filePath: "a.ts",
        repoPath: "a.ts",
      },
      {
        kind: "same-file-only-export",
        title: "",
        name: "b",
        kindLabel: "",
        filePath: "b.ts",
        repoPath: "b.ts",
      },
      {
        kind: "package-layout",
        title: "",
        name: "c",
        kindLabel: "",
        filePath: "package.json",
        repoPath: "package.json",
      },
    ]);
    expect(counts).toEqual({
      "dead-code": 1,
      "same-file-only-export": 1,
      "oversized-file": 0,
      "package-layout": 1,
    });
    expect(debtCountFromIssueCounts(counts)).toBe(2);
  });
});
