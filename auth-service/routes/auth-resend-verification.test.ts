import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import passport from "passport";
import { authRouter } from "./auth-resend-verification.ts";
import { setupPassport } from "../passport.ts";
import * as argon2 from "argon2";
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

// Session configuration
app.use(
  session({
    secret: "test",
    resave: false,
    saveUninitialized: false,
  }),
);

// Initialize Passport
setupPassport(db);
app.use(passport.initialize());
app.use(passport.session());

// db injection
app.use((req, _, next) => {
  req.db = db;
  next();
});

app.use("/auth", authRouter);
app.use(recommendedErrorHandlers);

// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("POST /auth/resend-verification", () => {
    it("should resend verification email for logged in user", async () => {
      const mockEmailAuth = {
        email: "test@example.com",
        userId: 1,
        passwordHash: "hashed-password",
        verifiedAt: null,
        verificationToken: "new-token",
        verificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 15),
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      };

      vi.mocked(db.emailAuth.updateVerificationToken).mockResolvedValue(
        mockEmailAuth,
      );

      const response = await request(app)
        .post("/auth/resend-verification")
        .set("x-user-id", "1")
        .set("x-user-email", "test@example.com");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Verification email sent",
      });
      expect(db.emailAuth.updateVerificationToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.any(Date),
      );
    });

    it("should return 401 for unauthenticated user", async () => {
      const response = await request(app).post("/auth/resend-verification");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: "User must be logged in",
      });
    });
  });
});
