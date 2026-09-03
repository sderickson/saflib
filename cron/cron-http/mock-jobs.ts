import type { JobsMap, CronEnqueuer } from "./src/types.ts";
import { vi } from "vitest";

export const mockEnqueueJob: CronEnqueuer = vi.fn().mockResolvedValue({
  deduped: false,
});

export const mockJobs: JobsMap = {
  "every-second-job": {
    schedule: "* * * * * *",
    enqueue: { operationId: "everySecondOp" },
  },
  "every-minute-job": {
    schedule: "0 * * * * *",
    enqueue: { operationId: "everyMinuteOp" },
  },
  "disabled-job": {
    schedule: "* * * * * *",
    enqueue: { operationId: "disabledOp" },
  },
  "new-job": {
    schedule: "* * * * *",
    enqueue: { operationId: "newJobOp" },
  },
  "fail-job": {
    schedule: "* * * * *",
    enqueue: { operationId: "failJobOp" },
  },
  "custom-dedupe-job": {
    schedule: "* * * * * *",
    enqueue: {
      operationId: "customDedupeOp",
      dedupeKey: "custom:dedupe",
      request: { body: { foo: 1 } },
      priority: 5,
    },
  },
};
