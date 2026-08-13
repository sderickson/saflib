import { describe, expect, it } from "vitest";
import {
  buildModuleFileNav,
  buildPackageSpecTree,
  toModuleStem,
} from "./test-tree.ts";

describe("toModuleStem", () => {
  it("strips source and test suffixes", () => {
    expect(toModuleStem("a/b.ts")).toBe("a/b");
    expect(toModuleStem("a/b.test.ts")).toBe("a/b");
    expect(toModuleStem("a/b.spec.tsx")).toBe("a/b");
    expect(toModuleStem("a/b")).toBe("a/b");
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
