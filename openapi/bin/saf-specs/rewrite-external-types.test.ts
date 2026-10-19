import { describe, expect, it } from "vitest";
import { rewriteExternalSchemaTypes } from "./rewrite-external-types.ts";

const ext = (schemaName: string) =>
  new Map([[schemaName, { packageName: "@x/objects", schemaName }]]);

describe("rewriteExternalSchemaTypes", () => {
  it("replaces quoted top-level keys and ignores apostrophes in comments", () => {
    const dts = `export interface components {
    schemas: {
        /** @description Don't trip on the apostrophe. */
        Foo: components["schemas"]["flat-thing"];
        "flat-thing": {
            /** @description It's a value. */
            value?: string;
        };
        value: {
            n?: number;
        };
    };
}`;
    const out = rewriteExternalSchemaTypes(dts, ext("flat-thing"));
    expect(out).toContain(
      'import type { FlatThing as _Ext0_flat_thing } from "@x/objects/schemas/flat-thing";',
    );
    expect(out).toContain('"flat-thing": _Ext0_flat_thing;');
    expect(out).toContain("value: {");
  });

  it("does not replace nested properties that share the schema's name", () => {
    const dts = `export interface components {
    schemas: {
        Row: {
            value?: string;
        };
        value: {
            n?: number;
        };
    };
}`;
    const out = rewriteExternalSchemaTypes(dts, ext("value"));
    expect(out).toContain("value?: string;");
    expect(out).toContain("value: _Ext0_value;");
  });

  it("omits imports for schemas it did not replace", () => {
    const out = rewriteExternalSchemaTypes(
      "export interface components {\n    schemas: {\n        A: string;\n    };\n}",
      ext("Missing"),
    );
    expect(out).not.toContain("import type");
  });
});
