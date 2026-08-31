import { describe, expect, it } from "vitest";
import {
  buildDbPackageFileNav,
  buildModuleFileNav,
  buildPackageSpecTree,
  dbEntitySelectionFromScope,
  isDbPackageHiddenModuleStem,
  isSdkPackageHiddenModuleStem,
  packageHasVueFiles,
  toModuleStem,
} from "./test-tree.ts";

describe("toModuleStem", () => {
  it("strips source and test suffixes", () => {
    expect(toModuleStem("a/b.ts")).toBe("a/b");
    expect(toModuleStem("a/b.test.ts")).toBe("a/b");
    expect(toModuleStem("a/b.spec.tsx")).toBe("a/b");
    expect(toModuleStem("a/b.fake.ts")).toBe("a/b");
    expect(toModuleStem("a/b.vue")).toBe("a/b");
    expect(toModuleStem("a/b")).toBe("a/b");
  });
});

describe("packageHasVueFiles", () => {
  it("detects .vue and colocated Vue role files", () => {
    expect(
      packageHasVueFiles(
        [
          {
            package_name: "@p",
            file_path: "spa/Foo.logic.ts",
            name: "x",
            kind: "function",
          },
        ],
        [],
        "@p",
      ),
    ).toBe(true);
    expect(
      packageHasVueFiles(
        [
          {
            package_name: "@p",
            file_path: "spa/log.ts",
            name: "log",
            kind: "function",
          },
        ],
        [],
        "@p",
      ),
    ).toBe(false);
  });
});

