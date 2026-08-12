import { describe, expect, it } from "vitest";
import { extractExports, extractTestCases } from "./index.ts";

describe("extractExports", () => {
  it("collects function / class / interface / type / const / enum", () => {
    const source = `
      export function greet(name: string) { return name; }
      export class Greeter {}
      export interface Person { name: string }
      export type Id = string;
      export const VERSION = 1;
      export enum Color { Red, Green }
      export let mutable = 0;
    `;
    expect(extractExports(source)).toEqual([
      { name: "greet", kind: "function" },
      { name: "Greeter", kind: "class" },
      { name: "Person", kind: "interface" },
      { name: "Id", kind: "type" },
      { name: "VERSION", kind: "const" },
      { name: "Color", kind: "enum" },
      { name: "mutable", kind: "variable" },
    ]);
  });

  it("collects named export clauses", () => {
    const source = `
      const a = 1;
      const b = 2;
      export { a, b as bee };
    `;
    expect(extractExports(source)).toEqual([
      { name: "a", kind: "variable" },
      { name: "bee", kind: "variable" },
    ]);
  });

  it("ignores non-exported declarations", () => {
    const source = `
      function hidden() {}
      const x = 1;
      export const y = 2;
    `;
    expect(extractExports(source)).toEqual([{ name: "y", kind: "const" }]);
  });

  it("returns an empty array when there are no exports", () => {
    expect(extractExports("const x = 1;\n")).toEqual([]);
    expect(extractExports("")).toEqual([]);
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
