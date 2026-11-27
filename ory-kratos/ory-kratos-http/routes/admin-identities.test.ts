import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createErrorMiddleware } from "@saflib/express";
import { createKratosAdminRouter, type KratosAdminRouterOptions } from "./admin-identities.ts";

const siteAdminHeaders = {
  "x-requested-with": "XMLHttpRequest",
  "x-user-id": "admin-1",
  "x-user-email": "admin@example.com",
  "x-user-email-verified": "true",
  "x-user-is-admin": "true",
  "x-user-mfa-completed": "true",
} as const;

const ADA = "00000000-0000-4000-8000-000000000001";
const GRACE = "00000000-0000-4000-8000-000000000002";
const GONE = "00000000-0000-4000-8000-000000000009";

const identities = [
  {
    id: ADA,
    state: "active",
    created_at: "2026-10-30T00:00:00Z",
    traits: { email: "ada@example.com" },
    verifiable_addresses: [{ verified: true }],
    credentials: { password: { identifiers: ["ada@example.com"] }, totp: { identifiers: ["ada@example.com"] } },
  },
  {
    id: GRACE,
    state: "active",
    created_at: "2026-11-01T00:00:00Z",
    traits: { email: "grace@example.com" },
    verifiable_addresses: [{ verified: false }],
    credentials: { password: { identifiers: ["grace@example.com"] } },
  },
];

const sessions = [
  { identity: { id: ADA }, authenticated_at: "2026-11-20T10:00:00Z", active: true },
  { identity: { id: ADA }, authenticated_at: "2026-11-24T10:00:00Z", active: true },
];

/** A fake Kratos admin API, routed by path. */
function fakeKratos(url: string) {
  const u = new URL(url);
  const json = (body: unknown, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => body,
    headers: new Headers(),
  });
  if (u.pathname === "/admin/identities") {
    const ids = u.searchParams.getAll("ids");
    return json(ids.length ? identities.filter((i) => ids.includes(i.id)) : identities);
  }
  if (u.pathname === "/admin/sessions") return json(sessions);
  const one = u.pathname.match(/^\/admin\/identities\/([^/]+)$/);
  if (one) {
    const found = identities.find((i) => i.id === one[1]);
    return found ? json(found) : json({ error: "not found" }, 404);
  }
  const sess = u.pathname.match(/^\/admin\/identities\/([^/]+)\/sessions$/);
  if (sess) return json(sessions.filter((s) => s.identity.id === sess[1]));
  return json([], 404);
}

const profiles: KratosAdminRouterOptions = {
  resolveProfiles: async () => ({ [ADA]: { name: "Ada Lovelace", org: "Analytical", role: "owner" } }),
};

function makeApp(options: KratosAdminRouterOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(createKratosAdminRouter(options));
  app.use(createErrorMiddleware());
  return app;
}

describe("identity admin routes", () => {
  beforeEach(() => {
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos.test");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => fakeKratos(url)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("looks up identities that exist, with product profiles", async () => {
    const res = await request(makeApp(profiles))
      .post("/admin/identities/lookup")
      .set(siteAdminHeaders)
      .send({ ids: [ADA, GONE] })
      .expect(200);
    expect(res.body.identities).toEqual([
      {
        id: ADA,
        email: "ada@example.com",
        name: "Ada Lovelace",
        org: "Analytical",
        role: "owner",
        verified: true,
        admin: false,
        state: "active",
        created_at: "2026-10-30T00:00:00Z",
      },
    ]);
  });

  it("lists newest first with MFA and last sign-in", async () => {
    const res = await request(makeApp(profiles))
      .get("/admin/identities")
      .set(siteAdminHeaders)
      .expect(200);
    expect(res.body.total).toBe(2);
    expect(res.body.next_cursor).toBeNull();
    expect(res.body.identities.map((i: { id: string }) => i.id)).toEqual([GRACE, ADA]);
    const ada = res.body.identities[1];
    expect(ada).toMatchObject({ name: "Ada Lovelace", mfa: true, last_sign_in_at: "2026-11-24T10:00:00Z" });
    expect(res.body.identities[0]).toMatchObject({ mfa: false, last_sign_in_at: null });
  });

  it("pins site admins (ADMIN_EMAILS and verified) to the top", async () => {
    const previous = process.env.ADMIN_EMAILS;
    // Grace is listed but unverified, so she isn't an admin.
    process.env.ADMIN_EMAILS = "Ada@example.com, grace@example.com";
    try {
      const res = await request(makeApp(profiles)).get("/admin/identities").set(siteAdminHeaders).expect(200);
      expect(res.body.identities.map((i: { id: string; admin: boolean }) => [i.id, i.admin])).toEqual([
        [ADA, true],
        [GRACE, false],
      ]);
    } finally {
      if (previous === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = previous;
    }
  });

  it("searches by name, email or id prefix, and pages", async () => {
    const app = makeApp(profiles);
    const byName = await request(app).get("/admin/identities?q=lovelace").set(siteAdminHeaders).expect(200);
    expect(byName.body.identities.map((i: { id: string }) => i.id)).toEqual([ADA]);
    const byEmail = await request(app).get("/admin/identities?q=GRACE%40EXAMPLE").set(siteAdminHeaders).expect(200);
    expect(byEmail.body.identities.map((i: { id: string }) => i.id)).toEqual([GRACE]);
    const page1 = await request(app).get("/admin/identities?limit=1").set(siteAdminHeaders).expect(200);
    expect(page1.body.next_cursor).toBe("1");
    const page2 = await request(app).get("/admin/identities?limit=1&cursor=1").set(siteAdminHeaders).expect(200);
    expect(page2.body.identities.map((i: { id: string }) => i.id)).toEqual([ADA]);
    expect(page2.body.next_cursor).toBeNull();
  });

  it("gets one identity with second factors and sessions", async () => {
    const res = await request(makeApp(profiles))
      .get(`/admin/identities/${ADA}`)
      .set(siteAdminHeaders)
      .expect(200);
    expect(res.body.mfa_methods).toEqual(["totp"]);
    expect(res.body.active_sessions).toBe(2);
    expect(res.body.identity).toMatchObject({ role: "owner", last_sign_in_at: "2026-11-24T10:00:00Z" });
    await request(makeApp()).get(`/admin/identities/${GONE}`).set(siteAdminHeaders).expect(404);
  });

  it("requires a site admin", async () => {
    await request(makeApp())
      .get("/admin/identities")
      .set({ ...siteAdminHeaders, "x-user-is-admin": "false" })
      .expect(403);
  });

  it("returns 502 when Kratos is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await request(makeApp())
      .post("/admin/identities/lookup")
      .set(siteAdminHeaders)
      .send({ ids: [ADA] })
      .expect(502);
    await request(makeApp()).get("/admin/identities").set(siteAdminHeaders).expect(502);
  });
});
