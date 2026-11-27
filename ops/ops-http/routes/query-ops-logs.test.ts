import { describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createToken, opsDb } from "@saflib/ops-db";
import { logsDb } from "@saflib/node-log-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";

describe("POST /ops/logs/query", () => {
  it("needs ops:query, then runs read-only SQL over the logs DB", async () => {
    const dbKey = opsDb.connect();
    const logsDbKey = logsDb.connect({
      onDisk: join(mkdtempSync(join(tmpdir(), "opsq-")), "logs.sqlite"),
      overrideTestDefault: true,
    });
    const app = createApp({ dbKey, logsDbKey });
    const read = await throwError(createToken(dbKey, { name: "r", scopes: ["ops:read"], createdBy: null }));
    const query = await throwError(createToken(dbKey, { name: "q", scopes: ["ops:query"], createdBy: null }));
    const body = { sql: "SELECT count(*) AS n FROM product_events" };

    await request(app).post("/ops/logs/query").set("authorization", `Bearer ${read.token}`).send(body).expect(403);
    const res = await request(app).post("/ops/logs/query").set("authorization", `Bearer ${query.token}`).send(body).expect(200);
    expect(res.body).toMatchObject({ columns: ["n"], rows: [[0]], truncated: false });
    await request(app)
      .post("/ops/logs/query")
      .set("authorization", `Bearer ${query.token}`)
      .send({ sql: "DELETE FROM log_entries" })
      .expect(400);
  });

  it("404s when logs aren't persisted", async () => {
    const dbKey = opsDb.connect();
    const app = createApp({ dbKey });
    const q = await throwError(createToken(dbKey, { name: "q", scopes: ["ops:query"], createdBy: null }));
    await request(app).post("/ops/logs/query").set("authorization", `Bearer ${q.token}`).send({ sql: "SELECT 1" }).expect(404);
  });
});
