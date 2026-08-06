import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { getSafContext } from "@saflib/node";
import {
  createInternalCaller,
  type InternalCaller,
} from "./createInternalCaller.ts";
import { startExpressServer } from "./bin/www.ts";
import { createScopedMiddleware } from "./middleware/composition.ts";
import { errorHandler } from "./middleware/errors.ts";

const { undiciFetchMock } = vi.hoisted(() => ({
  undiciFetchMock: vi.fn(),
}));

vi.mock("undici", async (importOriginal) => {
  const actual = await importOriginal<typeof import("undici")>();
  return {
    ...actual,
    fetch: (...args: Parameters<typeof actual.fetch>) =>
      undiciFetchMock(...args),
  };
});

const SERVER_SECRET = Buffer.from("internal-caller-server-secret").toString(
  "base64",
);
const WRONG_SECRET = Buffer.from("internal-caller-wrong-secret!!").toString(
  "base64",
);
const SERVER_KEYS = `server:${SERVER_SECRET}`;
const WRONG_KEYS = `wrong:${WRONG_SECRET}`;

const probeSpec: OpenAPIV3.DocumentV3 = {
  openapi: "3.0.0",
  info: { title: "internal-caller", version: "1.0.0" },
  paths: {
    "/probe": {
      get: {
        operationId: "probeOperation",
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    auth: { type: "object", nullable: true },
                    requestId: { type: "string" },
                  },
                },
              },
            },
          },
          "401": {
            description: "unauthorized",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    status: { type: "number" },
                    code: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function waitForListening(server: http.Server): Promise<void> {
  if (!server.listening) {
    await once(server, "listening");
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function makeProbeApp() {
  const app = express();
  app.use(
    createScopedMiddleware({
      apiSpec: probeSpec,
      enforceAuth: true,
    }),
  );
  app.get("/probe", (_req, res) => {
    const ctx = getSafContext();
    res.status(200).json({ auth: ctx.auth ?? null, requestId: ctx.requestId });
  });
  app.use(errorHandler);
  return app;
}

describe("createInternalCaller", () => {
  const started: Array<{ close: () => Promise<void>; socketPath: string }> =
    [];
  const callers: InternalCaller[] = [];

  beforeEach(async () => {
    const actual = await vi.importActual<typeof import("undici")>("undici");
    undiciFetchMock.mockImplementation(
      ((...args: Parameters<typeof actual.fetch>) =>
        actual.fetch(...args)) as typeof actual.fetch,
    );

    vi.spyOn(globalThis, "fetch");
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", SERVER_KEYS);
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos:4434");
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        id: "user-1",
        state: "active",
        traits: { email: "user@example.com" },
        verifiable_addresses: [{ via: "email", verified: true }],
      }),
    );
  });

  afterEach(async () => {
    while (callers.length > 0) {
      await callers.pop()!.close();
    }
    while (started.length > 0) {
      const entry = started.pop()!;
      await entry.close();
      if (fs.existsSync(entry.socketPath)) {
        fs.unlinkSync(entry.socketPath);
      }
    }
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("round-trips as the asserted user over a unix socket", async () => {
    const socketPath = path.join(
      os.tmpdir(),
      `saf-internal-caller-${process.pid}-${Date.now()}.sock`,
    );
    const result = startExpressServer(makeProbeApp(), { socketPath });
    started.push({ close: result.close, socketPath });
    await waitForListening(result.internalServer!);

    const call = createInternalCaller({ socketPath });
    callers.push(call);
    const res = await call({
      operationId: "probeOperation",
      method: "GET",
      path: "/probe",
      asUser: { userId: "user-1", mfaCompleted: true },
      requestId: "caller-req-1",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      auth: {
        userId: "user-1",
        userEmail: "user@example.com",
        userPhone: undefined,
        isAdmin: false,
        emailVerified: true,
        mfaCompleted: true,
      },
      requestId: "caller-req-1",
    });
  });

  it("returns 401 when the caller signs with the wrong key", async () => {
    const socketPath = path.join(
      os.tmpdir(),
      `saf-internal-caller-badkey-${process.pid}-${Date.now()}.sock`,
    );
    const result = startExpressServer(makeProbeApp(), { socketPath });
    started.push({ close: result.close, socketPath });
    await waitForListening(result.internalServer!);

    const actual = await vi.importActual<typeof import("undici")>("undici");
    // Sign with a key the server does not know. Signer and verifier share
    // process.env in-process, so restore SERVER_KEYS before the request is
    // handled (after the assertion is signed, when fetch is invoked).
    undiciFetchMock.mockImplementation((...args) => {
      vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", SERVER_KEYS);
      return actual.fetch(
        ...(args as Parameters<typeof actual.fetch>),
      );
    });

    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", WRONG_KEYS);
    const call = createInternalCaller({ socketPath });
    callers.push(call);
    const res = await call({
      operationId: "probeOperation",
      method: "GET",
      path: "/probe",
      asUser: { userId: "user-1", mfaCompleted: true },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "assertion_invalid" });
  });
});
