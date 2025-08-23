import { createLogger, getSafReporters } from "@saflib/node";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { typedEnv } from "../env.ts";

/**
 * Whether the email client is currently being mocked, and emails are being saved
 * to `sentEmails`.
 */
export const mockingOn =
  (typedEnv.NODE_ENV === "test" || typedEnv.MOCK_INTEGRATIONS === "true") &&
  !typedEnv.NODEMAILER_TRANSPORT_CONFIG;

setImmediate(() => {
  const logger = createLogger({
    subsystemName: "init",
    operationName: "initEmailClient",
  });

  logger.info("Email: " + (mockingOn ? "MOCKED" : "LIVE"));
});

type TransporterConfig = Parameters<typeof nodemailer.createTransport>[0];

/**
 * A record of an email that was sent. Only used for mocking.
 */
export interface SentEmail extends EmailOptions {
  timeSent: number;
}

/**
 * An array of emails that were sent by this service. Only used for mocking.
 */
export const sentEmails: SentEmail[] = [];

/**
 * Accepted options when sending an email. A subset of what nodemailer accepts.
 * See [Nodemailer docs](https://nodemailer.com/message/) for more details.
 */
export interface EmailOptions
  extends Pick<
    nodemailer.SendMailOptions,
    | "to"
    | "cc"
    | "bcc"
    | "subject"
    | "text"
    | "html"
    | "attachments"
    | "from"
    | "replyTo"
  > {}

function getTo(options: EmailOptions): string[] {
  if (Array.isArray(options.to)) {
    return options.to.map((t) => (typeof t === "string" ? t : t.address));
  } else if (typeof options.to === "string") {
    return [options.to];
  } else if (options.to && options.to.address) {
    return [options.to.address];
  } else {
    return [];
  }
}

/**
 * Result of sending an email. This seems to be what is returned by nodemailer when
 * the transport is SMTP. These types may not be correct if configured to use some
 * other transport.
 */
export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

/**
 * A simplified client for sending emails, wrapping around nodemailer (or a mock in during tests).
 */
export class EmailClient {
  private transporter: Transporter | undefined;

  constructor() {
    if (mockingOn) {
      return;
    }

    if (!typedEnv.NODEMAILER_TRANSPORT_CONFIG) {
      throw new Error(
        "SMTP configuration error: NODEMAILER_TRANSPORT_CONFIG must be provided.",
      );
    }

    let config: TransporterConfig;
    try {
      config = JSON.parse(
        typedEnv.NODEMAILER_TRANSPORT_CONFIG,
      ) as TransporterConfig;
    } catch (error) {
      throw new Error(
        "SMTP configuration error: NODEMAILER_TRANSPORT_CONFIG must be valid JSON.",
      );
    }

    this.transporter = nodemailer.createTransport(config);
    if (!this.transporter) {
      throw new Error("Failed to create transporter");
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const { log } = getSafReporters();

    if (!options.to && !options.cc && !options.bcc) {
      throw new Error("No recipients specified");
    }
    if (mockingOn) {
      sentEmails.push({
        ...options,
        timeSent: Date.now(),
      });
      return {
        messageId: "1234567890",
        accepted: getTo(options),
        rejected: [],
        response: "250 2.0.0 OK",
      };
    }

    if (!this.transporter) {
      throw new Error("Transporter not initialized");
    }

    const info = await this.transporter.sendMail(options);

    log.info("Email sent", {
      from: options.from,
      subject: options.subject,
      messageId: info.messageId,
      accepted: info.accepted.length,
      rejected: info.rejected.length,
      response: info.response,
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
      response: info.response,
    };
  }
}

/**
 * Global instance of the email client. Since the config is loaded by the
 * environment, and services shouldn't try to set up multiple SMTP connections,
 * this can be a singleton.
 */
export const emailClient = new EmailClient();
