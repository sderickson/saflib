import { describe, expect, it } from "vitest";
import request from "supertest";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createToken, opsDb } from "@saflib/ops-db";
import { TestObjectStore } from "@saflib/object-store";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";
import { runManualBackups } from "../backups/runner.ts";

describe("GET /ops/backups", () => {
  it("lists backups with their table stats", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "bkr-")), "main.sqlite");
    new Database(path).exec(`CREATE TABLE notes (id INTEGER PRIMARY KEY); INSERT INTO notes DEFAULT VALUES`);
    const dbKey = opsDb.connect();
    const backups = { databases: [{ name: "main", path }], store: new TestObjectStore() };
    const app = createApp({ dbKey, backups });
    await runManualBackups({ dbKey, config: backups });
    const { token } = await throwError(createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
    const res = await request(app).get("/ops/backups").set("authorization", `Bearer ${token}`).expect(200);
    expect(res.body).toMatchObject({ configured: true, retention_days: 14, databases: ["main"] });
    expect(res.body.backups[0]).toMatchObject({ database: "main", tag: "manual", status: "ok", tables: { notes: { rows: 1 } }, problems: [] });
    // Starting a backup is for site admins (session), not tokens.
    await request(app).post("/ops/backups/run").set("authorization", `Bearer ${token}`).expect(401);
  });

  it("runs the daily maintenance for the cron job (site admins)", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "bkm-")), "main.sqlite");
    new Database(path).exec(`CREATE TABLE notes (id INTEGER PRIMARY KEY)`);
    const dbKey = opsDb.connect();
    const app = createApp({ dbKey, backups: { databases: [{ name: "main", path }], store: new TestObjectStore() } });
    const admin = {
      "x-requested-with": "XMLHttpRequest",
      "x-user-id": "admin-1",
      "x-user-email": "admin@example.com",
      "x-user-email-verified": "true",
      "x-user-is-admin": "true",
      "x-user-mfa-completed": "true",
    };
    const first = await request(app).post("/ops/backups/maintenance").set(admin).send({}).expect(200);
    expect(first.body).toEqual({ configured: true, backed_up: 1, failed: 0, removed: 0, verified: 1 });
    // Once a day: running again backs nothing new up.
    const again = await request(app).post("/ops/backups/maintenance").set(admin).send({}).expect(200);
    expect(again.body.backed_up).toBe(0);
  });

  it("says when backups aren't configured", async () => {
    const dbKey = opsDb.connect();
    const app = createApp({ dbKey });
    const { token } = await throwError(createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
    const res = await request(app).get("/ops/backups").set("authorization", `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ configured: false, retention_days: null, databases: [], backups: [] });
  });
});
