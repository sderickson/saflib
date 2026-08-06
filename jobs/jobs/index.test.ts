import { expect, test } from "vitest";
import * as mainExports from "./index.ts";

test("package exports constants, types helpers, and operation resolver", () => {
  expect(mainExports.CLAIM_POLL_INTERVAL_MS).toBe(500);
  expect(mainExports.GLOBAL_CONCURRENCY).toBe(8);
  expect(mainExports.BACKOFF_BASE_MS).toBe(5_000);
  expect(mainExports.BACKOFF_FACTOR).toBe(4);
  expect(mainExports.BACKOFF_MAX_MS).toBe(5 * 60 * 1000);
  expect(mainExports.DEFAULT_MAX_ATTEMPTS).toBe(5);
  expect(mainExports.REQUEST_SIZE_CAP_BYTES).toBe(16 * 1024);
  expect(mainExports.ERROR_BODY_CAP_BYTES).toBe(8 * 1024);
  expect(mainExports.DEFAULT_TIMEOUT_MS).toBe(30_000);
  expect(mainExports.TIMEOUT_CEILING_MS).toBe(120_000);
  expect(mainExports.RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
  expect(mainExports.STALL_GRACE_MS).toBe(30_000);
  expect(mainExports.SPAWN_CAP).toBe(1_000);
  expect(mainExports.BACKGROUND_TAG).toBe("background");
  expect(typeof mainExports.buildOperationMap).toBe("function");
  expect(typeof mainExports.validateJobsStartup).toBe("function");
  expect(typeof mainExports.runJobs).toBe("function");
  expect(typeof mainExports.signalJobsWake).toBe("function");
});
