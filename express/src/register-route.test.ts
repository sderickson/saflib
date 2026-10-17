import { describe, expect, it } from "vitest";
import { asOpenApiDocument } from "@saflib/openapi";
import { httpRouteFromOperationSpec } from "./register-route.ts";

describe("httpRouteFromOperationSpec", () => {
  it("reads the single method and path (including OpenAPI→Express params)", () => {
    const spec = asOpenApiDocument({
      openapi: "3.1.0",
      info: { title: "t", version: "1" },
      paths: {
        "/packets/{packetId}": {
          get: { responses: { "200": { description: "ok" } } },
        },
      },
    });

    expect(httpRouteFromOperationSpec(spec)).toEqual({
      method: "get",
      path: "/packets/:packetId",
    });
  });

  it("rejects multi-path specs", () => {
    const spec = asOpenApiDocument({
      openapi: "3.1.0",
      info: { title: "t", version: "1" },
      paths: {
        "/a": { get: { responses: {} } },
        "/b": { post: { responses: {} } },
      },
    });

    expect(() => httpRouteFromOperationSpec(spec)).toThrow(/exactly one path/);
  });
});
