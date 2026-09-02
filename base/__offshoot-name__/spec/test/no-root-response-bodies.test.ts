import { describe, it } from "vitest";
import { assertNoRootResponseBodies } from "@saflib/openapi";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("no-root-response-bodies", () => {
  it("2xx JSON bodies are keyed envelopes", () => {
    assertNoRootResponseBodies(packageRoot);
  });
});
