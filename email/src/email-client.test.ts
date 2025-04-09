import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EmailClient, EmailOptions, EmailResult } from "@saflib/email";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Address } from "nodemailer/lib/mailer"; // Import Address type
import { getMockSendMail } from "./mock-helpers.ts";
import * as nodemailer from "nodemailer";
// Explicitly mock nodemailer using the imported factory
vi.mock("@saflib/email");

describe("EmailClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.SMTP_HOST = "mock.smtp.server";
    process.env.SMTP_PORT = "587";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- Constructor Tests (Remain mostly the same) ---
  it("should throw an error if SMTP_HOST is not provided", () => {
    delete process.env.SMTP_HOST;
    expect(() => new EmailClient()).toThrow(
      "SMTP configuration error: SMTP_HOST and SMTP_PORT must be provided.",
    );
  });

  it("should throw an error if SMTP_PORT is not provided", () => {
    delete process.env.SMTP_PORT;
    expect(() => new EmailClient()).toThrow(
      "SMTP configuration error: SMTP_HOST and SMTP_PORT must be provided.",
    );
  });

  it("should initialize transporter calling nodemailer.createTransport", () => {
    const timesCalled = vi.mocked(nodemailer.createTransport).mock.calls.length;
    new EmailClient(); // Constructor calls createTransport
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(timesCalled + 1);
    // We can still check the arguments passed to the mocked createTransport
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "mock.smtp.server",
      port: 587,
      secure: true,
      auth: undefined,
    });
  });

  // --- SendEmail Tests ---
  it("should send an email successfully", async () => {
    const client = new EmailClient();
    const emailOptions: EmailOptions = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      text: "Test Body",
    };

    const expectedResult: EmailResult = {
      messageId: "<test-message-id>",
      accepted: [emailOptions.to as string],
      rejected: [],
      response: "250 OK",
    };

    const mockResolvedInfo: SMTPTransport.SentMessageInfo = {
      messageId: expectedResult.messageId,
      accepted: expectedResult.accepted as (string | Address)[],
      rejected: expectedResult.rejected as (string | Address)[],
      response: expectedResult.response,
      pending: [],
      envelope: {
        from: emailOptions.from as string,
        to: [emailOptions.to as string],
      },
    };
    // Get the mock function via the helper and set its behavior
    getMockSendMail(nodemailer).mockResolvedValue(mockResolvedInfo);

    const result = await client.sendEmail(emailOptions);

    // Check that the mock function was called correctly
    expect(getMockSendMail(nodemailer)).toHaveBeenCalledWith(emailOptions);
    // Assert against the predefined expectedResult object property by property
    expect(result.messageId).toBe(expectedResult.messageId);
    expect(result.accepted).toEqual(expectedResult.accepted); // Use toEqual for array comparison
    expect(result.rejected).toEqual(expectedResult.rejected); // Use toEqual for array comparison
    expect(result.response).toBe(expectedResult.response);
  });

  it("should handle errors during email sending", async () => {
    const client = new EmailClient();
    const emailOptions: EmailOptions = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Error",
      text: "Test Body Error",
    };
    const testError = new Error("SMTP Error");
    // Get the mock function via the helper and set its behavior
    getMockSendMail(nodemailer).mockRejectedValue(testError);

    await expect(client.sendEmail(emailOptions)).rejects.toThrow(
      `Failed to send email: ${testError}`,
    );
    expect(getMockSendMail(nodemailer)).toHaveBeenCalledWith(emailOptions);
  });

  // Add back other constructor tests if they were removed
  it("should initialize transporter with auth if credentials provided", () => {
    process.env.SMTP_USER = "testuser";
    process.env.SMTP_PASS = "testpass";
    new EmailClient();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: "testuser", pass: "testpass" },
      }),
    );
  });

  it("should initialize transporter with secure false if SMTP_SECURE is 'false'", () => {
    process.env.SMTP_SECURE = "false";
    new EmailClient();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: false,
      }),
    );
  });
});
