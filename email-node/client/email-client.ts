import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export const mockingOn =
  process.env.NODE_ENV === "test" || process.env.MOCK_INTEGRATIONS === "true";

export interface SentEmail extends EmailOptions {
  timeSent: number;
}
export const sentEmails: SentEmail[] = [];

export interface EmailOptions
  extends Pick<
    nodemailer.SendMailOptions,
    "to" | "cc" | "bcc" | "subject" | "text" | "html" | "attachments" | "from"
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
    let host = process.env.SMTP_HOST;

    if (mockingOn && !host) {
      host = "localhost";
    }

    if (!host) {
      throw new Error("SMTP configuration error: SMTP_HOST must be provided.");
    }

    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    // Default secure to true if not explicitly set to 'false'
    const secure = process.env.SMTP_SECURE !== "false";
    const name = process.env.SMTP_NAME;

    this.transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : undefined,
      secure: secure,
      // Only add auth if user and pass are provided
      auth: user && pass ? { user, pass } : undefined,
      name,
    });
    if (!this.transporter) {
      throw new Error("Failed to create transporter");
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
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

    return {
      messageId: info.messageId,
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
      response: info.response,
    };
  }
}
