import { describe, expect, it } from "vitest";
import {
  fullDocumentForValidation,
  sliceOperation,
  sliceOperationById,
  type OpenApiDoc,
} from "./slice-operation.ts";

const bundled: OpenApiDoc = {
  openapi: "3.1.0",
  info: { title: "t", version: "1" },
  security: [{ session: [] }],
  paths: {
    "/a": { get: { operationId: "getA", responses: {} } },
    "/b": {
      post: {
        operationId: "postB",
        security: [{ session: ["mfa"], org: ["paid"] }],
        responses: {},
      },
    },
    "/c": { get: { operationId: "getC", "x-public": true, responses: {} } },
  },
  components: {
    securitySchemes: {
      session: { type: "apiKey", in: "cookie", name: "s" },
      org: { type: "apiKey", in: "header", name: "X-Org" },
      unused: { type: "apiKey", in: "header", name: "X-Unused" },
    },
  },
};

describe("sliceOperation security", () => {
  it("keeps operation security and copies only the named schemes", () => {
    const slice = sliceOperation(bundled, "/b", "post", "postB");
    expect(slice.paths!["/b"]!.post).toMatchObject({
      security: [{ session: ["mfa"], org: ["paid"] }],
    });
    expect(Object.keys(slice.components!.securitySchemes!).sort()).toEqual([
      "org",
      "session",
    ]);
  });

  it("folds the document-wide default into the operation", () => {
    const slice = sliceOperation(bundled, "/a", "get", "getA");
    expect(slice.paths!["/a"]!.get).toMatchObject({
      security: [{ session: [] }],
    });
    expect(Object.keys(slice.components!.securitySchemes!)).toEqual([
      "session",
    ]);
  });

  it("does not fold the default into x-public operations", () => {
    const slice = sliceOperation(bundled, "/c", "get", "getC");
    expect(slice.paths!["/c"]!.get).toEqual({
      operationId: "getC",
      "x-public": true,
      responses: {},
    });
    expect(slice.components!.securitySchemes).toBeUndefined();
  });
});

describe("fullDocumentForValidation", () => {
  it("gives every slice of a document the same private copy of it", () => {
    const a = sliceOperationById(bundled, "getA");
    const b = sliceOperationById(bundled, "postB");
    const full = fullDocumentForValidation(a);
    expect(full).toEqual(bundled);
    expect(full).not.toBe(bundled);
    expect(fullDocumentForValidation(b)).toBe(full);
  });

  it("leaves the slice's own content unchanged", () => {
    const a = sliceOperationById(bundled, "getA");
    expect(Object.keys(JSON.parse(JSON.stringify(a)))).toEqual(Object.keys(a));
    expect(Object.keys(a.paths ?? {})).toEqual(["/a"]);
  });

  it("is undefined when the document refs another file", () => {
    // e.g. a template's placeholder route, whose file doesn't exist: the
    // whole document can't be resolved, though each real slice can.
    const withStub: OpenApiDoc = {
      ...bundled,
      paths: {
        ...bundled.paths,
        __path__: {
          get: { $ref: "./routes/__name__.yaml#/__operationId__" },
        } as never,
      },
    };
    const a = sliceOperationById(withStub, "getA");
    expect(fullDocumentForValidation(a)).toBeUndefined();
  });

  it("is undefined for a document that isn't a slice", () => {
    expect(fullDocumentForValidation(bundled)).toBeUndefined();
  });
});
