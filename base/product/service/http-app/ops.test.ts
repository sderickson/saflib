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
  let prevDeploymentName: string | undefined;

  beforeAll(() => {
    // Audit rows store DEPLOYMENT_NAME (non-null `env`); production always sets it.
    prevDeploymentName = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "base-ops-test";
    lease = buildBaseHttpApp({ mounts: [], isPublicRoute: () => false });
  });
  afterAll(() => {
    baseDb.disconnect(lease.baseDbKey);
    if (prevDeploymentName === undefined) delete process.env.DEPLOYMENT_NAME;
    else process.env.DEPLOYMENT_NAME = prevDeploymentName;
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
    expect(names).toEqual(
      expect.arrayContaining(["process", "disk", "base-db", "audit-rotation", "jobs", "cron"]),
    );
    const db = res.body.health.checks.find((c: { name: string }) => c.name === "base-db");
    expect(db.status).toBe("ok");
  });

  it("audits ops reads against the token, not a user", async () => {
    const { token, opsToken } = await throwError(
      createToken(getBaseOpsDbKey(), { name: "audited", scopes: ["ops:read"], createdBy: null }),
    );
    await request(lease.app)
      .get("/ops/deploys")
      .set("authorization", `Bearer ${token}`)
      .expect(200);
    // The recorder appends on response finish.
    await new Promise((resolve) => setImmediate(resolve));
    const logs = await request(lease.app)
      .get("/audit-logs")
      .set(makeAdminHeaders())
      .expect(200);
    const row = logs.body.audit_logs.find(
      (r: { event_type: string }) => r.event_type === "ops_api.deploys.read",
    );
    expect(row).toMatchObject({
      auth_method: "ops_token",
      actor_user_id: `ops_token:${opsToken.id}`,
    });
  });

  it("keeps token admin behind the session gate", async () => {
    await request(lease.app).get("/admin/ops-tokens").expect(401);
    await request(lease.app).get("/admin/ops-tokens").set(makeAdminHeaders()).expect(200);
  });
});
