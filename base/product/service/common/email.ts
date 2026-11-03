import type { EmailService } from "@saflib/email-service";
import { resolveEmailServiceFromEnv } from "@saflib/vendors-brevo";

let emailClient: EmailService | undefined;

/**
 * Shared email service (mock in dev when `BREVO_API_KEY=mock`). An
 * infrastructure handle like the db keys: resolved lazily from the
 * environment, never wired by this package.
 */
export function getEmailClient(): EmailService {
  if (!emailClient) {
    emailClient = resolveEmailServiceFromEnv();
  }
  return emailClient;
}
