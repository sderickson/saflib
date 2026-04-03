import { BrevoEmailService } from "./brevo/BrevoEmailService.ts";
import type { EmailService } from "./EmailService.ts";
import { NodemailerEmailService } from "./nodemailer/NodemailerEmailService.ts";

type NodemailerTransportConfig = ConstructorParameters<
  typeof NodemailerEmailService
>[0];

export type CreateEmailServiceOptions =
  | {
      type: "nodemailer";
      /** `"mock"` stores emails in {@link sentEmails}; otherwise a nodemailer transport config. */
      transport: NodemailerTransportConfig;
    }
  | {
      type: "brevo";
      /**
       * Brevo API key ([docs](https://developers.brevo.com/reference/send-transac-email)).
       * Use `"mock"` to record in {@link sentEmails} only.
       */
      apiKey: string | "mock";
    };

/**
 * Creates an email service (nodemailer SMTP or Brevo transactional API).
 */
export function createEmailService(
  options: CreateEmailServiceOptions,
): EmailService {
  if (options.type === "nodemailer") {
    return new NodemailerEmailService(options.transport);
  }
  if (options.type === "brevo") {
    return new BrevoEmailService(options.apiKey);
  }
  throw new Error("unreachable");
}
