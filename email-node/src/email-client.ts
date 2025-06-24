import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
// Define EmailOptions based on nodemailer's SendMailOptions
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

    // If we're in development, pretend to succeed
    if (process.env.NODE_ENV === "development" && !host) {
      host = "localhost";
    }

    if (!host) {
      if (process.env.NODE_ENV === "test") {
        throw new Error(
          "@saflib/email is not mocked, but it's running in a test. Add `vi.mock('@saflib/email')` to your test file.",
        );
      }
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
    try {
      if (!options.to && !options.cc && !options.bcc) {
        throw new Error("No recipients specified");
      }
      if (
        process.env.NODE_ENV === "development" ||
        // Hack: Set to this for things like playwright tests
        process.env.SMTP_HOST === "smtp.mock.com"
      ) {
        console.log(
          `Sending email in development mode: ${JSON.stringify(options)}`,
        );
        return {
          messageId: "1234567890",
          accepted: getTo(options),
          rejected: [],
          response: "250 2.0.0 OK",
        };
      }

      const info = await this.transporter.sendMail(options);

      // Map nodemailer's result to our EmailResult interface (adjusting types)
      return {
        messageId: info.messageId,
        accepted: info.accepted as string[], // Nodemailer types might return string | Address
        rejected: info.rejected as string[], // Nodemailer types might return string | Address
        response: info.response,
      };
    } catch (error) {
      // TODO: log properly
      // console.error("Error sending email:", error);
      // Rethrow or handle error as appropriate for the application
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}
