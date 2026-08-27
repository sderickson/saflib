export type { EmailService } from "./EmailService.ts";
export type {
  EmailAddress,
  EmailOptions,
  SentEmail,
  EmailResult,
} from "./types.ts";
export { sentEmails } from "./mock-store.ts";
export {
  MockEmailService,
  createMockEmailService,
} from "./MockEmailService.ts";
export {
  createEmailsRouter,
  type EmailsRouterOptions,
} from "./express/createEmailsRouter.ts";
