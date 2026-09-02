import { describe, it } from "vitest";
import { assertNoRootResponseBodies } from "@saflib/openapi";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Legacy jobs-demo routes $ref named result schemas at the root.
 * Remove entries when inlined as keyed envelopes.
 */
const ALLOW_ROOT_RESPONSE_BODIES = [
  "startJobsDemo:200",
  "jobsDemoStepB:200",
  "jobsDemoStepC:200",
] as const;

describe("no-root-response-bodies", () => {
  it("2xx JSON bodies are keyed envelopes (legacy allowlist)", () => {
    assertNoRootResponseBodies(packageRoot, {
      allow: ALLOW_ROOT_RESPONSE_BODIES,
    });
  });
});
