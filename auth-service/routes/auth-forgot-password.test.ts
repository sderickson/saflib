import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { forgotPasswordHandler } from "./auth-forgot-password.ts";
import {
  recommendedErrorHandlers,
  recommendedPreMiddleware,
} from "@saflib/node-express";
import { AuthDB } from "@saflib/auth-db";

// Create a test app
const app = express();
app.use(recommendedPreMiddleware);

// Initialize database
const db = new AuthDB({ inMemory: true });

// db injection
app.use((req, _, next) => {
  req.db = db;
  next();
});

app.post("/auth/forgot-password", forgotPasswordHandler);
app.use(recommendedErrorHandlers);

describe("Forgot Password Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate and store reset token when user exists", async () => {
    const email = "test@example.com";
    const user = {
      id: 1,
      email,
      createdAt: new Date(),
      lastLoginAt: null,
    };

    // Mock database responses
    vi.spyOn(db.users, "getByEmail").mockResolvedValue(user);
    vi.spyOn(db.emailAuth, "updateForgotPasswordToken").mockResolvedValue({
      userId: user.id,
      email: user.email,
      passwordHash: Buffer.from("hashed-password"),
      verifiedAt: null,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      forgotPasswordToken: "test-token",
      forgotPasswordTokenExpiresAt: new Date(),
    });

    const response = await request(app)
      .post("/auth/forgot-password")
      .send({ email });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "If the email exists, a recovery email has been sent",
    });

    expect(db.users.getByEmail).toHaveBeenCalledWith(email);
    expect(db.emailAuth.updateForgotPasswordToken).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
      expect.any(Date),
    );
  });

  it("should return success even when user doesn't exist to prevent email enumeration", async () => {
    const email = "nonexistent@example.com";

    // Mock database to return null for non-existent user
    vi.spyOn(db.users, "getByEmail").mockRejectedValue(
      new db.users.UserNotFoundError(),
    );

    const response = await request(app)
      .post("/auth/forgot-password")
      .send({ email });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "If the email exists, a recovery email has been sent",
    });

    expect(db.users.getByEmail).toHaveBeenCalledWith(email);
    expect(db.emailAuth.updateForgotPasswordToken).not.toHaveBeenCalled();
  });
});
