export type EmailAddress = string | { name?: string; address: string };

/** Options for sending a transactional email. */
export type EmailOptions = {
  to?: EmailAddress | EmailAddress[];
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  from?: EmailAddress;
  reply_to?: EmailAddress | EmailAddress[];
  subject?: string;
  text?: string | Buffer;
  html?: string | Buffer;
  attachments?: readonly Record<string, unknown>[];
};

/** A record of an email that was sent. Only used for mocking. */
export interface SentEmail extends EmailOptions {
  time_sent: number;
}

/** Result of sending an email. */
export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}
