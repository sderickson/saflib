import { describe, it, expect, beforeEach } from "vitest";
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
    const response = await request(app).get("/email/sent");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