describe("buildDbPackageFileNav", () => {
  it("puts entities first and hides schemas/queries modules", () => {
    const nav = buildDbPackageFileNav(
      ["matter", "org"],
      [
        {
          package_name: "@pkg/db",
          file_path: "db/errors/index.ts",
          name: "MatterNotFoundError",
          kind: "class",
        },
        {
          package_name: "@pkg/db",
          file_path: "db/schemas/matter.ts",
          name: "matterTable",
          kind: "const",
        },
        {
          package_name: "@pkg/db",
          file_path: "db/instances/registry.ts",
          name: "productDbManager",
          kind: "const",
        },
        {
          package_name: "@pkg/db",
          file_path: "db/queries/matter/create.ts",
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
          package_name: "@pkg/sdk",
          file_path: "sdk/requests/forms/get.ts",
          name: "getForm",
          kind: "function",
        },
        {
          package_name: "@pkg/sdk",
          file_path: "sdk/requests/forms/get.fake.ts",
          name: "getFormHandler",
          kind: "const",
        },
        {
          package_name: "@pkg/sdk",
          file_path: "sdk/requests/forms/index.fakes.ts",
          name: "formsFakes",
          kind: "const",
        },
        {
          package_name: "@pkg/sdk",
          file_path: "sdk/requests/forms/index.ts",
          name: "default",
          kind: "const",
        },
      ],
      [
        {
          package_name: "@pkg/sdk",
          file_path: "sdk/requests/forms/get.test.ts",
          full_name: "getForm > ok",
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
          package_name: "@pkg",
          file_path: "pkg/document-requirements/validate-document-requirements.ts",
          name: "validateDocumentRequirementsShape",
          kind: "function",
        },
        {
          package_name: "@pkg",
          file_path: "pkg/document-requirements/normalize-document-requirements.ts",
          name: "normalize",
          kind: "function",
        },
        {
          package_name: "@pkg",
          file_path: "pkg/lib/types.ts",
          name: "FileInput",
          kind: "type",
        },
      ],
      [
        {
          package_name: "@pkg",
          file_path:
            "pkg/document-requirements/normalize-document-requirements.test.ts",
          full_name: "normalize > works",
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
          package_name: "@pkg",
          file_path: "pkg/forms-artifacts.integration.test.ts",
          full_name: "form artifacts > ok",
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
  it("shows source-only exports as cards with docstring and used_by", () => {
    const cards = buildPackageSpecTree(
      [
        {
          package_name: "@pkg",
          file_path: "pkg/validate-document-requirements.ts",
          name: "validateDocumentRequirementsShape",
          kind: "function",
          signature: "(formName: string, requirements: unknown)",
          docstring: "Validate compiled document-requirements shape.",
          used_by: [
            {
              package_name: "@runtime",
              file_path: "forms-artifacts.integration.test.ts",
              repo_path: "runtime/forms-artifacts.integration.test.ts",
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
    expect(cards[0]!.subject_docstring).toContain("Validate compiled");
    expect(cards[0]!.used_by).toHaveLength(1);
    expect(cards[0]!.children).toHaveLength(0);
  });
});

describe("vue bundle nav", () => {
  const vueExports = [
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/Home.vue",
      name: "default",
      kind: "component",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/Home.vue",
      name: "title",
      kind: "prop",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/HomeAsync.vue",
      name: "default",
      kind: "component",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/Home.loader.ts",
      name: "useHomeLoader",
      kind: "function",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/Home.logic.ts",
      name: "homeViewMode",
      kind: "function",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/Home.strings.ts",
      name: "home",
      kind: "const",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/HomeNavList.vue",
      name: "default",
      kind: "component",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/i18n.ts",
      name: "useReverseT",
      kind: "function",
    },
  ];
  const vueTests = [
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/Home.test.ts",
      full_name: "Home > renders",
    },
    {
      package_name: "@pkg/spa",
      file_path: "spa/pages/home/Home.logic.test.ts",
      full_name: "homeViewMode > list",
    },
  ];

  it("folds same-prefix vue companions and hides Async from nav", () => {
    const nav = buildModuleFileNav(
      vueExports,
      vueTests,
      "@pkg/spa",
      "spa",
      "",
      { vueBundles: true },
    );

    const pages = nav.find((n) => n.label === "pages");
    const homeDir = pages?.children.find((c) => c.label === "home");
    const labels = (homeDir?.children ?? []).map((c) => c.label).sort();
    expect(labels).toEqual(["Home", "HomeNavList"]);
    const home = homeDir?.children.find((c) => c.label === "Home");
    expect(home?.hasVueComponent).toBe(true);
    expect(home?.loadableAsync).toBe(true);
    expect(home?.presence).toBe("both");
    expect(home?.sourceRepoPath).toBe("spa/pages/home/Home.vue");
    expect(nav.find((n) => n.label === "i18n")?.label).toBe("i18n");
  });

  it("merges component and logic tests into the bundle spec tree", () => {
    const cards = buildPackageSpecTree(
      vueExports,
      vueTests,
      "@pkg/spa",
      "spa",
      "",
      { kind: "file", localPath: "pages/home/Home" },
      { vueBundles: true },
    );
    const labels = cards.map((c) => c.label);
    expect(labels).toContain("useHomeLoader");
    expect(labels).toContain("homeViewMode");
    expect(labels).not.toContain("home");
    expect(labels).not.toContain("default");
    expect(labels).not.toContain("title");
    const logic = cards.find((c) => c.label === "homeViewMode");
    expect(logic?.children.some((c) => c.label === "list")).toBe(true);
  });

  it("folds *.logic.ts companions even when the .vue file is missing from exports", () => {
    const nav = buildModuleFileNav(
      [
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.logic.ts",
          name: "initialSameAsMobileChecked",
          kind: "function",
        },
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.strings.ts",
          name: "profile_contact_fields",
          kind: "const",
        },
      ],
      [
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.logic.test.ts",
          full_name: "initialSameAsMobileChecked > starts checked when phones match",
        },
      ],
      "@pkg/spa",
      "spa",
      "",
      { vueBundles: true },
    );
    const fields = nav
      .find((n) => n.label === "components")
      ?.children.find((c) => c.label === "profile-contact-fields")
      ?.children.map((c) => c.label);
    expect(fields).toEqual(["ProfileContactFields"]);
  });

  it("nests describe(functionName) tests under the matching logic export", () => {
    const cards = buildPackageSpecTree(
      [
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.vue",
          name: "default",
          kind: "component",
        },
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.vue",
          name: "contact",
          kind: "model",
        },
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.logic.ts",
          name: "initialSameAsMobileChecked",
          kind: "function",
        },
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.strings.ts",
          name: "profile_contact_fields",
          kind: "const",
        },
      ],
      [
        {
          package_name: "@pkg/spa",
          file_path:
            "spa/components/profile-contact-fields/ProfileContactFields.logic.test.ts",
          full_name:
            "initialSameAsMobileChecked > starts checked when phones match",
          subject_name: "initialSameAsMobileChecked",
        },
      ],
      "@pkg/spa",
      "spa",
      "",
      {
        kind: "file",
        localPath: "components/profile-contact-fields/ProfileContactFields",
      },
      { vueBundles: true },
    );
    expect(cards.map((c) => c.label)).toEqual(["initialSameAsMobileChecked"]);
    expect(cards[0]!.children.map((c) => c.label)).toEqual([
      "starts checked when phones match",
    ]);
  });
});

