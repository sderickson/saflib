// instead of mocking the whole library, we just mock the part of nodemailer that this library uses
// that way if you `vi.mock('@saflib/email')` in your test file, most of the logic still runs for
// more comprehensive testing.

// To see what emails are sent, do `vi.spyOn(EmailClient.prototype, "sendEmail");`
import { afterEach, beforeEach, vi } from "vitest";
import { EmailOptions } from "../src/email-client.ts";
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.SMTP_HOST = "mock.smtp.server";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_FROM = "noreply@your-domain.com";
});

afterEach(() => {
  process.env = originalEnv;
});

vi.mock("nodemailer", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("nodemailer")>();
  let id = 0;
  return {
    ...originalModule,
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockImplementation((options: EmailOptions) => {
        // always return a success response
        return {
          messageId: `test-message-${id++}`,
          accepted: [options.to],
          rejected: [],
          response: "250 OK",
        };
      }),
    }),
  };
});

export * from "../index.ts";
