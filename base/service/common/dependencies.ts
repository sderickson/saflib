import type { EmailService } from "@saflib/email-service";
import { resolveEmailServiceFromEnv } from "@saflib/vendors-brevo";
import { configureSecretStore } from "./secrets.ts";
// BEGIN WORKFLOW AREA integration-imports FOR integrations/init
import { getSecretStore } from "./secrets.ts";
import { configure__IntegrationName__ } from "@saflib/base-__integration-name__-integration";
// END WORKFLOW AREA

let initialized = false;
let emailClient: EmailService | undefined;

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
