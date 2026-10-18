import { describe, expect, it, vi } from "vitest";
import type { EmailService } from "@saflib/email-service";
import {
  formatAuditDigestEmail,
  sendAuditDigestEmail,
  type AuditDigest,
} from "./digest-email.ts";

const base: AuditDigest = {
  filename: "audit-2026-05-05T00-30-00.000Z.sqlite.zst",
  sha256Hex: "aa".repeat(32),
  rowCount: 42,
  firstTs: "2026-05-05T00:30:00.000Z",
  lastTs: "2026-05-05T23:59:59.999Z",
  headHash: "bb".repeat(32),
  tailHash: "cc".repeat(32),
  archiveKey: "audit/2026/05/05/audit-2026-05-05T00-30-00.000Z.sqlite.zst",
  environment: "production",
  serviceName: "api",
  trigger: "cron",
};

describe("formatAuditDigestEmail", () => {
  it("formats a first-window digest with a cron trigger", () => {
    const { subject, text } = formatAuditDigestEmail(base);
    expect(subject).toBe(
      "[audit] production audit-2026-05-05T00-30-00.000Z.sqlite.zst — 42 events",
    );
    expect(text).toContain("Service:               api");
    expect(text).toContain("Trigger:               cron");
    expect(text).toContain("(none — first sealed window)");
  });

  it("includes the previous anchor, admin user and git commits", () => {
    const { text } = formatAuditDigestEmail({
      ...base,
      trigger: "admin",
      triggeredByUserId: "user-9",
      gitCommitRoot: "rootsha",
      gitCommitSaflib: "slibsha",
      previous: {
        archiveKey: "old/key.zst",
        chainTailHash: "tailold",
        sentAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(text).toContain("Trigger:               admin (admin: user-9)");
    expect(text).toContain("Previous archive:      old/key.zst");
    expect(text).toContain("Previous chain tail:   tailold");
    expect(text).toContain("Git commit (root):     rootsha");
    expect(text).toContain("Git commit (saflib):   slibsha");
  });

  it("omits the admin user when none is given", () => {
    const { text } = formatAuditDigestEmail({ ...base, trigger: "admin" });
    expect(text).toContain("Trigger:               admin");
    expect(text).not.toContain("admin: ");
  });

  it("includes the branch count when the chain forked", () => {
    const { text } = formatAuditDigestEmail({ ...base, branchCount: 1 });
    expect(text).toContain(
      "Chain branches:        1 (forked rows sharing a parent)",
    );
  });
});

describe("sendAuditDigestEmail", () => {
  it("sends the formatted digest as plain text", async () => {
    const sendEmail = vi.fn().mockResolvedValue({});
    await sendAuditDigestEmail({
      emailService: { isMocked: true, sendEmail } as EmailService,
      from: "noreply@example.com",
      to: "audit-group@example.com",
      digest: base,
    });
    const call = sendEmail.mock.calls[0]![0];
    expect(call.from).toBe("noreply@example.com");
    expect(call.to).toBe("audit-group@example.com");
    expect(call.text).toContain("Event count:           42");
    expect(call.html).toBeUndefined();
  });

  it("propagates send failures", async () => {
    const sendEmail = vi.fn().mockRejectedValue(new Error("SMTP down"));
    await expect(
      sendAuditDigestEmail({
        emailService: { isMocked: true, sendEmail } as EmailService,
        from: "noreply@example.com",
        to: "a@b.com",
        digest: base,
      }),
    ).rejects.toThrow("SMTP down");
  });
});
