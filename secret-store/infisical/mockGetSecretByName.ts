import type { ReturnsError } from "@saflib/monorepo";
import type { InfisicalClientError } from "./errors.ts";

const MOCK_SECRET_VALUE = "mock-secret-value";

/**
 * Mock resolution when `accessToken` is `"mock"`: prefers `process.env[name]`, else a fixed placeholder.
 */
export function mockGetSecretByName(
  name: string,
): ReturnsError<string, InfisicalClientError> {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env &&
    typeof process.env[name] === "string" &&
    process.env[name]!.trim() !== ""
      ? process.env[name]!.trim()
      : null;
  return { result: fromEnv ?? MOCK_SECRET_VALUE };
}
