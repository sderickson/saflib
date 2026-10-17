import { describe, expect, it } from "vitest";
import { sliceOperation, type OpenApiDoc } from "./slice-bundled-openapi.ts";

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
