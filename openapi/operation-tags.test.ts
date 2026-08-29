import { describe, it, expect } from "vitest";
import {
  OPENAPI_ENFORCED_TAGS,
  OPENAPI_TAG_BACKGROUND,
  OPENAPI_TAG_NO_AUTH,
  assertOpenApiOperationTags,
  findUnknownOpenApiOperationTags,
} from "./operation-tags.ts";

describe("assertOpenApiOperationTags", () => {
  it("allows only enforced tags", () => {
    expect(() =>
      assertOpenApiOperationTags({
        paths: {
          "/x": {
            get: {
              operationId: "getX",
              tags: [OPENAPI_TAG_NO_AUTH, OPENAPI_TAG_BACKGROUND],
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it("rejects grouping and unknown tags", () => {
    const violations = findUnknownOpenApiOperationTags({
      paths: {
        "/x": {
          post: {
            operationId: "postX",
            tags: ["jobs", "email-verified", "typo-admin"],
          },
        },
      },
    });
    expect(violations.map((v) => v.tag).sort()).toEqual(["jobs", "typo-admin"]);
    expect(() =>
      assertOpenApiOperationTags({
        paths: {
          "/x": {
            post: { operationId: "postX", tags: ["jobs"] },
          },
        },
      }),
    ).toThrow(/unknown tag "jobs"/);
  });

  it("catalog covers every enforced tag", async () => {
    const { OPENAPI_ENFORCED_TAG_CATALOG } = await import("./operation-tags.ts");
    expect(OPENAPI_ENFORCED_TAG_CATALOG.map((c) => c.tag).sort()).toEqual(
      [...OPENAPI_ENFORCED_TAGS].sort(),
    );
  });
});
