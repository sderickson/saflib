import client from "@prometheus-io/client";

/** Distinct event names counted before the rest are lumped into `other`. */
export const MAX_EVENT_NAMES = 200;

const existing = client.register.getSingleMetric("saf_product_events_total");
const productEvents =
  (existing as client.Counter<"event"> | undefined) ??
  new client.Counter({
    name: "saf_product_events_total",
    help: "Product events captured, by event name only (no user, org or property labels)",
    labelNames: ["event"],
  });

const seen = new Set<string>();

/**
 * Count one event. The only label is the name, which comes from the
 * product's typed event union, so series stay few; past
 * `MAX_EVENT_NAMES` distinct names, new ones count as `other`.
 */
export function countProductEvent(name: string): void {
  if (!seen.has(name) && seen.size >= MAX_EVENT_NAMES) {
    productEvents.inc({ event: "other" });
    return;
  }
  seen.add(name);
  productEvents.inc({ event: name });
}
