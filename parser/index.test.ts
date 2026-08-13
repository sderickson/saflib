import { describe, expect, it } from "vitest";
import {
  extractDrizzleTables,
  extractExports,
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
        columns: [
          { propName: "id", sqlName: "id", typeKind: "text" },
          { propName: "commitHash", sqlName: "commit_hash", typeKind: "text" },
          {
            propName: "sourceFiles",
            sqlName: "source_files",
            typeKind: "integer",
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
        columns: [{ propName: "id", sqlName: "id", typeKind: "text" }],
      },
      {
        exportName: "b",
        tableName: "b",
        columns: [{ propName: "name", sqlName: "name", typeKind: "text" }],
      },
    ]);
  });

  it("returns empty when there are no table calls", () => {
    expect(extractDrizzleTables("export const x = 1;\n")).toEqual([]);
  });
});
