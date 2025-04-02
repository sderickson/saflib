import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { resetPasswordHandler } from "./auth-reset-password.ts";
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

app.post("/auth/reset-password", resetPasswordHandler);
app.use(recommendedErrorHandlers);

describe("Reset Password Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reset password successfully with valid token", async () => {
    const token = "valid-token";
    const newPassword = "new-password123";
    const userId = 1;

    const emailAuth = {
      userId,
      email: "test@example.com",
      passwordHash: Buffer.from("old-hash"),
      verifiedAt: null,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      forgotPasswordToken: token,
      forgotPasswordTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes from now
    };

    vi.spyOn(db.emailAuth, "getByForgotPasswordToken").mockResolvedValue(
      emailAuth,
    );
    vi.spyOn(db.emailAuth, "updatePassword").mockResolvedValue(emailAuth);
    vi.spyOn(db.emailAuth, "clearForgotPasswordToken").mockResolvedValue(
      emailAuth,
    );

    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    expect(db.emailAuth.getByForgotPasswordToken).toHaveBeenCalledWith(token);
    expect(db.emailAuth.updatePassword).toHaveBeenCalledWith(
      userId,
      expect.any(Buffer),
    );
    expect(db.emailAuth.clearForgotPasswordToken).toHaveBeenCalledWith(userId);
  });

  it("should return 404 for expired token", async () => {
    const token = "expired-token";
    const newPassword = "new-password123";

    const emailAuth = {
      userId: 1,
      email: "test@example.com",
      passwordHash: Buffer.from("old-hash"),
      verifiedAt: null,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      forgotPasswordToken: token,
      forgotPasswordTokenExpiresAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    };

    vi.spyOn(db.emailAuth, "getByForgotPasswordToken").mockResolvedValue(
      emailAuth,
    );

    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Invalid or expired token" });

    expect(db.emailAuth.getByForgotPasswordToken).toHaveBeenCalledWith(token);
    expect(db.emailAuth.updatePassword).not.toHaveBeenCalled();
    expect(db.emailAuth.clearForgotPasswordToken).not.toHaveBeenCalled();
  });

  it("should return 404 for invalid token", async () => {
    const token = "invalid-token";
    const newPassword = "new-password123";

    vi.spyOn(db.emailAuth, "getByForgotPasswordToken").mockRejectedValue(
      new db.emailAuth.TokenNotFoundError(),
    );

    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Invalid or expired token" });

    expect(db.emailAuth.getByForgotPasswordToken).toHaveBeenCalledWith(token);
    expect(db.emailAuth.updatePassword).not.toHaveBeenCalled();
    expect(db.emailAuth.clearForgotPasswordToken).not.toHaveBeenCalled();
  });
});
