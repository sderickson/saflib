import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { isInternalRequest, markInternal } from "./markInternal.ts";

describe("markInternal", () => {
  it("tags requests so isInternalRequest returns true and the app still responds", async () => {
    const app = express();
    app.get("/probe", (req, res) => {
      res.status(200).json({
        internal: isInternalRequest(req),
        // Tag must not appear as a string-keyed / enumerable property
        enumerableInternalKeys: Object.keys(req).filter((k) =>
          k.toLowerCase().includes("internal"),
        ),
      });
    });

    const res = await request(markInternal(app)).get("/probe").expect(200);

    expect(res.body.internal).toBe(true);
    expect(res.body.enumerableInternalKeys).toEqual([]);
  });

  it("leaves unmarked requests untagged", async () => {
    const app = express();
    app.get("/probe", (req, res) => {
      res.status(200).json({ internal: isInternalRequest(req) });
    });

    const res = await request(app).get("/probe").expect(200);
    expect(res.body.internal).toBe(false);
  });

  it("does not treat spoofed headers as an internal tag", async () => {
    const app = express();
    app.get("/probe", (req, res) => {
      res.status(200).json({ internal: isInternalRequest(req) });
    });

    const res = await request(app)
      .get("/probe")
      .set("X-Saf-Internal", "true")
      .set("X-Saf-Identity-Assertion", "forged")
      .expect(200);

    expect(res.body.internal).toBe(false);
  });
});
