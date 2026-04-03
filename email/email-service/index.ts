export type { EmailService } from "./EmailService.ts";
export type {
  EmailOptions,
  SentEmail,
  EmailResult,
} from "./types.ts";
export { sentEmails } from "./mock-store.ts";
export {
  createEmailService,
  type CreateEmailServiceOptions,
} from "./createEmailService.ts";
export { NodemailerEmailService } from "./nodemailer/NodemailerEmailService.ts";
export { BrevoEmailService } from "./brevo/BrevoEmailService.ts";
export {
  createEmailsRouter,
  type EmailsRouterOptions,
} from "./express/createEmailsRouter.ts";
