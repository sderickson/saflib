import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createErrorMiddleware } from "@saflib/express";
import { createKratosAdminRouter } from "./admin-identities.ts";

const siteAdminHeaders = {
  "x-requested-with": "XMLHttpRequest",
  "x-user-id": "admin-1",
  "x-user-email": "admin@example.com",
  "x-user-email-verified": "true",
  "x-user-is-admin": "true",
  "x-user-mfa-completed": "true",
} as const;

const ADA = "00000000-0000-4000-8000-000000000001";
const GONE = "00000000-0000-4000-8000-000000000002";

function makeApp(resolveDisplayNames?: Parameters<typeof createKratosAdminRouter>[0]) {
  const app = express();
  app.use(express.json());
  app.use(createKratosAdminRouter(resolveDisplayNames));
  app.use(createErrorMiddleware());
  return app;
}

describe("POST /admin/identities/lookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns summaries for identities that exist, with product names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: ADA,
            state: "active",
            created_at: "2026-10-30T00:00:00Z",
            traits: { email: "ada@example.com" },
            verifiable_addresses: [{ verified: true }],
          },
        ],
      }),
    );

    const res = await request(
      makeApp({ resolveDisplayNames: async () => ({ [ADA]: "Ada Lovelace" }) }),
    )
      .post("/admin/identities/lookup")
      .set(siteAdminHeaders)
      .send({ ids: [ADA, GONE] })
      .expect(200);

    expect(res.body.identities).toEqual([
      {
        id: ADA,
        email: "ada@example.com",
        name: "Ada Lovelace",
        verified: true,
        state: "active",
        created_at: "2026-10-30T00:00:00Z",
      },
    ]);
  });

  it("requires a site admin", async () => {
    await request(makeApp())
      .post("/admin/identities/lookup")
      .set({ ...siteAdminHeaders, "x-user-is-admin": "false" })
      .send({ ids: [ADA] })
      .expect(403);
  });

  it("returns 502 when Kratos is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await request(makeApp())
      .post("/admin/identities/lookup")
      .set(siteAdminHeaders)
      .send({ ids: [ADA] })
      .expect(502);
  });
});
