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

function getTransport(): "mock" | TransporterConfig {
  if (
    typedEnv.NODE_ENV === "test" ||
    typedEnv.MOCK_INTEGRATIONS === "true" ||
    typedEnv.NODEMAILER_TRANSPORT_CONFIG === "mock"
  ) {
    return "mock";
  }
  if (!typedEnv.NODEMAILER_TRANSPORT_CONFIG) {
    throw new Error(
      "SMTP configuration error: NODEMAILER_TRANSPORT_CONFIG must be provided.",
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

/**
 * Shared service instance: nodemailer transport from env, or mock when tests / integrations mock.
 */
export const emailService: EmailService = createEmailService({
  type: "nodemailer",
  transport: getTransport(),
});

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

  logger.info("Email: " + (mockingOn ? "MOCKED" : "LIVE"));
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
 * Global instance. Config is driven by environment; services should not create multiple SMTP connections.
 */
export const emailClient = new EmailClient();
