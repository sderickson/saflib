import * as nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

// Define EmailOptions based on nodemailer's SendMailOptions
export interface EmailOptions
  extends Pick<
    nodemailer.SendMailOptions,
    "to" | "cc" | "bcc" | "subject" | "text" | "html" | "attachments" | "from"
  > {}

// Define EmailResult by picking relevant fields from nodemailer's SentMessageInfo
export type EmailResult = Pick<
  SMTPTransport.SentMessageInfo,
  "messageId" | "accepted" | "rejected" | "response"
>;

export class EmailClient {
  private transporter: Mail;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    // Default secure to true if not explicitly set to 'false'
    const secure = process.env.SMTP_SECURE !== "false";

    if (!host || !port) {
      throw new Error(
        "SMTP configuration error: SMTP_HOST and SMTP_PORT must be provided.",
      );
    }

    const transportOptions: SMTPTransport.Options = {
      host,
      port: parseInt(port, 10),
      secure: secure,
      // Only add auth if user and pass are provided
      auth: user && pass ? { user, pass } : undefined,
    };

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const info: SMTPTransport.SentMessageInfo =
        await this.transporter.sendMail(options);

      // Map nodemailer's result to our EmailResult interface (adjusting types)
      return {
        messageId: info.messageId,
        accepted: info.accepted as string[], // Nodemailer types might return string | Address
        rejected: info.rejected as string[], // Nodemailer types might return string | Address
        response: info.response,
      };
    } catch (error) {
      console.error("Error sending email:", error);
      // Rethrow or handle error as appropriate for the application
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}
