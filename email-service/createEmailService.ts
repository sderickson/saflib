import type { EmailService } from "./EmailService.ts";
import { NodemailerEmailService } from "./nodemailer/NodemailerEmailService.ts";

type NodemailerTransportConfig = ConstructorParameters<
  typeof NodemailerEmailService
>[0];

export type CreateEmailServiceOptions = {
  type: "nodemailer";
  /** `"mock"` stores emails in {@link sentEmails}; otherwise a nodemailer transport config. */
  transport: NodemailerTransportConfig;
};

/**
 * Creates the email service. Currently only nodemailer is supported.
 */
export function createEmailService(
  options: CreateEmailServiceOptions,
): EmailService {
  if (options.type === "nodemailer") {
    return new NodemailerEmailService(options.transport);
  }
  throw new Error("unreachable");
}
