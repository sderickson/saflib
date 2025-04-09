import { afterEach, beforeEach, vi } from "vitest";
import { EmailOptions } from "../src/email-client.ts";
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.SMTP_HOST = "mock.smtp.server";
  process.env.SMTP_PORT = "587";
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
      // Define the mock function directly within the returned object
      sendMail: vi.fn().mockImplementation((options: EmailOptions) => {
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
