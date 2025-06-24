import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { createEmailsRouter } from "./index.ts";

describe("getSentEmails", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use("/email", createEmailsRouter());
  });

  it("should return sent emails when mocking is enabled", async () => {
    // Mock the environment to enable mocking
    vi.doMock("../../client/email-client.ts", () => ({
      mockingOn: true,
      sentEmails: [
        { to: "test@example.com", subject: "Test Email", text: "Test content" },
      ],
    }));

    const response = await request(app).get("/email/sent");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should return 403 when mocking is disabled", async () => {
    // Mock the environment to disable mocking
    vi.doMock("../../client/email-client.ts", () => ({
      mockingOn: false,
      sentEmails: [],
    }));

    const response = await request(app).get("/email/sent");

    expect(response.status).toBe(403);
  });
});
