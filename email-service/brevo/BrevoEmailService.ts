import { BrevoClient } from "@getbrevo/brevo";
import { getSafReporters } from "@saflib/node";
import type { EmailService } from "../EmailService.ts";
import { sentEmails } from "../mock-store.ts";
import type { EmailOptions, EmailResult } from "../types.ts";
import { getTo } from "../nodemailer/get-to.ts";
import { emailOptionsToSendTransacEmail } from "./map-email-options.ts";

/**
 * Sends email via [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email)
 * (`sendTransacEmail`). Pass `"mock"` as the API key to append to {@link sentEmails} without calling the API.
 */
export class BrevoEmailService implements EmailService {
  readonly isMocked: boolean;
  private readonly client: BrevoClient | undefined;

  constructor(apiKey: string | "mock") {
    if (apiKey === "mock") {
      this.isMocked = true;
      this.client = undefined;
      return;
    }
    this.isMocked = false;
    this.client = new BrevoClient({ apiKey });
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

    if (!this.client) {
      throw new Error("Brevo client not initialized");
    }

    const payload = await emailOptionsToSendTransacEmail(options);
    const { log } = getSafReporters();
    const res = await this.client.transactionalEmails.sendTransacEmail(payload);
    const messageId =
      res.messageId ??
      (res.messageIds?.length ? res.messageIds.join(",") : "") ??
      "";

    log.info("Email sent (Brevo)", {
      from: options.from,
      subject: options.subject,
      messageId,
    });

    return {
      messageId,
      accepted: getTo(options),
      rejected: [],
      response: "202 Accepted (Brevo)",
    };
  }
}
