import type * as nodemailer from "nodemailer";

/**
 * Accepted options when sending an email. A subset of what nodemailer accepts.
 * See [Nodemailer docs](https://nodemailer.com/message/) for more details.
 */
export type EmailOptions = Partial<
  Pick<
    nodemailer.SendMailOptions,
    | "to"
    | "cc"
    | "bcc"
    | "subject"
    | "text"
    | "html"
    | "attachments"
    | "from"
    | "replyTo"
  >
>;

/**
 * A record of an email that was sent. Only used for mocking.
 */
export interface SentEmail extends EmailOptions {
  timeSent: number;
}

/**
 * Result of sending an email. These types match typical SMTP transport responses.
 */
export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}
