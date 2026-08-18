import { describe, expect, it } from "vitest";
import { buildPackageDirTree } from "./package-dir-tree.ts";
import {
  dbColumnKey,
  diffPackageDetails,
  exportIdentityKey,
  filterFileNav,
  filterPackageDirTree,
  packageChangesFromDiff,
  pickChangedItems,
  specPropertyKey,
  testIdentityKey,
  type CommitDiffLike,
  type OverlayPackageDetail,
} from "./package-change-overlay.ts";
import type { TestFileNavNode } from "./test-tree.ts";

const pkg = "@demo/lib";

function detail(
  partial: Partial<OverlayPackageDetail> = {},
): OverlayPackageDetail {
  return {
    packageName: pkg,
    directory: "lib",
    exports: [],
    testCases: [],
    ...partial,
  };
}

describe("diffPackageDetails", () => {
  it("marks added, removed, and signature/docstring-modified exports", () => {
    const overlay = diffPackageDetails(
      detail({
        exports: [
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "keep",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "gone",
            kind: "function",
            signature: "(): void",
          },
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "tweaked",
            kind: "function",
            signature: "(): void",
            docstring: "old",
          },
        ],
      }),
      detail({
        exports: [
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "keep",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "fresh",
            kind: "function",
            signature: "(): number",
          },
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "tweaked",
            kind: "function",
            signature: "(): string",
            docstring: "new",
          },
        ],
      }),
    );
    expect(overlay.packageChange).toBe("modified");
    expect(overlay.exports[exportIdentityKey({
      filePath: "lib/a.ts",
      name: "fresh",
      kind: "function",
    })]).toBe("added");
    expect(overlay.exports[exportIdentityKey({
      filePath: "lib/a.ts",
      name: "gone",
      kind: "function",
    })]).toBe("removed");
    expect(overlay.exports[exportIdentityKey({
      filePath: "lib/a.ts",
      name: "tweaked",
      kind: "function",
    })]).toBe("modified");
    expect(
      overlay.exports[exportIdentityKey({
        filePath: "lib/a.ts",
        name: "keep",
        kind: "function",
      })],
    ).toBeUndefined();
    expect(overlay.modules["a"]).toBe("modified");
  });

  it("marks tests added/removed and modified when subject fields change", () => {
    const overlay = diffPackageDetails(
      detail({
        testCases: [
          {
            packageName: pkg,
            filePath: "lib/a.test.ts",
            fullName: "a > stays",
            subjectName: "a",
            subjectSignature: "(): void",
          },
          {
            packageName: pkg,
            filePath: "lib/a.test.ts",
            fullName: "a > gone",
          },
          {
            packageName: pkg,
            filePath: "lib/a.test.ts",
            fullName: "a > docs",
            subjectName: "a",
            subjectDocstring: "old",
          },
        ],
      }),
      detail({
        testCases: [
          {
            packageName: pkg,
            filePath: "lib/a.test.ts",
            fullName: "a > stays",
            subjectName: "a",
            subjectSignature: "(): void",
          },
          {
            packageName: pkg,
            filePath: "lib/a.test.ts",
            fullName: "a > new",
          },
          {
            packageName: pkg,
            filePath: "lib/a.test.ts",
            fullName: "a > docs",
            subjectName: "a",
            subjectDocstring: "new",
          },
        ],
      }),
    );
    expect(
      overlay.tests[testIdentityKey({
        filePath: "lib/a.test.ts",
        fullName: "a > new",
      })],
    ).toBe("added");
    expect(
      overlay.tests[testIdentityKey({
        filePath: "lib/a.test.ts",
        fullName: "a > gone",
      })],
    ).toBe("removed");
    expect(
      overlay.tests[testIdentityKey({
        filePath: "lib/a.test.ts",
        fullName: "a > docs",
      })],
    ).toBe("modified");
  });

  it("collapses git path renames into moved instead of remove+add", () => {
    const overlay = diffPackageDetails(
      detail({
        exports: [
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "foo",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
        ],
        testCases: [
          {
            packageName: pkg,
            filePath: "lib/a.test.ts",
            fullName: "foo > works",
          },
        ],
      }),
      detail({
        exports: [
          {
            packageName: pkg,
            filePath: "lib/b.ts",
            name: "foo",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
        ],
        testCases: [
          {
            packageName: pkg,
            filePath: "lib/b.test.ts",
            fullName: "foo > works",
          },
        ],
      }),
      {
        pathRenames: [
          { fromPath: "lib/a.ts", toPath: "lib/b.ts" },
          { fromPath: "lib/a.test.ts", toPath: "lib/b.test.ts" },
        ],
      },
    );
    expect(
      overlay.exports[exportIdentityKey({
        filePath: "lib/a.ts",
        name: "foo",
        kind: "function",
      })],
    ).toBeUndefined();
    expect(
      overlay.exports[exportIdentityKey({
        filePath: "lib/b.ts",
        name: "foo",
        kind: "function",
      })],
    ).toBe("moved");
    expect(
      overlay.tests[testIdentityKey({
        filePath: "lib/a.test.ts",
        fullName: "foo > works",
      })],
    ).toBeUndefined();
    expect(
      overlay.tests[testIdentityKey({
        filePath: "lib/b.test.ts",
        fullName: "foo > works",
      })],
    ).toBe("moved");
    expect(overlay.modules["a"]).toBeUndefined();
    expect(overlay.modules["b"]).toBe("moved");
    expect(overlay.movedFrom["b"]).toBe("a");
  });

  it("marks a renamed export modified when its signature also changed", () => {
    const overlay = diffPackageDetails(
      detail({
        exports: [
          {
            packageName: pkg,
            filePath: "lib/a.ts",
            name: "foo",
            kind: "function",
            signature: "(): void",
          },
        ],
      }),
      detail({
        exports: [
          {
            packageName: pkg,
            filePath: "lib/b.ts",
            name: "foo",
            kind: "function",
            signature: "(): number",
          },
        ],
      }),
      { pathRenames: [{ fromPath: "lib/a.ts", toPath: "lib/b.ts" }] },
    );
    expect(
      overlay.exports[exportIdentityKey({
        filePath: "lib/b.ts",
        name: "foo",
        kind: "function",
      })],
    ).toBe("modified");
    expect(overlay.modules["a"]).toBeUndefined();
    expect(overlay.modules["b"]).toBe("modified");
    expect(overlay.movedFrom["b"]).toBeUndefined();
  });

  it("marks schema properties added/removed/modified on typeKind or docstring", () => {
    const overlay = diffPackageDetails(
      detail({
        specInventory: {
          entities: [
            {
              key: "object:Matter",
              presence: "object",
              schema: {
                description: "Matter",
                properties: [
                  { name: "id", typeKind: "string", docstring: "id" },
                  { name: "title", typeKind: "string", docstring: "old" },
                ],
              },
              operations: [],
            },
          ],
        },
      }),
      detail({
        specInventory: {
          entities: [
            {
              key: "object:Matter",
              presence: "object",
              schema: {
                description: "Matter",
                properties: [
                  { name: "id", typeKind: "string", docstring: "id" },
                  { name: "title", typeKind: "string", docstring: "new" },
                  { name: "status", typeKind: "string" },
                ],
              },
              operations: [],
            },
          ],
        },
      }),
    );
    expect(
      overlay.specProperties[specPropertyKey("object:Matter", "status")],
    ).toBe("added");
    expect(
      overlay.specProperties[specPropertyKey("object:Matter", "title")],
    ).toBe("modified");
    expect(
      overlay.specProperties[specPropertyKey("object:Matter", "id")],
    ).toBeUndefined();
    expect(overlay.specEntities["object:Matter"]).toBe("modified");
  });

  it("rolls module stems and treats a brand-new package as added", () => {
    const overlay = diffPackageDetails(null, detail({
      exports: [
        {
          packageName: pkg,
          filePath: "lib/dir/b.ts",
          name: "b",
          kind: "const",
        },
      ],
    }));
    expect(overlay.packageChange).toBe("added");
    expect(overlay.modules["dir/b"]).toBe("added");
  });
});

