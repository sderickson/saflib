import type { SecretStore } from "@saflib/secret-store";
import { getSafReporters } from "@saflib/node";
import type { EmailService } from "@saflib/email-service";
import { createEmailService } from "./createEmailService.ts";
import packageSecrets from "./secrets.json" with { type: "json" };

export const BREVO_API_KEY_NAME = "BREVO_API_KEY";

/**
 * Resolves a Brevo-backed {@link EmailService} from the secret store using
 * this package's `secrets.json`. Missing/empty secrets fall back to mock.
 */
export async function configureEmail(store: SecretStore): Promise<EmailService> {
  const out = await store.getSecretByName(BREVO_API_KEY_NAME, packageSecrets);
  let apiKey: string | "mock";
  if (out.result !== undefined && out.result.trim() !== "") {
    apiKey = out.result.trim();
  } else {
    const { log } = getSafReporters();
    log.warn(
      "[email] BREVO_API_KEY not found in secret store, using mock",
      out.error?.message ? { err: out.error.message } : undefined,
    );
    apiKey = "mock";
  }

  const client = createEmailService(apiKey);
  const { log } = getSafReporters();
  log.info(`emailClient made with apiKey: ${apiKey.slice(0, 16) + "..."}`);
  return client;
}
