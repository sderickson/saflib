import type { SentEmail } from "@saflib/email-spec";

export function sortSentEmailsNewestFirst(
  emails: readonly SentEmail[],
): SentEmail[] {
  return [...emails].sort((a, b) => (b.timeSent || 0) - (a.timeSent || 0));
}

export function formatRecipients(
  recipients:
    | string
    | string[]
    | { address: string }
    | { address: string }[]
    | undefined,
): string {
  if (Array.isArray(recipients)) {
    return recipients
      .map((r) => (typeof r === "string" ? r : r.address))
      .join(", ");
  }
  if (typeof recipients === "string") {
    return recipients;
  }
  if (recipients && "address" in recipients) {
    return recipients.address;
  }
  return "";
}
