import { BrevoEmailService } from "./brevo/BrevoEmailService.ts";
import type { EmailService } from "./EmailService.ts";

/**
 * Creates a Brevo-backed email service. Pass `"mock"` to record sends in
 * {@link sentEmails} without calling the API.
 */
export function createEmailService(apiKey: string | "mock"): EmailService {
  return new BrevoEmailService(apiKey);
}
