import type { SentEmail } from "./types.ts";

/**
 * In-memory log of sent emails when using mock mode. Shared by
 * {@link MockEmailService} / vendor mock adapters and Express routes that expose it.
 */
export const sentEmails: SentEmail[] = [];
