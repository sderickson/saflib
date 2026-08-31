import createError from "http-errors";
import { createHandler } from "./handler.ts";
import type { AnalyticsResponseBody } from "@saflib/analytics-spec";
import { listProductEvents } from "../lib/productEventBuffer.ts";

export function createListProductEventsHandler() {
  return createHandler(async (req, res) => {
    const name =
      typeof req.query.name === "string" ? req.query.name : undefined;
    const limitRaw =
      typeof req.query.limit === "string" ? req.query.limit : undefined;
    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = Number(limitRaw);
      if (!Number.isFinite(limit) || limit < 1) {
        throw createError(400, "Invalid limit");
      }
    }

    const product_events = listProductEvents({ name, limit });
    res
      .status(200)
      .json({ product_events } satisfies AnalyticsResponseBody["listProductEvents"][200]);
  });
}
