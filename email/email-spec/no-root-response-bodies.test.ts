import { describe, it } from "vitest";
import { assertNoRootResponseBodies } from "@saflib/openapi";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

const ALLOW_ROOT_RESPONSE_BODIES = ["listSentEmails:200"] as const;

describe("no-root-response-bodies", () => {
  it("2xx JSON bodies are keyed envelopes (legacy allowlist)", () => {
    assertNoRootResponseBodies(packageRoot, {
      allow: ALLOW_ROOT_RESPONSE_BODIES,
    });
  });
});
