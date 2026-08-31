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
    package_name: pkg,
    directory: "lib",
    exports: [],
    test_cases: [],
    ...partial,
  };
}

describe("diffPackageDetails", () => {
  it("marks added, removed, and signature/docstring-modified exports", () => {
    const overlay = diffPackageDetails(
      detail({
        exports: [
          {
            package_name: pkg,
            file_path: "lib/a.ts",
            name: "keep",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
          {
            package_name: pkg,
            file_path: "lib/a.ts",
            name: "gone",
            kind: "function",
            signature: "(): void",
          },
          {
            package_name: pkg,
            file_path: "lib/a.ts",
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
            package_name: pkg,
            file_path: "lib/a.ts",
            name: "keep",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
          {
            package_name: pkg,
            file_path: "lib/a.ts",
            name: "fresh",
            kind: "function",
            signature: "(): number",
          },
          {
            package_name: pkg,
            file_path: "lib/a.ts",
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
      file_path: "lib/a.ts",
      name: "fresh",
      kind: "function",
    })]).toBe("added");
    expect(overlay.exports[exportIdentityKey({
      file_path: "lib/a.ts",
      name: "gone",
      kind: "function",
    })]).toBe("removed");
    expect(overlay.exports[exportIdentityKey({
      file_path: "lib/a.ts",
      name: "tweaked",
      kind: "function",
    })]).toBe("modified");
    expect(
      overlay.exports[exportIdentityKey({
        file_path: "lib/a.ts",
        name: "keep",
        kind: "function",
      })],
    ).toBeUndefined();
    expect(overlay.modules["a"]).toBe("modified");
  });

  it("marks tests added/removed and modified when subject fields change", () => {
    const overlay = diffPackageDetails(
      detail({
        test_cases: [
          {
            package_name: pkg,
            file_path: "lib/a.test.ts",
            full_name: "a > stays",
            subject_name: "a",
            subject_signature: "(): void",
          },
          {
            package_name: pkg,
            file_path: "lib/a.test.ts",
            full_name: "a > gone",
          },
          {
            package_name: pkg,
            file_path: "lib/a.test.ts",
            full_name: "a > docs",
            subject_name: "a",
            subject_docstring: "old",
          },
        ],
      }),
      detail({
        test_cases: [
          {
            package_name: pkg,
            file_path: "lib/a.test.ts",
            full_name: "a > stays",
            subject_name: "a",
            subject_signature: "(): void",
          },
          {
            package_name: pkg,
            file_path: "lib/a.test.ts",
            full_name: "a > new",
          },
          {
            package_name: pkg,
            file_path: "lib/a.test.ts",
            full_name: "a > docs",
            subject_name: "a",
            subject_docstring: "new",
          },
        ],
      }),
    );
    expect(
      overlay.tests[testIdentityKey({
        file_path: "lib/a.test.ts",
        full_name: "a > new",
      })],
    ).toBe("added");
    expect(
      overlay.tests[testIdentityKey({
        file_path: "lib/a.test.ts",
        full_name: "a > gone",
      })],
    ).toBe("removed");
    expect(
      overlay.tests[testIdentityKey({
        file_path: "lib/a.test.ts",
        full_name: "a > docs",
      })],
    ).toBe("modified");
  });

  it("collapses git path renames into moved instead of remove+add", () => {
    const overlay = diffPackageDetails(
      detail({
        exports: [
          {
            package_name: pkg,
            file_path: "lib/a.ts",
            name: "foo",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
        ],
        test_cases: [
          {
            package_name: pkg,
            file_path: "lib/a.test.ts",
            full_name: "foo > works",
          },
        ],
      }),
      detail({
        exports: [
          {
            package_name: pkg,
            file_path: "lib/b.ts",
            name: "foo",
            kind: "function",
            signature: "(): void",
            docstring: "same",
          },
        ],
        test_cases: [
          {
            package_name: pkg,
            file_path: "lib/b.test.ts",
            full_name: "foo > works",
          },
        ],
      }),
      {
        pathRenames: [
          { from_path: "lib/a.ts", to_path: "lib/b.ts" },
          { from_path: "lib/a.test.ts", to_path: "lib/b.test.ts" },
        ],
      },
    );
    expect(
      overlay.exports[exportIdentityKey({
        file_path: "lib/a.ts",
        name: "foo",
        kind: "function",
      })],
    ).toBeUndefined();
    expect(
      overlay.exports[exportIdentityKey({
        file_path: "lib/b.ts",
        name: "foo",
        kind: "function",
      })],
    ).toBe("moved");
    expect(
      overlay.tests[testIdentityKey({
        file_path: "lib/a.test.ts",
        full_name: "foo > works",
      })],
    ).toBeUndefined();
    expect(
      overlay.tests[testIdentityKey({
        file_path: "lib/b.test.ts",
        full_name: "foo > works",
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
            package_name: pkg,
            file_path: "lib/a.ts",
            name: "foo",
            kind: "function",
            signature: "(): void",
          },
        ],
      }),
      detail({
        exports: [
          {
            package_name: pkg,
            file_path: "lib/b.ts",
            name: "foo",
            kind: "function",
            signature: "(): number",
          },
        ],
      }),
      { pathRenames: [{ from_path: "lib/a.ts", to_path: "lib/b.ts" }] },
    );
    expect(
      overlay.exports[exportIdentityKey({
        file_path: "lib/b.ts",
        name: "foo",
        kind: "function",
      })],
    ).toBe("modified");
    expect(overlay.modules["a"]).toBeUndefined();
    expect(overlay.modules["b"]).toBe("modified");
    expect(overlay.movedFrom["b"]).toBeUndefined();
  });

  it("marks schema properties added/removed/modified on type_kind or docstring", () => {
    const overlay = diffPackageDetails(
      detail({
        spec_inventory: {
          entities: [
            {
              key: "object:Matter",
              presence: "object",
              schema: {
                description: "Matter",
                properties: [
                  { name: "id", type_kind: "string", docstring: "id" },
                  { name: "title", type_kind: "string", docstring: "old" },
                ],
              },
              operations: [],
            },
          ],
        },
      }),
      detail({
        spec_inventory: {
          entities: [
            {
              key: "object:Matter",
              presence: "object",
              schema: {
                description: "Matter",
                properties: [
                  { name: "id", type_kind: "string", docstring: "id" },
                  { name: "title", type_kind: "string", docstring: "new" },
                  { name: "status", type_kind: "string" },
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
          package_name: pkg,
          file_path: "lib/dir/b.ts",
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
      { package_name: "@a/keep", directory: "products/a/keep" },
      { package_name: "@a/hide", directory: "products/a/hide" },
      { package_name: "@b/gone", directory: "products/b/gone" },
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
    expect(a.children[0]?.package_name).toBe("@a/keep");
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
      package_metrics: {
        added: [{ package_name: "@new/pkg" }],
        removed: [{ package_name: "@old/pkg" }],
        changed: [{ after: { package_name: "@chg/pkg" } }],
      },
      exports: {
        added: [{ package_name: "@doc/pkg" }],
        removed: [],
      },
      test_cases: { added: [], removed: [] },
      db_schemas: {
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
        { file_path: "a.ts", name: "gone", kind: "const" },
        { file_path: "a.ts", name: "tweaked", kind: "const", signature: "old" },
      ],
      [
        { file_path: "a.ts", name: "fresh", kind: "const" },
        { file_path: "a.ts", name: "tweaked", kind: "const", signature: "new" },
        { file_path: "a.ts", name: "keep", kind: "const" },
      ],
      exportIdentityKey,
      {
        [exportIdentityKey({ file_path: "a.ts", name: "gone", kind: "const" })]:
          "removed",
        [exportIdentityKey({ file_path: "a.ts", name: "fresh", kind: "const" })]:
          "added",
        [exportIdentityKey({
          file_path: "a.ts",
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
