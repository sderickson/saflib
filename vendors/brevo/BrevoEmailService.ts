import { getSafReporters } from "@saflib/node";
import type { EmailService, EmailOptions, EmailResult } from "@saflib/email-service";
import { sentEmails } from "@saflib/email-service";
import { getTo } from "./get-to.ts";
import { emailOptionsToSendTransacEmail } from "./map-email-options.ts";

const SEND_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Sends email via [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email)
 * (`POST /v3/smtp/email`, with plain fetch rather than Brevo's SDK, which is
 * large to load for one call). Pass `"mock"` as the API key to append to
 * {@link sentEmails} without calling the API.
 */
export class BrevoEmailService implements EmailService {
  readonly isMocked: boolean;
  private readonly apiKey: string;

  constructor(apiKey: string | "mock") {
    this.isMocked = apiKey === "mock";
    this.apiKey = apiKey;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!options.to && !options.cc && !options.bcc) {
      throw new Error("No recipients specified");
    }

    if (this.isMocked) {
      sentEmails.push({
        ...options,
        time_sent: Date.now(),
      });
      return {
        messageId: "1234567890",
        accepted: getTo(options),
        rejected: [],
        response: "250 2.0.0 OK",
      };
    }

    const payload = await emailOptionsToSendTransacEmail(options);
    const { log } = getSafReporters();
    const response = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as {
      messageId?: string;
      messageIds?: string[];
      code?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(
        `Brevo send failed: ${response.status} ${body.code ?? ""} ${body.message ?? response.statusText}`.trim(),
      );
    }
    const messageId = body.messageId ?? body.messageIds?.join(",") ?? "";

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
