import { expect, test } from "vitest";
import * as mainExports from "./index.ts";

test("package exports notify types helpers and SSE utilities", () => {
  expect(mainExports.RING_BUFFER_MAX_EVENTS).toBe(50);
  expect(mainExports.RING_BUFFER_MAX_AGE_MS).toBe(5 * 60 * 1000);
  expect(mainExports.SSE_MAX_CONNECTION_MS).toBe(20 * 60 * 1000);
  expect(mainExports.SSE_HEARTBEAT_INTERVAL_MS).toBe(30 * 1000);
  expect(typeof mainExports.InProcessChangeEmitter).toBe("function");
  expect(typeof mainExports.writeSseEvent).toBe("function");
  expect(typeof mainExports.writeSseComment).toBe("function");
  expect(typeof mainExports.validateSseOrigin).toBe("function");
});
