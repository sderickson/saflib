export type { EmailService } from "./EmailService.ts";
export type {
  EmailAddress,
  EmailOptions,
  SentEmail,
  EmailResult,
} from "./types.ts";
export { sentEmails } from "./mock-store.ts";
export { createEmailService } from "./createEmailService.ts";
export { resolveEmailServiceFromEnv } from "./resolveEmailServiceFromEnv.ts";
export { BrevoEmailService } from "./brevo/BrevoEmailService.ts";
export {
  createEmailsRouter,
  type EmailsRouterOptions,
} from "./express/createEmailsRouter.ts";
