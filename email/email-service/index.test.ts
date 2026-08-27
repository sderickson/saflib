import { describe, it, expect } from "vitest";
import {
  createMockEmailService,
  MockEmailService,
  sentEmails,
} from "./index.ts";

describe("@saflib/email-service", () => {
  it("exports createMockEmailService", () => {
    const svc = createMockEmailService();
    expect(svc).toBeInstanceOf(MockEmailService);
    expect(svc.isMocked).toBe(true);
  });

  it("clears sentEmails array for isolated mock tests", () => {
    sentEmails.length = 0;
    expect(sentEmails).toHaveLength(0);
  });
});
