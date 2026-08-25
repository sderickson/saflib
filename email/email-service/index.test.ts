import { describe, it, expect } from "vitest";
import {
  createEmailService,
  BrevoEmailService,
  sentEmails,
} from "./index.ts";

describe("@saflib/email-service", () => {
  it("exports createEmailService and mock Brevo implementation", () => {
    const svc = createEmailService("mock");
    expect(svc).toBeInstanceOf(BrevoEmailService);
    expect(svc.isMocked).toBe(true);
  });

  it("clears sentEmails array for isolated mock tests", () => {
    sentEmails.length = 0;
    expect(sentEmails).toHaveLength(0);
  });
});
