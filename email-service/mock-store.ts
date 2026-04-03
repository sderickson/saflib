import type { SentEmail } from "./types.ts";

/**
 * In-memory log of sent emails when using mock transport. Shared by all
 * {@link NodemailerEmailService} mock instances and by the Express routes that expose it.
 */
export const sentEmails: SentEmail[] = [];
