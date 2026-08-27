import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { makeAdminHeaders, makeUserHeaders } from "@saflib/express";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
  type SlimRouteTestContext,
} from "#testing/slim-route-test.ts";
import { createAdminRouter } from "./index.ts";

describe("getUsersByIdAdmin", () => {
  let ctx: SlimRouteTestContext;
  const adminUserId = "admin-users-by-id";
  const adminEmail = "admin@example.com";
  const otherUserId = "user-users-by-id";

  beforeAll(() => {
    ctx = acquireRouterSlimRouteTest(createAdminRouter);
  });

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    releaseSlimRouteTest(ctx.lease);
  });

  it("returns 200 with identity JSON from Kratos", async () => {
    const identity = {
      id: "33333333-3333-3333-3333-333333333333",
      schema_id: "default",
      traits: { email: "from-kratos@example.com" },
      state: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(identity), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await request(ctx.app)
      .get("/admin/users/by-id")
      .query({ id: identity.id })
      .set(makeAdminHeaders(adminUserId, adminEmail));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ identity });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `http://kratos:4434/admin/identities/${identity.id}`,
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("returns 404 when Kratos returns 404", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    const response = await request(ctx.app)
      .get("/admin/users/by-id")
      .query({ id: "00000000-0000-0000-0000-000000000000" })
      .set(makeAdminHeaders(adminUserId, adminEmail));

    expect(response.status).toBe(404);
  });

  it("returns 403 for a non-admin user", async () => {
    const response = await request(ctx.app)
      .get("/admin/users/by-id")
      .query({ id: "33333333-3333-3333-3333-333333333333" })
      .set(makeUserHeaders(otherUserId));

    expect(response.status).toBe(403);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const response = await request(ctx.app)
      .get("/admin/users/by-id")
      .query({ id: "33333333-3333-3333-3333-333333333333" });

    expect(response.status).toBe(401);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
