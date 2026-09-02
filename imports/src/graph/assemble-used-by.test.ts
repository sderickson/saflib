import { describe, expect, it } from "vitest";
import { assembleUsedBy } from "./assemble-used-by.ts";
import { exportUsedByKey } from "./import-resolution.ts";

describe("assembleUsedBy", () => {
  it("records cross-file imports", () => {
    const map = assembleUsedBy(
      "@pkg",
      "pkg",
      [{ filePath: "pkg/a.ts", name: "helper" }],
      [
        {
          path: "pkg/b.ts",
          packageName: "@pkg",
          packageDirectory: "pkg",
          isTest: false,
          imports: [{ specifier: "./a.ts", names: ["helper"] }],
        },
      ],
    );
    expect(map.get(exportUsedByKey("pkg/a.ts", "helper"))).toEqual([
      {
        packageName: "@pkg",
        filePath: "b.ts",
        repoPath: "pkg/b.ts",
      },
    ]);
  });

  it("records same-file localExportUsages as self usedBy", () => {
    const map = assembleUsedBy(
      "@pkg",
      "pkg",
      [
        { filePath: "pkg/a.ts", name: "helper" },
        { filePath: "pkg/a.ts", name: "main" },
      ],
      [
        {
          path: "pkg/a.ts",
          packageName: "@pkg",
          packageDirectory: "pkg",
          isTest: false,
          imports: [],
          localExportUsages: ["helper"],
        },
      ],
    );
    expect(map.get(exportUsedByKey("pkg/a.ts", "helper"))).toEqual([
      {
        packageName: "@pkg",
        filePath: "a.ts",
        repoPath: "pkg/a.ts",
      },
    ]);
    expect(map.get(exportUsedByKey("pkg/a.ts", "main"))).toBeUndefined();
  });

  it("skips localExportUsages on test files", () => {
    const map = assembleUsedBy(
      "@pkg",
      "pkg",
      [{ filePath: "pkg/a.ts", name: "helper" }],
      [
        {
          path: "pkg/a.ts",
          packageName: "@pkg",
          packageDirectory: "pkg",
          isTest: true,
          imports: [],
          localExportUsages: ["helper"],
        },
      ],
    );
    expect(map.size).toBe(0);
  });

  it("records imports resolved via resolveImportTarget", () => {
    const map = assembleUsedBy(
      "@pkg/email",
      "pkg/email",
      [{ filePath: "pkg/email/emails/password-reset.ts", name: "passwordReset" }],
      [
        {
          path: "pkg/kratos/on-recovery.ts",
          packageName: "@pkg/kratos",
          packageDirectory: "pkg/kratos",
          isTest: false,
          imports: [
            {
              specifier: "@pkg/email/password-reset",
              names: ["passwordReset"],
            },
          ],
        },
      ],
      {
        resolveImportTarget: (_importer, specifier) => {
          if (specifier === "@pkg/email/password-reset") {
            return "pkg/email/emails/password-reset.ts";
          }
          return null;
        },
      },
    );
    expect(
      map.get(
        exportUsedByKey("pkg/email/emails/password-reset.ts", "passwordReset"),
      ),
    ).toEqual([
      {
        packageName: "@pkg/kratos",
        filePath: "on-recovery.ts",
        repoPath: "pkg/kratos/on-recovery.ts",
      },
    ]);
  });
});
