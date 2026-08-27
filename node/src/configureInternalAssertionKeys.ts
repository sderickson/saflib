import type { SecretStore } from "@saflib/secret-store";
import { typedEnv } from "../env.ts";
import packageSecrets from "../secrets.json" with { type: "json" };

export const SAF_INTERNAL_ASSERTION_KEYS_NAME = "SAF_INTERNAL_ASSERTION_KEYS";

/**
 * Loads HMAC assertion keys from the secret store when not set in env (prod).
 * Dev sets `SAF_INTERNAL_ASSERTION_KEYS` in env; job tests stub env directly.
 * Prod-local with `INFISICAL_TOKEN=mock` gets the placeholder `"mock"`, which
 * `signAssertion` / `verifyAssertion` accept as a fixed local key.
 */
export async function configureInternalAssertionKeys(
  store: SecretStore,
): Promise<void> {
  if (typedEnv.SAF_INTERNAL_ASSERTION_KEYS?.trim()) {
    return;
  }
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const out = await store.getSecretByName(
    SAF_INTERNAL_ASSERTION_KEYS_NAME,
    packageSecrets,
  );
  if (!out.result || out.result.trim() === "") {
    throw new Error(
      `${SAF_INTERNAL_ASSERTION_KEYS_NAME} not found in secret store and not set in env: ${out.error?.message ?? "empty value"}`,
    );
  }
  process.env.SAF_INTERNAL_ASSERTION_KEYS = out.result.trim();
}
