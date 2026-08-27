import { BrevoEmailService } from "./BrevoEmailService.ts";
import type { EmailService } from "@saflib/email-service";

/**
 * Creates a Brevo-backed email service. Pass `"mock"` to record sends in
 * the shared in-memory mock store without calling the API.
 */
export function createEmailService(apiKey: string | "mock"): EmailService {
  return new BrevoEmailService(apiKey);
}

/** Alias matching the Infisical-style vendor factory naming. */
export const createBrevoEmailService = createEmailService;
