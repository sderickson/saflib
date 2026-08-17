import { describe, expect, it } from "vitest";
import {
  buildDbPackageFileNav,
  buildModuleFileNav,
  buildPackageSpecTree,
  dbEntitySelectionFromScope,
  isDbPackageHiddenModuleStem,
  isSdkPackageHiddenModuleStem,
  toModuleStem,
} from "./test-tree.ts";

describe("toModuleStem", () => {
  it("strips source and test suffixes", () => {
    expect(toModuleStem("a/b.ts")).toBe("a/b");
    expect(toModuleStem("a/b.test.ts")).toBe("a/b");
    expect(toModuleStem("a/b.spec.tsx")).toBe("a/b");
    expect(toModuleStem("a/b.fake.ts")).toBe("a/b");
    expect(toModuleStem("a/b")).toBe("a/b");
  });
});

describe("buildDbPackageFileNav", () => {
  it("puts entities first and hides schemas/queries modules", () => {
    const nav = buildDbPackageFileNav(
      ["matter", "org"],
      [
        {
          packageName: "@pkg/db",
          filePath: "db/errors/index.ts",
          name: "MatterNotFoundError",
          kind: "class",
        },
        {
          packageName: "@pkg/db",
          filePath: "db/schemas/matter.ts",
          name: "matterTable",
          kind: "const",
        },
        {
          packageName: "@pkg/db",
          filePath: "db/instances/registry.ts",
          name: "daemonDbManager",
          kind: "const",
        },
        {
          packageName: "@pkg/db",
          filePath: "db/queries/matter/create.ts",
          name: "createMatter",
          kind: "function",
        },
      ],
      [],
      "@pkg/db",
      "db",
    );

    expect(nav[0]?.label).toBe("entities");
    expect(nav[0]?.kind).toBe("dir");
    expect(nav[0]?.children.map((c) => c.label)).toEqual(["matter", "org"]);
    expect(nav[0]?.children[0]?.localPath).toBe("entities/matter");

    const labels = nav.slice(1).map((n) => n.label);
    expect(labels).toContain("errors");
    expect(labels).toContain("instances");
    expect(labels).not.toContain("schemas");
    expect(labels).not.toContain("queries");
  });

  it("maps entity scopes from the virtual entities/ path", () => {
    expect(dbEntitySelectionFromScope({ kind: "all" })).toBeUndefined();
    expect(
      dbEntitySelectionFromScope({ kind: "dir", localPath: "entities" }),
    ).toBeNull();
    expect(
      dbEntitySelectionFromScope({
        kind: "file",
        localPath: "entities/matter",
      }),
    ).toBe("matter");
    expect(
      dbEntitySelectionFromScope({ kind: "dir", localPath: "errors" }),
    ).toBeUndefined();
    expect(isDbPackageHiddenModuleStem("queries/matter/create")).toBe(true);
    expect(isDbPackageHiddenModuleStem("errors/index")).toBe(false);
  });
});

describe("sdk module nav", () => {
  it("folds *.fake.ts into the request stem and hides request barrels", () => {
    const nav = buildModuleFileNav(
      [
        {
          packageName: "@pkg/sdk",
          filePath: "sdk/requests/forms/get.ts",
          name: "getForm",
          kind: "function",
        },
        {
          packageName: "@pkg/sdk",
          filePath: "sdk/requests/forms/get.fake.ts",
          name: "getFormHandler",
          kind: "const",
        },
        {
          packageName: "@pkg/sdk",
          filePath: "sdk/requests/forms/index.fakes.ts",
          name: "formsFakes",
          kind: "const",
        },
        {
          packageName: "@pkg/sdk",
          filePath: "sdk/requests/forms/index.ts",
          name: "default",
          kind: "const",
        },
      ],
      [
        {
          packageName: "@pkg/sdk",
          filePath: "sdk/requests/forms/get.test.ts",
          fullName: "getForm > ok",
        },
      ],
      "@pkg/sdk",
      "sdk",
      "",
      { excludeStem: isSdkPackageHiddenModuleStem },
    );

    const requests = nav.find((n) => n.label === "requests");
    const forms = requests?.children.find((c) => c.label === "forms");
    const labels = (forms?.children ?? []).map((c) => c.label);
    expect(labels).toEqual(["get"]);
    expect(forms?.children[0]?.presence).toBe("both");
    expect(isSdkPackageHiddenModuleStem("requests/forms/index")).toBe(true);
    expect(isSdkPackageHiddenModuleStem("requests/forms/index.fakes")).toBe(
      true,
    );
    expect(isSdkPackageHiddenModuleStem("requests/forms/get")).toBe(false);
  });
});

