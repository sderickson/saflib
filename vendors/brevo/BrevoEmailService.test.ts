import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sentEmails } from "@saflib/email-service";
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

  describe("with an API key", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("posts the transactional email to Brevo", async () => {
      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify({ messageId: "<abc@brevo>" }), {
            status: 201,
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const result = await new BrevoEmailService("key-123").sendEmail({
        from: '"Recipes" <noreply@example.com>',
        to: ["c@d.com", { name: "E", address: "e@f.com" }],
        subject: "Hi",
        html: "<p>Hello</p>",
      });
      expect(result.messageId).toBe("<abc@brevo>");
      expect(result.accepted).toEqual(["c@d.com", "e@f.com"]);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toBe("https://api.brevo.com/v3/smtp/email");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({ "api-key": "key-123" });
      expect(JSON.parse(init.body as string)).toEqual({
        sender: { email: "noreply@example.com", name: "Recipes" },
        to: [{ email: "c@d.com" }, { email: "e@f.com", name: "E" }],
        subject: "Hi",
        htmlContent: "<p>Hello</p>",
      });
    });

    it("throws Brevo's error on a failed send", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                code: "unauthorized",
                message: "Key not found",
              }),
              { status: 401 },
            ),
        ),
      );
      await expect(
        new BrevoEmailService("bad").sendEmail({
          from: "a@b.com",
          to: "c@d.com",
          subject: "Hi",
          text: "Hello",
        }),
      ).rejects.toThrow("Brevo send failed: 401 unauthorized Key not found");
    });
  });
});

describe("send log fields", () => {
  it("keep the sender's domain and the message id's unique part, not addresses", async () => {
    const { domainOf, messageIdLocalPart } = await import("./BrevoEmailService.ts");
    expect(domainOf('"Recipes" <noreply@example.com>')).toBe("example.com");
    expect(domainOf("a@b.com")).toBe("b.com");
    expect(domainOf({ name: "X", address: "x@y.org" })).toBe("y.org");
    expect(domainOf(undefined)).toBeUndefined();
    expect(messageIdLocalPart("<202611090523.abc123@smtp-relay.mailin.fr>")).toBe("202611090523.abc123");
    expect(messageIdLocalPart("<a@x>,<b@y>")).toBe("a,b");
  });
});
