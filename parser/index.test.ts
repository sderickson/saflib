import { describe, expect, it } from "vitest";
import { extractExports, extractTestCases } from "./index.ts";

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

  it("skips non-string titles and *.each", () => {
    const source = `
      describe("ok", () => {
        it(nameOfThing, () => {});
        it.each([1, 2])("param %s", () => {});
        it("kept", () => {});
      });
    `;
    expect(extractTestCases(source).map((t) => t.fullName)).toEqual([
      "ok > kept",
    ]);
  });

  it("returns an empty array when there are no tests", () => {
    expect(extractTestCases("export const x = 1;\n")).toEqual([]);
    expect(extractTestCases("")).toEqual([]);
  });
});
