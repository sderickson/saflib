import type { EmailService } from "@saflib/email-service";
import { createSecretStore, type SecretStore } from "@saflib/secret-store";
import { resolveEmailServiceFromEnv } from "@saflib/vendors-brevo";
// BEGIN WORKFLOW AREA integration-imports FOR integrations/init
import { configure__IntegrationName__ } from "@saflib/base-__integration-name__-integration";
// END WORKFLOW AREA

let secretStore: SecretStore | undefined;
let initialized = false;
let emailClient: EmailService | undefined;

function configureSecretStore(): void {
  if (secretStore) return;
  secretStore = createSecretStore({ type: "env" });
}

function getSecretStore(): SecretStore {
  if (!secretStore) {
    throw new Error(
      "Secret store not initialized. Call configureSecretStore() first.",
    );
  }
  return secretStore;
}

/**
 * Initializes all process-level dependencies for the base service:
 * secret store, then integration clients that need secrets.
 *
 * Idempotent — safe to call from multiple entry points (HTTP, cron, CLI).
 * Must be awaited before serving requests.
 */
export async function initializeDependencies(): Promise<void> {
  if (initialized) return;

  configureSecretStore();

  // BEGIN WORKFLOW AREA integration-configure FOR integrations/init
  await configure__IntegrationName__(getSecretStore());
  // END WORKFLOW AREA

  emailClient = resolveEmailServiceFromEnv();

  initialized = true;
}

/** Shared email service (mock in dev when `BREVO_API_KEY=mock`). */
export function getEmailClient(): EmailService {
  if (!emailClient) {
    emailClient = resolveEmailServiceFromEnv();
  }
  return emailClient;
}
