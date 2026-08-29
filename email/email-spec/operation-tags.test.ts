import { describe, it } from "vitest";
import { assertOpenApiRouteFileTags } from "@saflib/openapi";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

describe("operation-tags", () => {
  it("only uses enforced OpenAPI operation tags", () => {
    assertOpenApiRouteFileTags(packageRoot);
  });
});
