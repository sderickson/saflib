import { describe, it } from "vitest";
import { assertNoFkCascades } from "@saflib/drizzle";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("no-fk-cascades", () => {
  it("migrations and schemas must not use ON DELETE/UPDATE CASCADE", () => {
    assertNoFkCascades(packageRoot);
  });
});
