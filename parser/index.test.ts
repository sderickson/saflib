import { describe, expect, it } from "vitest";
import {
  extractDrizzleTables,
  extractExports,
  extractImports,
  extractLocalExportUsages,
  extractTestCases,
} from "./index.ts";

describe("extractExports", () => {
  it("collects function / class / interface / type / const / enum with signatures", () => {
    const source = `
      export function greet(name: string) { return name; }
      export class Greeter { constructor(public x: number) {} }
      export interface Person { name: string }
      export type Id = string;
      export const VERSION = 1;
      export enum Color { Red, Green }
      export let mutable = 0;
    `;
    expect(extractExports(source)).toEqual([
      {
        name: "greet",
        kind: "function",
        signature: "(name: string)",
        docstring: null,
      },
      {
        name: "Greeter",
        kind: "class",
        signature: "constructor(public x: number)",
        docstring: null,
      },
      {
        name: "Person",
        kind: "interface",
        signature: "{ name: string }",
        docstring: null,
      },
      { name: "Id", kind: "type", signature: "= string", docstring: null },
      { name: "VERSION", kind: "const", signature: "= 1", docstring: null },
      { name: "Color", kind: "enum", signature: "{ Red, Green }", docstring: null },
      { name: "mutable", kind: "variable", signature: "= 0", docstring: null },
    ]);
  });

  it("captures arrow-const function signatures", () => {
    const source = `
      export const add = (a: number, b: number): number => a + b;
    `;
    expect(extractExports(source)).toEqual([
      {
        name: "add",
        kind: "const",
        signature: "(a: number, b: number): number",
        docstring: null,
      },
    ]);
  });

  it("collects named export clauses with null signature", () => {
    const source = `
      const a = 1;
      const b = 2;
      export { a, b as bee };
    `;
    expect(extractExports(source)).toEqual([
      { name: "a", kind: "variable", signature: null, docstring: null },
      { name: "bee", kind: "variable", signature: null, docstring: null },
    ]);
  });

  it("ignores non-exported declarations", () => {
    const source = `
      function hidden() {}
      const x = 1;
      export const y = 2;
    `;
    expect(extractExports(source)).toEqual([
      { name: "y", kind: "const", signature: "= 2", docstring: null },
    ]);
  });

  it("returns an empty array when there are no exports", () => {
    expect(extractExports("const x = 1;\n")).toEqual([]);
    expect(extractExports("")).toEqual([]);
  });

  it("extracts first prose line of leading JSDoc", () => {
    const source = `
      /**
       * Greets someone by name.
       * @param name who to greet
       */
      export function greet(name: string) { return name; }

      /** Version constant. */
      export const VERSION = 1;

      /**
       * @deprecated
       */
      export type Id = string;
    `;
    expect(extractExports(source)).toEqual([
      {
        name: "greet",
        kind: "function",
        signature: "(name: string)",
        docstring: "Greets someone by name.",
      },
      {
        name: "VERSION",
        kind: "const",
        signature: "= 1",
        docstring: "Version constant.",
      },
      {
        name: "Id",
        kind: "type",
        signature: "= string",
        docstring: null,
      },
    ]);
  });
});

describe("extractTestCases", () => {
  it("nests describe titles onto it/test with ' > '", () => {
    const source = `
      describe("outer", () => {
        describe("inner", () => {
          it("does the thing", () => {});
          test("also counts", () => {});
        });
        it("top of outer", () => {});
      });
    `;
    expect(extractTestCases(source).map((t) => t.fullName)).toEqual([
      "outer > inner > does the thing",
      "outer > inner > also counts",
      "outer > top of outer",
    ]);
  });

  it("includes it.skip / it.only / describe.skip (still declared tests)", () => {
    const source = `
      describe.skip("skipped suite", () => {
        it("inside skipped", () => {});
      });
      describe("active", () => {
        it.only("focused", () => {});
        it.skip("parked", () => {});
        test.only("focused test", () => {});
      });
    `;
    expect(extractTestCases(source).map((t) => t.fullName)).toEqual([
      "skipped suite > inside skipped",
      "active > focused",
      "active > parked",
      "active > focused test",
    ]);
  });

  it("skips non-string titles", () => {
    const source = `
      describe("ok", () => {
        it(nameOfThing, () => {});
        it("kept", () => {});
      });
    `;
    expect(extractTestCases(source).map((t) => t.fullName)).toEqual([
      "ok > kept",
    ]);
  });

  it("inventories *.each title templates (does not expand rows)", () => {
    const source = `
      describe("parsePdfFormFields", () => {
        it.each(SHIPPED_LINEAGES)(
          "matches committed schema for %s",
          async (lineageKey) => {},
        );
        test.each([1, 2])("param %s", () => {});
      });
      describe.each(TABLE)("suite %s", () => {
        it("inside", () => {});
      });
    `;
    expect(extractTestCases(source).map((t) => t.fullName)).toEqual([
      "parsePdfFormFields > matches committed schema for %s",
      "parsePdfFormFields > param %s",
      "suite %s > inside",
    ]);
  });

  it("returns an empty array when there are no tests", () => {
    expect(extractTestCases("export const x = 1;\n")).toEqual([]);
    expect(extractTestCases("")).toEqual([]);
  });
});

