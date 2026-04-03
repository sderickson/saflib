import {
  createEmailsRouter as createEmailsRouterFromService,
  type EmailsRouterOptions as EmailsRouterOptionsFull,
} from "@saflib/email-service";
import { emailService } from "../../client/email-client.ts";

export type EmailsRouterOptions = Omit<EmailsRouterOptionsFull, "emailService">;

/**
 * Creates an Express router that can be used to access sent emails. Only used
 * for E2E testing. Uses the same {@link emailService} as {@link emailClient}.
 */
export function createEmailsRouter(options: EmailsRouterOptions = {}) {
  return createEmailsRouterFromService({ ...options, emailService });
}
