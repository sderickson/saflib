import { getSafReporters } from "@saflib/node";
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

  const accessToken = (typedEnv.INFISICAL_TOKEN ?? "").trim();
  const projectId = (typedEnv.INFISICAL_PROJECT_ID ?? "").trim();
  const environment = (typedEnv.INFISICAL_ENVIRONMENT ?? "").trim();
  const { log } = getSafReporters();

  if (!accessToken) {
    log.error(
      "[secrets] INFISICAL_TOKEN is missing or empty — secret fetches will fail. Ensure it is set in the service env_file (e.g. .env.power-up.secrets).",
    );
    if (typedEnv.NODE_ENV === "production") {
      throw new Error(
        "[secrets] INFISICAL_TOKEN is missing or empty — secret fetches will fail. Ensure it is set in the service env_file (e.g. .env.power-up.secrets).",
      );
    }
  } else if (accessToken === "mock") {
    log.info(
      "[secrets] Infisical secret store initialized (mock mode). Secrets resolve from process.env or a placeholder.",
    );
  } else {
    const missing: string[] = [];
    if (!projectId) missing.push("INFISICAL_PROJECT_ID");
    if (!environment) missing.push("INFISICAL_ENVIRONMENT");
    if (missing.length > 0) {
      log.error(
        `[secrets] Infisical live mode missing ${missing.join(", ")} — secret fetches will fail. Check that the env file ends with a newline and both vars are present in the container.`,
      );
      if (typedEnv.NODE_ENV === "production") {
        throw new Error(
          "[secrets] INFISICAL_TOKEN is missing or empty — secret fetches will fail. Ensure it is set in the service env_file (e.g. .env.power-up.secrets).",
        );
      }
    } else {
      log.info(
        `[secrets] Infisical secret store initialized (live): environment=${environment} projectId=${projectId.slice(0, 8)}… tokenLen=${accessToken.length}`,
      );
    }
  }

  setSecretStore(
    new InfisicalSecretStore({
      accessToken,
      projectId,
      environment,
    }),
  );
}

export { getSecretStore, resetSecretStoreForTests };
