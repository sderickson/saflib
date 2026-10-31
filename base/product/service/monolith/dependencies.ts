import { createSecretStore, type SecretStore } from "@saflib/secret-store";
import { getEmailClient } from "@saflib/base-service-common/email";
// BEGIN WORKFLOW AREA integration-imports FOR integrations/init
import { configure__IntegrationName__ } from "@saflib/base-__integration-name__-integration";
// END WORKFLOW AREA

let secretStore: SecretStore | undefined;
let initialized = false;

function ensureSecretStore(): SecretStore {
  if (!secretStore) {
    secretStore = createSecretStore({ type: "env" });
  }
  return secretStore;
}

/**
 * Initializes all process-level dependencies for the base service: secret
 * store, then integration clients that need secrets. The composition root owns
 * this wiring; `integrations/init` adds each integration's configure call.
 *
 * Idempotent — safe to call from multiple entry points (HTTP, cron, CLI).
 * Must be awaited before serving requests.
 */
export async function initializeDependencies(): Promise<void> {
  if (initialized) return;

  ensureSecretStore();

  // BEGIN WORKFLOW AREA integration-configure FOR integrations/init
  await configure__IntegrationName__(ensureSecretStore());
  // END WORKFLOW AREA

  getEmailClient();

  initialized = true;
}
