import { describe, expect, it } from "vitest";
import request from "supertest";
import client from "prom-client";
import { createToken, opsDb } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";
import { recordCurrentBoot } from "../boot.ts";

const buildInfo = (ref: string) => ({
  buildRef: ref,
  image: "registry/svc",
  inputHash: `in-${ref}`,
  commits: { root: `root-${ref}`, saflib: "saflib-1" },
  dirty: false,
  builtAt: "2026-11-08T10:00:00.000Z",
});

describe("GET /ops/deploys", () => {
  it("returns the current boot, deploys newest first, and the boot count", async () => {
    const dbKey = opsDb.connect();
    // Two processes of build a (e.g. blue then a restart), then build b.
    await recordCurrentBoot(dbKey, buildInfo("a"));
    await recordCurrentBoot(dbKey, buildInfo("a"));
    const app = createApp({ dbKey, buildInfo: buildInfo("b") });
    const { token } = await throwError(
      createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }),
    );

    const res = await request(app)
      .get("/ops/deploys")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.current).toMatchObject({
      build_ref: "b",
      commit_root: "root-b",
      built_at: "2026-11-08T10:00:00.000Z",
      new_build: true,
      node_version: process.version,
    });
    expect(res.body.deploys.map((d: { build_ref: string }) => d.build_ref)).toEqual(["b", "a"]);
    expect(res.body.boots_last_24h).toBe(3);

    const metrics = await client.register.getSingleMetricAsString("saf_build_info");
    expect(metrics).toMatch(/saf_build_info\{[^}]*build_ref="b"[^}]*\} 1/);
    expect(metrics).not.toMatch(/build_ref="a"/);
  });

  it("works outside a built image (no build metadata)", async () => {
    const dbKey = opsDb.connect();
    const app = createApp({ dbKey });
    const { token } = await throwError(
      createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }),
    );
    const res = await request(app)
      .get("/ops/deploys?limit=5")
      .set("authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.current).toMatchObject({ build_ref: null, commit_root: null, new_build: true });
  });

  it("counts a config-only deploy (same image, new release stamp)", async () => {
    const dbKey = opsDb.connect();
    const release = (assets: string) => ({
      released_at: "2026-11-09T01:00:00.000Z",
      commits: { root: "deploy-root", saflib: "deploy-saflib" },
      assets_hash: assets,
    });
    await recordCurrentBoot(dbKey, buildInfo("a"), release("kratos-v1"));
    const app = createApp({ dbKey, buildInfo: buildInfo("a"), releaseInfo: release("kratos-v2") });
    const { token } = await throwError(
      createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }),
    );

    const res = await request(app)
      .get("/ops/deploys")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.current).toMatchObject({
      build_ref: "a",
      release_assets_hash: "kratos-v2",
      release_commit_root: "deploy-root",
      released_at: "2026-11-09T01:00:00.000Z",
      new_build: true,
    });
    expect(
      res.body.deploys.map((d: { release_assets_hash: string }) => d.release_assets_hash),
    ).toEqual(["kratos-v2", "kratos-v1"]);
  });
});
