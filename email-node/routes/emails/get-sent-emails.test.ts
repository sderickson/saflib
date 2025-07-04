import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createEmailsRouter } from "./index.ts";
import { EmailClient } from "../../client/email-client.ts";
import { recommendedErrorHandlers } from "@saflib/express";

describe("getSentEmails", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use("/", createEmailsRouter({ serviceName: "test" }));
    app.use(recommendedErrorHandlers);
  });

  it("should return sent emails when mocking is enabled", async () => {
    const response = await request(app).get("/email/sent");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should return sent emails for a specific user", async () => {
    const emailClient = new EmailClient();
    const email1 = `test${Math.random()}@test.com`;
    const email2 = `test${Math.random()}@test.com`;
    await emailClient.sendEmail({
      to: email1,
      from: "support@vendata.com",
      subject: "Test Email",
      text: "Test Email",
    });
    await emailClient.sendEmail({
      to: "support@vendata.com",
      from: email2,
      subject: "Test Email",
      text: "Test Email",
    });

    const response = await request(app)
      .get(`/email/sent`)
      .query({ userEmail: email1 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].to[0]).toBe(email1);

    const response2 = await request(app)
      .get(`/email/sent`)
      .query({ userEmail: email2 });

    expect(response2.status).toBe(200);
    expect(Array.isArray(response2.body)).toBe(true);
    expect(response2.body.length).toBe(1);
    expect(response2.body[0].from).toBe(email2);
  });
});
