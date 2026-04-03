import { describe, it, expect } from "vitest";
import {
  createEmailService,
  NodemailerEmailService,
  sentEmails,
} from "./index.ts";

describe("@saflib/email-service", () => {
  it("exports createEmailService and nodemailer implementation", () => {
    const svc = createEmailService({
      type: "nodemailer",
      transport: "mock",
    });
    expect(svc).toBeInstanceOf(NodemailerEmailService);
    expect(svc.isMocked).toBe(true);
  });

  it("clears sentEmails array for isolated mock tests", () => {
    sentEmails.length = 0;
    expect(sentEmails).toHaveLength(0);
  });
});
