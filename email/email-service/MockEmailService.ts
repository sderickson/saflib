import type { EmailService } from "./EmailService.ts";
import { sentEmails } from "./mock-store.ts";
import type { EmailOptions, EmailResult } from "./types.ts";

function getTo(options: EmailOptions): string[] {
  if (Array.isArray(options.to)) {
    return options.to.map((t) => (typeof t === "string" ? t : t.address));
  }
  if (typeof options.to === "string") {
    return [options.to];
  }
  if (options.to && typeof options.to === "object" && "address" in options.to) {
    return [options.to.address];
  }
  return [];
}

/**
 * In-memory {@link EmailService} that records sends to {@link sentEmails}.
 * Used by Express mock routes and unit tests without a vendor adapter.
 */
export class MockEmailService implements EmailService {
  readonly isMocked = true;

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!options.to && !options.cc && !options.bcc) {
      throw new Error("No recipients specified");
    }
    sentEmails.push({
      ...options,
      time_sent: Date.now(),
    });
    return {
      messageId: "1234567890",
      accepted: getTo(options),
      rejected: [],
      response: "250 2.0.0 OK",
    };
  }
}

/** Factory for {@link MockEmailService}. */
export function createMockEmailService(): EmailService {
  return new MockEmailService();
}
