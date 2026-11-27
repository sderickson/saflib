/**
 * Ops-token limits use `@saflib/rate-limit` (memory store: each product color
 * is one process, and a restart resetting the windows is fine).
 */
export { createFixedWindowLimiter, type FixedWindowLimiter } from "@saflib/rate-limit";
