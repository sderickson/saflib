import {
  hasSecretStore,
  getSecretStore,
  resetSecretStoreForTests,
  setSecretStore,
} from "@saflib/secret-store";
import { InfisicalSecretStore } from "./InfisicalSecretStore.ts";
import { typedEnv } from "./env.ts";

/**
 * Initializes the process-level secret store from Infisical env
 * (`INFISICAL_TOKEN`, `INFISICAL_PROJECT_ID`, `INFISICAL_ENVIRONMENT`).
 * Idempotent — subsequent calls are no-ops.
 */
export function configureSecretStore(): void {
  if (hasSecretStore()) return;
  setSecretStore(
    new InfisicalSecretStore({
      accessToken: typedEnv.INFISICAL_TOKEN ?? "",
      projectId: typedEnv.INFISICAL_PROJECT_ID ?? "",
      environment: typedEnv.INFISICAL_ENVIRONMENT ?? "",
    }),
  );
}

export { getSecretStore, resetSecretStoreForTests };
