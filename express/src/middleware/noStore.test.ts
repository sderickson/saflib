import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { noStoreCacheControl } from "./noStore.ts";

describe("noStoreCacheControl", () => {
  it("sets anti-cache headers on the response", async () => {
    const app = express();
    app.use(noStoreCacheControl);
    app.get("/x", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get("/x").expect(200);

    expect(res.headers["cache-control"]).toBe(
      "private, no-store, no-cache, must-revalidate",
    );
    expect(res.headers["pragma"]).toBe("no-cache");
  });
});
