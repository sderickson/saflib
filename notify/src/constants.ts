/** Default per-org ring buffer capacity (~50 events). */
export const RING_BUFFER_MAX_EVENTS = 50;

/** Default max age for buffered events (~5 minutes). */
export const RING_BUFFER_MAX_AGE_MS = 5 * 60 * 1000;

/** Server closes SSE connections after this duration; client reconnects. */
export const SSE_MAX_CONNECTION_MS = 20 * 60 * 1000;

/** Optional SSE comment heartbeat interval (~30 seconds). */
export const SSE_HEARTBEAT_INTERVAL_MS = 30 * 1000;
