import { describe, expect, it } from "vitest";
import {
  exportGlobForTopLevelSegment,
  importsFromExports,
  prepareNewPackageExports,
  resolveExportModulePathLayout,
  stripTemplateExportPlaceholders,
  upsertPackageExportForModule,
  upsertPackageJsonExportsForModule,
} from "./package-exports.ts";

describe("exportGlobForTopLevelSegment", () => {
  it("maps the first folder segment to a glob export", () => {
    expect(exportGlobForTopLevelSegment("lib")).toEqual({
      key: "./lib/*",
      value: "./lib/*.ts",
    });
  });
});

describe("stripTemplateExportPlaceholders", () => {
  it("removes placeholder export keys and values", () => {
    expect(
      stripTemplateExportPlaceholders({
        "./__group-name__/*": "./__group-name__/*.ts",
        "./lib/*": "./lib/*.ts",
      }),
    ).toEqual({
      "./lib/*": "./lib/*.ts",
    });
  });
});

describe("resolveExportModulePathLayout", () => {
  it("requires a thematic folder for arbitrary root modules", () => {
    expect(() => resolveExportModulePathLayout("helpers", "helpers")).toThrow(
      /thematic subfolder/,
    );
  });

  it("allows allowlisted root modules", () => {
    expect(resolveExportModulePathLayout("client", "client")).toEqual({
      topLevelSegment: "client",
      useGlob: false,
    });
  });

  it("uses the first path segment for nested modules", () => {
    expect(resolveExportModulePathLayout("lib/utils", "format")).toEqual({
      topLevelSegment: "lib",
      useGlob: true,
    });
  });
});

describe("upsertPackageExportForModule", () => {
  it("adds a glob export for folder modules", () => {
    expect(upsertPackageExportForModule({}, "lib", "starter")).toEqual({
      "./lib/*": "./lib/*.ts",
    });
  });

  it("does not duplicate an existing glob export", () => {
    const existing = { "./lib/*": "./lib/*.ts" };
    expect(upsertPackageExportForModule(existing, "lib/utils", "format")).toBe(
      existing,
    );
  });

  it("adds an explicit export for allowlisted root modules", () => {
    expect(upsertPackageExportForModule({}, "client", "client")).toEqual({
      "./client": "./client.ts",
    });
  });
});

describe("importsFromExports", () => {
  it("uses only #* when exports has a root glob (no redundant folder globs)", () => {
    expect(
      importsFromExports({
        "./*": "./*.ts",
        "./lib/*": "./lib/*.ts",
        "./matter-pipeline": "./matter-pipeline/index.ts",
        "./env": "./env.ts",
      }),
    ).toEqual({
      "#*": "./*",
      "#matter-pipeline": "./matter-pipeline/index.ts",
    });
  });

  it("lists thematic folders and root files when there is no #* catch-all", () => {
    expect(
      importsFromExports({
        "./assets/*": "./assets/*.ts",
        "./clients": "./clients/index.ts",
        "./clients/*": "./clients/*.ts",
        "./i18n": "./i18n.ts",
        "./vuetify-config": "./vuetify-config.ts",
      }),
    ).toEqual({
      "#assets/*": "./assets/*",
      "#clients": "./clients/index.ts",
      "#clients/*": "./clients/*",
      "#i18n.ts": "./i18n.ts",
      "#vuetify-config.ts": "./vuetify-config.ts",
    });
  });

  it("remaps #* when exports ./* points into a subdirectory", () => {
    expect(importsFromExports({ "./*": "./emails/*.ts" })).toEqual({
      "#*": "./emails/*",
    });
  });

  it("skips dist remaps and does not invent a catch-all", () => {
    expect(
      importsFromExports({
        "./operations/*": "./dist/operations/*/index.ts",
      }),
    ).toEqual({});
  });

  it("derives thematic globs from nested leaf exports", () => {
    expect(
      importsFromExports({
        "./http": "./http.ts",
        "./testing/slim-route-test": "./testing/slim-route-test.ts",
        "./handlers/*": "./handlers/*.ts",
      }),
    ).toEqual({
      "#handlers/*": "./handlers/*",
      "#http.ts": "./http.ts",
      "#testing/*": "./testing/*",
    });
  });
});

describe("package.json helpers", () => {
  it("prepareNewPackageExports strips placeholders and syncs imports", () => {
    expect(
      prepareNewPackageExports({
        name: "@scope/pkg",
        exports: {
          "./__group-name__/*": "./__group-name__/*.ts",
        },
        imports: {
          "#*": "./*",
          "#__group-name__/*": "./__group-name__/*",
        },
      }),
    ).toEqual({
      name: "@scope/pkg",
      exports: {},
      imports: {},
    });
  });

  it("upsertPackageJsonExportsForModule merges exports and imports", () => {
    expect(
      upsertPackageJsonExportsForModule(
        {
          name: "@scope/pkg",
          exports: {},
        },
        "http",
        "headers",
      ),
    ).toEqual({
      name: "@scope/pkg",
      exports: {
        "./http/*": "./http/*.ts",
      },
      imports: {
        "#http/*": "./http/*",
      },
    });
  });
});