describe("buildModuleFileNav", () => {
  it("pairs colocated source and test under one stem", () => {
    const nav = buildModuleFileNav(
      [
        {
          packageName: "@pkg",
          filePath: "pkg/document-requirements/validate-document-requirements.ts",
          name: "validateDocumentRequirementsShape",
          kind: "function",
        },
        {
          packageName: "@pkg",
          filePath: "pkg/document-requirements/normalize-document-requirements.ts",
          name: "normalize",
          kind: "function",
        },
        {
          packageName: "@pkg",
          filePath: "pkg/lib/types.ts",
          name: "FileInput",
          kind: "type",
        },
      ],
      [
        {
          packageName: "@pkg",
          filePath:
            "pkg/document-requirements/normalize-document-requirements.test.ts",
          fullName: "normalize > works",
        },
      ],
      "@pkg",
      "pkg",
    );

    const dir = nav.find((n) => n.label === "document-requirements");
    expect(dir?.kind).toBe("dir");
    const byLabel = Object.fromEntries(
      (dir?.children ?? []).map((c) => [c.label, c]),
    );
    expect(byLabel["validate-document-requirements"]?.presence).toBe("source");
    expect(byLabel["validate-document-requirements"]?.hasCardExports).toBe(true);
    expect(byLabel["normalize-document-requirements"]?.presence).toBe("both");

    const lib = nav.find((n) => n.label === "lib");
    const types = lib?.children.find((c) => c.label === "types");
    expect(types?.presence).toBe("source");
    expect(types?.hasCardExports).toBe(false);
  });

  it("keeps test-only modules", () => {
    const nav = buildModuleFileNav(
      [],
      [
        {
          packageName: "@pkg",
          filePath: "pkg/forms-artifacts.integration.test.ts",
          fullName: "form artifacts > ok",
        },
      ],
      "@pkg",
      "pkg",
    );
    expect(nav).toHaveLength(1);
    expect(nav[0]!.label).toBe("forms-artifacts.integration");
    expect(nav[0]!.presence).toBe("test");
  });
});

describe("buildPackageSpecTree", () => {
  it("shows source-only exports as cards with docstring and usedBy", () => {
    const cards = buildPackageSpecTree(
      [
        {
          packageName: "@pkg",
          filePath: "pkg/validate-document-requirements.ts",
          name: "validateDocumentRequirementsShape",
          kind: "function",
          signature: "(formName: string, requirements: unknown)",
          docstring: "Validate compiled document-requirements shape.",
          usedBy: [
            {
              packageName: "@runtime",
              filePath: "forms-artifacts.integration.test.ts",
              repoPath: "runtime/forms-artifacts.integration.test.ts",
            },
          ],
        },
      ],
      [],
      "@pkg",
      "pkg",
      "",
      { kind: "file", localPath: "validate-document-requirements" },
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]!.label).toBe("validateDocumentRequirementsShape");
    expect(cards[0]!.subjectDocstring).toContain("Validate compiled");
    expect(cards[0]!.usedBy).toHaveLength(1);
    expect(cards[0]!.children).toHaveLength(0);
  });
});
