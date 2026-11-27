import client from "@prometheus-io/client";

const existing = client.register.getSingleMetric("saf_product_events_rate_limited_total");

/** Browser product events dropped by rate limits, by signed-in user or anonymous. */
export const productEventsRateLimited =
  (existing as client.Counter<"who"> | undefined) ??
  new client.Counter({
    name: "saf_product_events_rate_limited_total",
    help: "Browser product events dropped by rate limits",
    labelNames: ["who"],
  });
