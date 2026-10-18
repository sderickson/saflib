import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findSharedExternalComponents } from "./shared-external-components.ts";

function objectsPackage(schemas: Record<string, unknown>): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "saf-objects-"));
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "@fixture/objects" }),
  );
  mkdirSync(path.join(root, "dist", "schemas"), { recursive: true });
  writeFileSync(
    path.join(root, "dist", "openapi.json"),
    JSON.stringify({ components: { schemas } }),
  );
  for (const name of Object.keys(schemas)) {
    mkdirSync(path.join(root, "dist", "schemas", name));
    writeFileSync(
      path.join(root, "dist", "schemas", name, "index.ts"),
      `export type ${name.replace(/-/g, "_")} = components["schemas"]["${name}"];\n`,
    );
  }
  // Resolvable from `cwd` via node_modules.
  const cwd = mkdtempSync(path.join(os.tmpdir(), "saf-spec-"));
  mkdirSync(path.join(cwd, "node_modules", "@fixture"), { recursive: true });
  writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "s" }));
  return JSON.stringify({ root, cwd });
}

describe("findSharedExternalComponents", () => {
  it("matches hoisted components whose references are named differently", () => {
    const { root, cwd } = JSON.parse(
      objectsPackage({
        CountryCode: { $ref: "#/components/schemas/country-code" },
        "country-code": { type: "string", pattern: "^[A-Z]{2}$" },
        profile: {
          type: "object",
          properties: { country: { $ref: "#/components/schemas/CountryCode" } },
        },
      }),
    ) as { root: string; cwd: string };
    symlinkSync(root, path.join(cwd, "node_modules", "@fixture", "objects"));

    const found = findSharedExternalComponents({
      cwd,
      externalSchemas: new Map([
        [
          "CountryCode",
          { packageName: "@fixture/objects", schemaName: "CountryCode" },
        ],
      ]),
      bundledSchemas: {
        CountryCode: { $ref: "#/components/schemas/country-code" },
        "country-code": { type: "string", pattern: "^[A-Z]{2}$" },
        profile: {
          type: "object",
          properties: {
            country: { $ref: "#/components/schemas/country-code" },
          },
        },
        different: { type: "number" },
      },
    });
    expect([...found.keys()].sort()).toEqual(["country-code", "profile"]);
  });

  it("does not match a same-named component with a different schema", () => {
    const { root, cwd } = JSON.parse(
      objectsPackage({ value: { type: "string" } }),
    ) as { root: string; cwd: string };
    symlinkSync(root, path.join(cwd, "node_modules", "@fixture", "objects"));
    const found = findSharedExternalComponents({
      cwd,
      externalSchemas: new Map([
        ["Other", { packageName: "@fixture/objects", schemaName: "Other" }],
      ]),
      bundledSchemas: { value: { type: "number" } },
    });
    expect(found.size).toBe(0);
  });
});
