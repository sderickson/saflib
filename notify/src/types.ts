/**
 * Published in-process and on the SSE wire (JSON in the `data:` field).
 * Coarse change hint only — no resource bodies.
 */
export interface ChangeEvent {
  /** OpenAPI operationId of the write that completed. */
  operation_id: string;
  /** Path params from the request (string values only). */
  params: Record<string, string>;
  /**
   * Which channel this event publishes on. Purely a routing key — this
   * package has no opinion on what a channel *means*; the product decides
   * and should name it so that's clear from the string itself (e.g.
   * `"org:<id>"` for an org-wide channel, `"workflow-run:<id>"` for a
   * single run's own channel).
   */
  channel_id: string;
}

/** Change event plus monotonic id for SSE `id:` / Last-Event-ID replay. */
export interface ChangeEventWithId extends ChangeEvent {
  id: string;
}

export type ChangeEventListener = (event: ChangeEventWithId) => void;

/**
 * Transport-agnostic change bus. In-process today; later Redis/NATS or HTTP.
 * Never import product-specific types into implementations.
 */
export interface ChangeEmitter {
  /** Publish a change on the event's `channel_id` channel. */
  publish(event: ChangeEvent): void;
  /**
   * Subscribe to a channel. Returns an unsubscribe function.
   * Does not replay history — use `getEventsAfter` with Last-Event-ID for that.
   */
  subscribe(channelId: string, listener: ChangeEventListener): () => void;
  /**
   * Events strictly after `lastEventId` still held in the channel's ring
   * buffer. Empty when the id is unknown, expired, or at the tip.
   */
  getEventsAfter(channelId: string, lastEventId: string): ChangeEventWithId[];
}
