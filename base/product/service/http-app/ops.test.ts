import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { makeAdminHeaders } from "@saflib/express";
import { baseDb } from "@saflib/base-db/instances";
import { getBaseOpsDbKey } from "@saflib/base-ops";
import { createToken } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { buildBaseHttpApp, type BaseHttpAppLease } from "./index.ts";

describe("ops API in the base app", () => {
  let lease: BaseHttpAppLease;

  beforeAll(() => {
    lease = buildBaseHttpApp({ mounts: [], isPublicRoute: () => false });
  });
  afterAll(() => {
    baseDb.disconnect(lease.baseDbKey);
  });

  it("defers /ops/* past the session gate to the ops-token scheme", async () => {
    const res = await request(lease.app).get("/ops/health").expect(401);
    // The ops resolver's message, not the session gate's generic one.
    expect(res.body.message).toMatch(/ops token/i);
  });

  it("serves health with base checks for a valid token", async () => {
    const { token } = await throwError(
      createToken(getBaseOpsDbKey(), { name: "test", scopes: ["ops:read"], createdBy: null }),
    );
    const res = await request(lease.app)
      .get("/ops/health")
      .set("authorization", `Bearer ${token}`)
      .expect(200);
    const names = res.body.health.checks.map((c: { name: string }) => c.name);
    expect(names).toEqual(expect.arrayContaining(["process", "disk", "base-db"]));
    const db = res.body.health.checks.find((c: { name: string }) => c.name === "base-db");
    expect(db.status).toBe("ok");
  });

  it("keeps token admin behind the session gate", async () => {
    await request(lease.app).get("/admin/ops-tokens").expect(401);
    await request(lease.app).get("/admin/ops-tokens").set(makeAdminHeaders()).expect(200);
  });
});
