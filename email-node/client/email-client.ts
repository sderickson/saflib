import { getSafReporters } from "@saflib/node";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { typedEnv } from "../env.ts";

export const mockingOn =
  typedEnv.NODE_ENV === "test" || typedEnv.MOCK_INTEGRATIONS === "true";

export interface SentEmail extends EmailOptions {
  timeSent: number;
}
export const sentEmails: SentEmail[] = [];

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

// Explicitly define EmailResult interface
export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

export class EmailClient {
  private transporter: Transporter;

  constructor() {
    let host = typedEnv.NODEMAILER_SMTP_HOST;

    if (mockingOn && !host) {
      host = "localhost";
    }

    if (!host) {
      throw new Error("SMTP configuration error: SMTP_HOST must be provided.");
    }

    const port = typedEnv.NODEMAILER_SMTP_PORT;
    const user = typedEnv.NODEMAILER_SMTP_USER;
    const pass = typedEnv.NODEMAILER_SMTP_PASS;
    // Default secure to true if not explicitly set to 'false'
    const secure = typedEnv.NODEMAILER_SMTP_SECURE !== "false";

    this.transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : undefined,
      secure: secure,
      // Only add auth if user and pass are provided
      auth: user && pass ? { user, pass } : undefined,
    });
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
