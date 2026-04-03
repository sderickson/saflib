import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSafReporters } from "@saflib/node";
import type { EmailService } from "../EmailService.ts";
import { sentEmails } from "../mock-store.ts";
import type { EmailOptions, EmailResult } from "../types.ts";
import { getTo } from "./get-to.ts";

type TransporterConfig = Parameters<typeof nodemailer.createTransport>[0];

/**
 * Email sending via nodemailer. Pass `"mock"` to record sends in {@link sentEmails}
 * without contacting SMTP.
 */
export class NodemailerEmailService implements EmailService {
  readonly isMocked: boolean;
  private readonly transporter: Transporter | undefined;

  constructor(transport: "mock" | TransporterConfig) {
    if (transport === "mock") {
      this.isMocked = true;
      this.transporter = undefined;
      return;
    }
    this.isMocked = false;
    this.transporter = nodemailer.createTransport(transport);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!options.to && !options.cc && !options.bcc) {
      throw new Error("No recipients specified");
    }

    if (this.isMocked) {
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

    const { log } = getSafReporters();
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
