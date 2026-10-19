import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  jsonSpecModuleSource,
  omitExternalComponents,
} from "./external-bundles.ts";

function fixture(owner: {
  schemas: Record<string, unknown>;
  exportsJsonSpec: boolean;
}): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "saf-owner-"));
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "@fixture/objects",
      exports: owner.exportsJsonSpec
        ? { "./json-spec": "./dist/json-spec.ts" }
        : {},
    }),
  );
  mkdirSync(path.join(root, "dist"));
  writeFileSync(
    path.join(root, "dist", "openapi.json"),
    JSON.stringify({ components: { schemas: owner.schemas } }),
  );
  const cwd = mkdtempSync(path.join(os.tmpdir(), "saf-spec-"));
  writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "s" }));
  mkdirSync(path.join(cwd, "node_modules", "@fixture"), { recursive: true });
  symlinkSync(root, path.join(cwd, "node_modules", "@fixture", "objects"));
  return cwd;
}

const ownerSchemas = {
  address: {
    type: "object",
    properties: { country: { $ref: "#/components/schemas/country" } },
  },
  country: { type: "string" },
  status: { type: "string", enum: ["a"] },
};

describe("omitExternalComponents", () => {
  it("omits components identical to the owner's, including what they reference", () => {
    const cwd = fixture({ schemas: ownerSchemas, exportsJsonSpec: true });
    const { slim, owners } = omitExternalComponents({
      cwd,
      packageNames: ["@fixture/objects"],
      bundled: {
        openapi: "3.0.0",
        components: {
          schemas: {
            ...ownerSchemas,
            status: { type: "string", enum: ["a", "b"] },
            local: { $ref: "#/components/schemas/address" },
          },
        },
      },
    });
    expect([...owners.keys()].sort()).toEqual(["address", "country"]);
    expect(slim).toEqual({
      openapi: "3.0.0",
      components: {
        schemas: {
          status: { type: "string", enum: ["a", "b"] },
          local: { $ref: "#/components/schemas/address" },
        },
      },
      "x-saf-external-components": {
        address: "@fixture/objects",
        country: "@fixture/objects",
      },
    });
  });

  it("keeps a component whose reference differs from the owner's", () => {
    const cwd = fixture({ schemas: ownerSchemas, exportsJsonSpec: true });
    const { owners } = omitExternalComponents({
      cwd,
      packageNames: ["@fixture/objects"],
      bundled: {
        components: {
          schemas: { ...ownerSchemas, country: { type: "integer" } },
        },
      },
    });
    expect([...owners.keys()]).toEqual(["status"]);
  });

  it("ignores packages without a json-spec export", () => {
    const cwd = fixture({ schemas: ownerSchemas, exportsJsonSpec: false });
    const bundled = { components: { schemas: { ...ownerSchemas } } };
    const { slim, owners } = omitExternalComponents({
      cwd,
      packageNames: ["@fixture/objects"],
      bundled,
    });
    expect(owners.size).toBe(0);
    expect(slim).toBe(bundled);
  });
});

describe("jsonSpecModuleSource", () => {
  it("merges owners' documents only when there are any", () => {
    expect(jsonSpecModuleSource([])).not.toContain("mergeExternalComponents");
    const source = jsonSpecModuleSource(["@b/x", "@a/y", "@b/x"]);
    expect(source).toContain(
      'import { jsonSpec as owner0 } from "@a/y/json-spec";',
    );
    expect(source).toContain('"@b/x": owner1,');
  });
});
