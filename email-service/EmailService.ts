import type { EmailOptions, EmailResult } from "./types.ts";

export interface EmailService {
  readonly isMocked: boolean;
  sendEmail(options: EmailOptions): Promise<EmailResult>;
}
