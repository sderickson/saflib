// instead of mocking the whole library, we just mock the part of nodemailer that this library uses
// that way if you `vi.mock('@saflib/email')` in your test file, most of the logic still runs for
// more comprehensive testing.

// To see what emails are sent, do `vi.spyOn(EmailClient.prototype, "sendEmail");`
import { afterEach, beforeEach, vi } from "vitest";
import type { EmailOptions } from "../client/email-client.ts";
import { createTransport } from "nodemailer";
const originalEnv = process.env;
let id = 0;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.SMTP_HOST = "mock.smtp.server";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_FROM = "noreply@your-domain.com";
  const transport = createTransport();
  vi.mocked(transport.sendMail).mockImplementation((options: EmailOptions) => {
    // always return a success response
    return Promise.resolve({
      messageId: `test-message-${id++}`,
      accepted: [options.to as string],
      rejected: [],
      response: "250 OK",
      envelope: {
        from: options.from as string,
        to: [options.to as string],
      },
      pending: [],
    });
  });
});

afterEach(() => {
  process.env = originalEnv;
});

vi.mock("nodemailer", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("nodemailer")>();
  const mockSendMail = vi.fn();
  return {
    ...originalModule,
    createTransport: () => {
      return {
        sendMail: mockSendMail,
      };
    },
  };
});

export * from "../index.ts";
