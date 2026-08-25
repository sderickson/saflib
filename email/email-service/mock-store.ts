import type { SentEmail } from "./types.ts";

/**
 * In-memory log of sent emails when using mock mode. Shared by mock
 * {@link BrevoEmailService} instances and Express routes that expose it.
 */
export const sentEmails: SentEmail[] = [];
