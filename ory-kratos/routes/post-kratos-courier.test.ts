import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { emailClient } from "@saflib/email";
import { createErrorMiddleware, createInternalMiddleware } from "@saflib/express";
import { createPostKratosCourierHandler } from "./post-kratos-courier.ts";
import type { IdentityServiceCallbacks } from "../callbacks.ts";

vi.mock("@saflib/email", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@saflib/email")>();
  return {
    ...mod,
    emailClient: {
      ...mod.emailClient,
      sendEmail: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe("createPostKratosCourierHandler", () => {
  let app: express.Express;

  const verificationBody = {
    recipient: "user@example.com",
    template_type: "verification_code_valid",
    template_data: {
      verification_code: "842363",
      verification_url:
        "http://kratos.docker.localhost/self-service/verification?code=842363&flow=e3f118c9-d119-4603-9e60-1ada5457efe7",
      identity: {
        id: "0e7a38c8-841f-45ea-abe6-9a1ef859c074",
        created_at: "2026-03-23T21:15:48.553924Z",
        traits: { email: "user@example.com" },
        verifiable_addresses: [
          { verified: false, value: "user@example.com" },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.mocked(emailClient.sendEmail).mockClear();
  });

  it("returns 400 when payload is invalid", async () => {
    const handler = createPostKratosCourierHandler({});
    app = express();
    app.use(createInternalMiddleware());
    app.post("/email/kratos-courier", handler);
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/email/kratos-courier")
      .send({})
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
    expect(emailClient.sendEmail).not.toHaveBeenCalled();
  });

  it("calls onVerificationTokenCreated and sends email for verification template", async () => {
    const onVerificationTokenCreated = vi.fn().mockResolvedValue(undefined);
    const callbacks: IdentityServiceCallbacks = { onVerificationTokenCreated };

    const handler = createPostKratosCourierHandler(callbacks);
    app = express();
    app.use(createInternalMiddleware());
    app.post("/email/kratos-courier", handler);
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/email/kratos-courier")
      .send(verificationBody)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(204);
    expect(onVerificationTokenCreated).toHaveBeenCalledTimes(1);
    expect(onVerificationTokenCreated).toHaveBeenCalledWith({
      user: expect.objectContaining({
        id: "0e7a38c8-841f-45ea-abe6-9a1ef859c074",
        email: "user@example.com",
      }),
      verificationUrl: verificationBody.template_data.verification_url,
      isResend: false,
    });
    expect(emailClient.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Verify your email",
      }),
    );
  });

  it("calls onPasswordReset for recovery template", async () => {
    const onPasswordReset = vi.fn().mockResolvedValue(undefined);
    const body = {
      recipient: "user@example.com",
      template_type: "recovery_valid",
      template_data: {
        recovery_code: "abc",
        recovery_url: "http://kratos.docker.localhost/self-service/recovery?flow=x",
        identity: {
          id: "id-1",
          traits: { email: "user@example.com" },
        },
      },
    };

    const handler = createPostKratosCourierHandler({ onPasswordReset });
    app = express();
    app.use(createInternalMiddleware());
    app.post("/email/kratos-courier", handler);
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/email/kratos-courier")
      .send(body)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(204);
    expect(onPasswordReset).toHaveBeenCalledWith({
      user: expect.objectContaining({ id: "id-1", email: "user@example.com" }),
      resetUrl: body.template_data.recovery_url,
    });
  });
});
