import { describe, it, expect, vi } from "vitest";
import { EmailClient, EmailOptions, EmailResult } from "@saflib/email";
import type SMTPTransport from "nodemailer";
import { getMockSendMail } from "./mock-helpers.ts";
import * as nodemailer from "nodemailer";
// Explicitly mock nodemailer using the imported factory
vi.mock("@saflib/email");

interface Address {
  name: string;
  address: string;
}

describe("EmailClient", () => {
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
});
