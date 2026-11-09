import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type express from "express";
import type { DbKey } from "@saflib/drizzle";
import { makeAdminHeaders, makeUserHeaders } from "@saflib/express";
import { createToken, opsDb, revokeToken } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";
import { createFixedWindowLimiter } from "../auth/rate-limit.ts";
import type { HealthCheck } from "../health/types.ts";

const failing: HealthCheck = {
  name: "always-fails",
  run: async () => ({ status: "fail", summary: "nope" }),
};
const slow: HealthCheck = {
  name: "slow",
  timeoutMs: 20,
  run: () => new Promise((resolve) => setTimeout(() => resolve({ status: "ok", summary: "late" }), 200)),
};

describe("ops API", () => {
  let dbKey: DbKey;
  let app: express.Express;

  async function token(scopes: ("ops:read" | "ops:triage")[] = ["ops:read"]) {
    return throwError(createToken(dbKey, { name: "t", scopes, createdBy: null }));
  }

  beforeEach(() => {
    dbKey = opsDb.connect();
    app = createApp({ dbKey });
  });

  describe("GET /ops/health", () => {
    it("rejects missing, malformed and unknown tokens with 401", async () => {
      await request(app).get("/ops/health").expect(401);
      await request(app).get("/ops/health").set("authorization", "Bearer nope").expect(401);
      await request(app)
        .get("/ops/health")
        .set("authorization", `Bearer safops_${"a".repeat(43)}`)
        .expect(401);
    });

    it("accepts a site admin's session instead of a token, but not other users'", async () => {
      await request(app).get("/ops/health").set(makeAdminHeaders()).expect(200);
      await request(app).get("/ops/health").set(makeUserHeaders()).expect(403);
      // Without MFA, a site admin's session is refused like on other admin routes.
      await request(app)
        .get("/ops/health")
        .set({ ...makeAdminHeaders(), "x-user-mfa-completed": "false" })
        .expect(403);
    });

    it("rejects revoked tokens", async () => {
      const t = await token();
      await throwError(revokeToken(dbKey, t.opsToken.id));
      await request(app).get("/ops/health").set("authorization", `Bearer ${t.token}`).expect(401);
    });

    it("returns aggregate health for a valid token", async () => {
      const t = await token();
      const res = await request(app)
        .get("/ops/health")
        .set("authorization", `Bearer ${t.token}`)
        .expect(200);
      expect(res.body.health.status).toMatch(/^(ok|warn)$/);
      expect(res.body.health.checks.map((c: { name: string }) => c.name)).toContain("process");
    });

    it("reports the worst status and turns timeouts into failures", async () => {
      app = createApp({ dbKey, healthChecks: [failing, slow] });
      const t = await token();
      const res = await request(app)
        .get("/ops/health")
        .set("authorization", `Bearer ${t.token}`)
        .expect(200);
      expect(res.body.health.status).toBe("fail");
      const byName = Object.fromEntries(
        res.body.health.checks.map((c: { name: string }) => [c.name, c]),
      );
      expect(byName.slow.status).toBe("fail");
      expect(byName.slow.summary).toMatch(/timed out/);
    });

    it("rate limits per token", async () => {
      app = createApp({
        dbKey,
        rateLimits: {
          limiters: {
            perToken: createFixedWindowLimiter({ limit: 2, windowMs: 60_000 }),
            failuresPerIp: createFixedWindowLimiter({ limit: 100, windowMs: 60_000 }),
          },
        },
      });
      const t = await token();
      const auth = { authorization: `Bearer ${t.token}` };
      await request(app).get("/ops/health").set(auth).expect(200);
      await request(app).get("/ops/health").set(auth).expect(200);
      const limited = await request(app).get("/ops/health").set(auth).expect(429);
      expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    });

    it("rate limits failed attempts per IP, then blocks even valid tokens", async () => {
      app = createApp({
        dbKey,
        rateLimits: {
          limiters: {
            perToken: createFixedWindowLimiter({ limit: 100, windowMs: 60_000 }),
            failuresPerIp: createFixedWindowLimiter({ limit: 2, windowMs: 60_000 }),
          },
        },
      });
      const bad = { authorization: "Bearer safops_not-a-real-token-000000000000" };
      await request(app).get("/ops/health").set(bad).expect(401);
      await request(app).get("/ops/health").set(bad).expect(401);
      await request(app).get("/ops/health").set(bad).expect(429);
      const t = await token();
      await request(app).get("/ops/health").set("authorization", `Bearer ${t.token}`).expect(429);
    });
  });

  describe("token admin", () => {
    it("requires a site admin", async () => {
      await request(app).get("/admin/ops-tokens").expect(401);
      await request(app).get("/admin/ops-tokens").set(makeUserHeaders()).expect(403);
    });

    it("requires a completed second factor, even for a site admin", async () => {
      const noMfa = { ...makeAdminHeaders(), "x-user-mfa-completed": "false" };
      const calls = [
        request(app).get("/admin/ops-tokens").set(noMfa),
        request(app).post("/admin/ops-tokens").set(noMfa).send({ name: "x", scopes: ["ops:read"] }),
        request(app).post("/admin/ops-tokens/1/revoke").set(noMfa).send({}),
        request(app).get("/ops/logs").set(noMfa),
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("MFA_REQUIRED");
      }
    });

    it("does not accept an ops token for admin routes", async () => {
      const t = await token(["ops:read", "ops:triage"]);
      await request(app)
        .get("/admin/ops-tokens")
        .set("authorization", `Bearer ${t.token}`)
        .expect(401);
    });

    it("creates a token that works once, lists it without the secret, and revokes it", async () => {
      const created = await request(app)
        .post("/admin/ops-tokens")
        .set(makeAdminHeaders())
        .send({ name: "maintenance agent", scopes: ["ops:read"] })
        .expect(201);
      const secret: string = created.body.token;
      expect(secret).toMatch(/^safops_/);
      expect(created.body.ops_token.created_by).toBeTruthy();

      await request(app).get("/ops/health").set("authorization", `Bearer ${secret}`).expect(200);

      const listed = await request(app).get("/admin/ops-tokens").set(makeAdminHeaders()).expect(200);
      expect(JSON.stringify(listed.body)).not.toContain(secret.slice(7));
      expect(JSON.stringify(listed.body)).not.toContain("token_hash");
      const id = created.body.ops_token.id;
      expect(listed.body.ops_tokens.map((t: { id: string }) => t.id)).toContain(id);

      await request(app)
        .post(`/admin/ops-tokens/${id}/revoke`)
        .set(makeAdminHeaders())
        .send({})
        .expect(200);
      await request(app)
        .post(`/admin/ops-tokens/${id}/revoke`)
        .set(makeAdminHeaders())
        .send({})
        .expect(409);
      await request(app)
        .post(`/admin/ops-tokens/nope/revoke`)
        .set(makeAdminHeaders())
        .send({})
        .expect(404);
      await request(app).get("/ops/health").set("authorization", `Bearer ${secret}`).expect(401);
    });

    it("rejects expiry in the past and unknown scopes", async () => {
      await request(app)
        .post("/admin/ops-tokens")
        .set(makeAdminHeaders())
        .send({ name: "x", scopes: ["ops:read"], expires_at: "2000-01-01T00:00:00Z" })
        .expect(400);
      await request(app)
        .post("/admin/ops-tokens")
        .set(makeAdminHeaders())
        .send({ name: "x", scopes: ["ops:admin"] })
        .expect(400);
    });
  });

  it("falls through for paths it does not own", async () => {
    await request(app).get("/opsfoo").expect(404);
    await request(app).get("/admin/other").expect(404);
  });
});
