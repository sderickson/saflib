import type { EmailService } from "@saflib/email-service";
import { createEmailService } from "./createEmailService.ts";

/** Shared email service for monolith HTTP routers and product code. */
export function resolveEmailServiceFromEnv(): EmailService {
  if (process.env.NODE_ENV === "test") {
    return createEmailService("mock");
  }
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey || apiKey === "mock") {
    return createEmailService("mock");
  }
  return createEmailService(apiKey);
}
