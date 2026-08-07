/**
 * Published in-process and on the SSE wire (JSON in the `data:` field).
 * Coarse change hint only — no resource bodies.
 */
export interface ChangeEvent {
  /** OpenAPI operationId of the write that completed. */
  operationId: string;
  /** Path params from the request (string values only). */
  params: Record<string, string>;
  /** Org scope for routing. */
  orgId: string;
}

/** Change event plus monotonic id for SSE `id:` / Last-Event-ID replay. */
export interface ChangeEventWithId extends ChangeEvent {
  id: string;
}

export type ChangeEventListener = (event: ChangeEventWithId) => void;

/**
 * Transport-agnostic change bus. In-process today; later Redis/NATS or HTTP.
 * Never import product/daemon types into implementations.
 */
export interface ChangeEmitter {
  /** Publish a change for the event's `orgId` channel. */
  publish(event: ChangeEvent): void;
  /**
   * Subscribe to an org channel. Returns an unsubscribe function.
   * Does not replay history — use `getEventsAfter` with Last-Event-ID for that.
   */
  subscribe(orgId: string, listener: ChangeEventListener): () => void;
  /**
   * Events strictly after `lastEventId` still held in the per-org ring buffer.
   * Empty when the id is unknown, expired, or at the tip.
   */
  getEventsAfter(orgId: string, lastEventId: string): ChangeEventWithId[];
}