describe("filterPackageDirTree", () => {
  it("keeps changed packages and drops empty dirs", () => {
    const tree = buildPackageDirTree([
      { packageName: "@a/keep", directory: "products/a/keep" },
      { packageName: "@a/hide", directory: "products/a/hide" },
      { packageName: "@b/gone", directory: "products/b/gone" },
    ]);
    const filtered = filterPackageDirTree(tree, {
      "@a/keep": "modified",
      "@b/gone": "removed",
    });
    expect(filtered.map((n) => n.label)).toEqual(["products"]);
    const products = filtered[0]!;
    expect(products.children.map((n) => n.label).sort()).toEqual(["a", "b"]);
    const a = products.children.find((n) => n.label === "a")!;
    expect(a.children).toHaveLength(1);
    expect(a.children[0]?.packageName).toBe("@a/keep");
    expect(a.children[0]?.change).toBe("modified");
  });
});

describe("filterFileNav", () => {
  it("keeps changed stems and ancestor dirs", () => {
    const nav: TestFileNavNode[] = [
      {
        id: "dir:src",
        label: "src",
        kind: "dir",
        localPath: "src",
        children: [
          {
            id: "file:src/a",
            label: "a",
            kind: "file",
            localPath: "src/a",
            children: [],
          },
          {
            id: "file:src/b",
            label: "b",
            kind: "file",
            localPath: "src/b",
            children: [],
          },
        ],
      },
      {
        id: "file:root",
        label: "root",
        kind: "file",
        localPath: "root",
        children: [],
      },
    ];
    const filtered = filterFileNav(nav, { "src/a": "added" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.localPath).toBe("src");
    expect(filtered[0]?.children.map((c) => c.localPath)).toEqual(["src/a"]);
    expect(filtered[0]?.children[0]?.change).toBe("added");
  });

  it("attaches movedFrom on renamed stems", () => {
    const nav: TestFileNavNode[] = [
      {
        id: "file:src/a",
        label: "a",
        kind: "file",
        localPath: "src/a",
        children: [],
      },
      {
        id: "file:src/b",
        label: "b",
        kind: "file",
        localPath: "src/b",
        children: [],
      },
    ];
    const filtered = filterFileNav(
      nav,
      { "src/b": "moved" },
      { "src/b": "src/a" },
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.localPath).toBe("src/b");
    expect(filtered[0]?.change).toBe("moved");
    expect(filtered[0]?.movedFrom).toBe("src/a");
  });
});

describe("packageChangesFromDiff", () => {
  it("unions metric deltas with export/test/db symbol hits", () => {
    const diff: CommitDiffLike = {
      packageMetrics: {
        added: [{ packageName: "@new/pkg" }],
        removed: [{ packageName: "@old/pkg" }],
        changed: [{ after: { packageName: "@chg/pkg" } }],
      },
      exports: {
        added: [{ packageName: "@doc/pkg" }],
        removed: [],
      },
      testCases: { added: [], removed: [] },
      dbSchemas: {
        tables: { added: [], removed: [] },
        columns: { added: [], removed: [], changed: [] },
      },
    };
    expect(packageChangesFromDiff(diff)).toEqual({
      "@new/pkg": "added",
      "@old/pkg": "removed",
      "@chg/pkg": "modified",
      "@doc/pkg": "modified",
    });
  });
});

describe("pickChangedItems", () => {
  it("takes removed items from before and added/modified from after", () => {
    const picked = pickChangedItems(
      [
        { filePath: "a.ts", name: "gone", kind: "const" },
        { filePath: "a.ts", name: "tweaked", kind: "const", signature: "old" },
      ],
      [
        { filePath: "a.ts", name: "fresh", kind: "const" },
        { filePath: "a.ts", name: "tweaked", kind: "const", signature: "new" },
        { filePath: "a.ts", name: "keep", kind: "const" },
      ],
      exportIdentityKey,
      {
        [exportIdentityKey({ filePath: "a.ts", name: "gone", kind: "const" })]:
          "removed",
        [exportIdentityKey({ filePath: "a.ts", name: "fresh", kind: "const" })]:
          "added",
        [exportIdentityKey({
          filePath: "a.ts",
          name: "tweaked",
          kind: "const",
        })]: "modified",
      },
    );
    expect(picked.map((p) => p.name).sort()).toEqual([
      "fresh",
      "gone",
      "tweaked",
    ]);
    expect(picked.find((p) => p.name === "tweaked")?.signature).toBe("new");
  });
});

describe("dbColumnKey", () => {
  it("is stable per entity + sql name", () => {
    expect(dbColumnKey("matter", "id")).toBe("matter\0id");
  });
});
