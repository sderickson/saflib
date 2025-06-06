import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../http.ts";
import { getCsrfToken } from "./_test-helpers.ts";

// Mock the email package
vi.mock("@saflib/email");

describe("Logout Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp({ callbacks: {} });
    vi.clearAllMocks();
  });

  it("should logout a user successfully", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    const csrfToken = getCsrfToken(
      await agent.post("/auth/register").send(userData),
    );
    {
      const res = await agent
        .get("/auth/verify")
        .send(userData)
        .set("X-CSRF-TOKEN", csrfToken);
      expect(res.status).toBe(200);
    }

    {
      const response = await agent.post("/auth/logout");
      expect(response.status).toBe(200);
    }
    {
      const res = await agent.get("/auth/verify");
      expect(res.status).toBe(401);
    }
  });

  it("should return 200 even when not logged in", async () => {
    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });
});
