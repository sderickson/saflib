import { createHandler } from "./handler.ts";
import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { recordProductEvent } from "../lib/productEventBuffer.ts";

export function createRecordProductEventHandler() {
  return createHandler(async (req, res) => {
    const body = req.body as AnalyticsRequestBody["recordProductEvent"];
    recordProductEvent(body.product_event as Record<string, unknown>, "client");
    res.status(204).end();
  });
}
