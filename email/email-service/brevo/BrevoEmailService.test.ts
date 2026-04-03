import { describe, it, expect, beforeEach } from "vitest";
import { sentEmails } from "../mock-store.ts";
import { BrevoEmailService } from "./BrevoEmailService.ts";

describe("BrevoEmailService", () => {
  beforeEach(() => {
    sentEmails.length = 0;
  });

  it("records mock sends in sentEmails", async () => {
    const svc = new BrevoEmailService("mock");
    expect(svc.isMocked).toBe(true);
    await svc.sendEmail({
      from: "a@b.com",
      to: "c@d.com",
      subject: "Hi",
      text: "Hello",
    });
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toBe("Hi");
  });
});
