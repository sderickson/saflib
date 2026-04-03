import { createLogger } from "@saflib/node";
import {
  createEmailService,
  type EmailOptions,
  type EmailResult,
  type SentEmail,
  sentEmails,
  type EmailService,
} from "@saflib/email-service";
import type * as nodemailer from "nodemailer";
import { typedEnv } from "../env.ts";

export type { EmailOptions, EmailResult, EmailService, SentEmail };

type TransporterConfig = Parameters<typeof nodemailer.createTransport>[0];

function shouldMockEmail(): boolean {
  return (
    typedEnv.NODE_ENV === "test" ||
    typedEnv.MOCK_INTEGRATIONS === "true" ||
    typedEnv.NODEMAILER_TRANSPORT_CONFIG === "mock" ||
    typedEnv.BREVO_API_KEY === "mock"
  );
}

function parseSmtpTransportConfig(): TransporterConfig {
  if (!typedEnv.NODEMAILER_TRANSPORT_CONFIG) {
    throw new Error(
      "Email: set BREVO_API_KEY for Brevo, or NODEMAILER_TRANSPORT_CONFIG (JSON) for SMTP.",
    );
  }
  try {
    return JSON.parse(
      typedEnv.NODEMAILER_TRANSPORT_CONFIG,
    ) as TransporterConfig;
  } catch {
    throw new Error(
      "SMTP configuration error: NODEMAILER_TRANSPORT_CONFIG must be valid JSON.",
    );
  }
}

function createResolvedEmailService(): EmailService {
  if (shouldMockEmail()) {
    return createEmailService({ type: "nodemailer", transport: "mock" });
  }

  const brevoKey = typedEnv.BREVO_API_KEY?.trim();
  if (brevoKey) {
    return createEmailService({ type: "brevo", apiKey: brevoKey });
  }

  return createEmailService({
    type: "nodemailer",
    transport: parseSmtpTransportConfig(),
  });
}

/**
 * Shared service instance: Brevo (if `BREVO_API_KEY`), else nodemailer from env, or mock in tests / `MOCK_INTEGRATIONS`.
 */
export const emailService: EmailService = createResolvedEmailService();

/**
 * Whether the email client is currently being mocked, and emails are being saved
 * to `sentEmails`.
 */
export const mockingOn = emailService.isMocked;

setImmediate(() => {
  const logger = createLogger({
    subsystemName: "init",
    operationName: "initEmailClient",
  });

  const backend =
    !mockingOn && typedEnv.BREVO_API_KEY?.trim()
      ? "Brevo"
      : mockingOn
        ? "MOCKED"
        : "SMTP (nodemailer)";
  logger.info(`Email: ${backend}`);
});

export { sentEmails };

/**
 * A simplified client for sending emails, wrapping the shared {@link emailService}.
 */
export class EmailClient {
  constructor(private readonly service: EmailService = emailService) {}

  sendEmail(options: EmailOptions): Promise<EmailResult> {
    return this.service.sendEmail(options);
  }
}

/**
 * Global instance. Config is driven by environment; services should not create multiple SMTP/API connections.
 */
export const emailClient = new EmailClient();
