import { getSafReporters } from "@saflib/node";
import {
  hasSecretStore,
  getSecretStore,
  resetSecretStoreForTests,
  setSecretStore,
} from "@saflib/secret-store";
import { InfisicalSecretStore } from "./InfisicalSecretStore.ts";
import { typedEnv } from "./env.ts";

const MISSING_CREDENTIALS_MESSAGE =
  "[secrets] Infisical credentials are missing — secret fetches will fail. Set INFISICAL_CLIENT_ID + INFISICAL_CLIENT_SECRET (Universal Auth) or INFISICAL_TOKEN in the service env_file (e.g. .env.power-up.secrets).";

/**
 * Initializes the process-level secret store from Infisical env.
 * Credentials, in order of preference:
 * - `INFISICAL_CLIENT_ID` + `INFISICAL_CLIENT_SECRET` — machine identity Universal Auth
 *   (short-lived access tokens, fetched on first use and refreshed when rejected)
 * - `INFISICAL_TOKEN` — static access token (machine identity Token Auth), or `mock`
 *
 * Live modes also need `INFISICAL_PROJECT_ID` and `INFISICAL_ENVIRONMENT`.
 * Idempotent — subsequent calls are no-ops.
 */
export function configureSecretStore(): void {
  if (hasSecretStore()) return;

  const accessToken = (typedEnv.INFISICAL_TOKEN ?? "").trim();
  const clientId = (typedEnv.INFISICAL_CLIENT_ID ?? "").trim();
  const clientSecret = (typedEnv.INFISICAL_CLIENT_SECRET ?? "").trim();
  const projectId = (typedEnv.INFISICAL_PROJECT_ID ?? "").trim();
  const environment = (typedEnv.INFISICAL_ENVIRONMENT ?? "").trim();
  const { log } = getSafReporters();
  const isProduction = typedEnv.NODE_ENV === "production";

  const useUniversalAuth = clientId !== "" && clientSecret !== "";
  if (!useUniversalAuth && (clientId || clientSecret)) {
    log.warn(
      "[secrets] Only one of INFISICAL_CLIENT_ID / INFISICAL_CLIENT_SECRET is set; ignoring Universal Auth.",
    );
  }

  if (!useUniversalAuth && !accessToken) {
    log.error(MISSING_CREDENTIALS_MESSAGE);
    if (isProduction) throw new Error(MISSING_CREDENTIALS_MESSAGE);
  } else if (!useUniversalAuth && accessToken === "mock") {
    log.info(
      "[secrets] Infisical secret store initialized (mock mode). Secrets resolve from process.env or a placeholder.",
    );
  } else {
    const missing: string[] = [];
    if (!projectId) missing.push("INFISICAL_PROJECT_ID");
    if (!environment) missing.push("INFISICAL_ENVIRONMENT");
    if (missing.length > 0) {
      const message = `[secrets] Infisical live mode missing ${missing.join(", ")} — secret fetches will fail. Check that the env file ends with a newline and both vars are present in the container.`;
      log.error(message);
      if (isProduction) throw new Error(message);
    } else {
      const auth = useUniversalAuth
        ? `universal-auth clientId=${clientId.slice(0, 8)}…`
        : `token tokenLen=${accessToken.length}`;
      log.info(
        `[secrets] Infisical secret store initialized (live): environment=${environment} projectId=${projectId.slice(0, 8)}… auth=${auth}`,
      );
    }
  }

  setSecretStore(
    new InfisicalSecretStore(
      useUniversalAuth
        ? { universalAuth: { clientId, clientSecret }, projectId, environment }
        : { accessToken, projectId, environment },
    ),
  );
}

export { getSecretStore, resetSecretStoreForTests };