describe("extractDrizzleTables", () => {
  it("extracts sqliteTable name, export binding, and columns", () => {
    const source = `
      import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
      export const packageMetricsTable = sqliteTable("package_metrics", {
        id: text("id").primaryKey(),
        commitHash: text("commit_hash").notNull(),
        sourceFiles: integer("source_files").notNull(),
      });
    `;
    expect(extractDrizzleTables(source)).toEqual([
      {
        exportName: "packageMetricsTable",
        tableName: "package_metrics",
        docstring: null,
        columns: [
          {
            propName: "id",
            sqlName: "id",
            typeKind: "text",
            docstring: null,
          },
          {
            propName: "commitHash",
            sqlName: "commit_hash",
            typeKind: "text",
            docstring: null,
          },
          {
            propName: "sourceFiles",
            sqlName: "source_files",
            typeKind: "integer",
            docstring: null,
          },
        ],
      },
    ]);
  });

  it("extracts multiple tables and ignores third-arg index callbacks", () => {
    const source = `
      export const a = sqliteTable("a", {
        id: text("id").primaryKey(),
      }, (table) => [index("a_idx").on(table.id)]);
      export const b = sqliteTable("b", {
        name: text("name"),
      });
    `;
    expect(extractDrizzleTables(source)).toEqual([
      {
        exportName: "a",
        tableName: "a",
        docstring: null,
        columns: [
          {
            propName: "id",
            sqlName: "id",
            typeKind: "text",
            docstring: null,
          },
        ],
      },
      {
        exportName: "b",
        tableName: "b",
        docstring: null,
        columns: [
          {
            propName: "name",
            sqlName: "name",
            typeKind: "text",
            docstring: null,
          },
        ],
      },
    ]);
  });

  it("returns empty when there are no table calls", () => {
    expect(extractDrizzleTables("export const x = 1;\n")).toEqual([]);
  });

  it("extracts table and column JSDoc, with Entity interface fallback", () => {
    const source = `
      export interface PackageMetricsEntity {
        id: string;
        /** Number of source files in the package. */
        source_files: number;
      }

      /** Per-package LOC and file counts for one analyzed commit. */
      export const packageMetricsTable = sqliteTable("package_metrics", {
        id: text("id").primaryKey(),
        /** Commit that owns this row. */
        commitHash: text("commit_hash").notNull(),
        sourceFiles: integer("source_files").notNull(),
      });
    `;
    expect(extractDrizzleTables(source)).toEqual([
      {
        exportName: "packageMetricsTable",
        tableName: "package_metrics",
        docstring: "Per-package LOC and file counts for one analyzed commit.",
        columns: [
          {
            propName: "id",
            sqlName: "id",
            typeKind: "text",
            docstring: null,
          },
          {
            propName: "commitHash",
            sqlName: "commit_hash",
            typeKind: "text",
            docstring: "Commit that owns this row.",
          },
          {
            propName: "sourceFiles",
            sqlName: "source_files",
            typeKind: "integer",
            docstring: "Number of source files in the package.",
          },
        ],
      },
    ]);
  });
});

describe("extractImports", () => {
  it("collects named, default, namespace, and side-effect imports", () => {
    const source = `
      import { createMatter, getByIdMatter as get } from "@acme/product-db/queries/matter/create";
      import def from "./local.ts";
      import * as ns from "../other/index.ts";
      import "./side-effect.ts";
      export { x } from "@scope/pkg/queries/foo/bar";
      export * from "./reexport.ts";
    `;
    expect(extractImports(source)).toEqual([
      { specifier: "../other/index.ts", names: ["*"] },
      { specifier: "./local.ts", names: ["default"] },
      { specifier: "./reexport.ts", names: ["*"] },
      { specifier: "./side-effect.ts", names: [] },
      {
        specifier: "@acme/product-db/queries/matter/create",
        names: ["createMatter", "getByIdMatter"],
      },
      { specifier: "@scope/pkg/queries/foo/bar", names: ["x"] },
    ]);
  });

  it("returns empty when there are no imports", () => {
    expect(extractImports("export const x = 1;\n")).toEqual([]);
  });
});

describe("extractLocalExportUsages", () => {
  it("returns empty when an export is never referenced as a value", () => {
    const source = `
      export function unused() { return 1; }
      export const ALSO = 2;
    `;
    expect(extractLocalExportUsages(source)).toEqual([]);
  });

  it("detects same-file calls of an exported function", () => {
    const source = `
      export function helper(n: number) { return n + 1; }
      export function main() { return helper(1); }
    `;
    expect(extractLocalExportUsages(source)).toEqual(["helper"]);
  });

  it("detects recursive self-calls", () => {
    const source = `
      export function fact(n: number): number {
        return n <= 1 ? 1 : n * fact(n - 1);
      }
    `;
    expect(extractLocalExportUsages(source)).toEqual(["fact"]);
  });

  it("ignores property names that match an export", () => {
    const source = `
      export const helper = 1;
      export const obj = { helper: 2 };
      export const access = ({ x }: { helper: number }) => x;
    `;
    expect(extractLocalExportUsages(source)).toEqual([]);
  });

  it("counts shorthand property values", () => {
    const source = `
      export const helper = 1;
      export function pack() { return { helper }; }
    `;
    expect(extractLocalExportUsages(source)).toEqual(["helper"]);
  });

  it("handles export { name } without counting the clause as a use", () => {
    const source = `
      function helper() { return 1; }
      export { helper };
    `;
    expect(extractLocalExportUsages(source)).toEqual([]);
  });
});
