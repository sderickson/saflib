import type { JobsMap } from "./src/types.ts";
import { vi } from "vitest";

export const mockJobHandler = vi.fn();
export const mockMinuteJobHandler = vi.fn();

export const mockJobs: JobsMap = {
  "every-second-job": {
    schedule: "* * * * * *",
    handler: mockJobHandler,
  },
  "every-minute-job": {
    schedule: "0 * * * * *",
    handler: mockMinuteJobHandler,
  },
  "disabled-job": {
    schedule: "* * * * * *",
    handler: vi.fn(),
  },
  "timeout-default-job": {
    schedule: "0 * * * * *",
    handler: vi.fn().mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(11 * 1000);
    }),
  },
  "new-job": {
    schedule: "* * * * *",
    handler: vi.fn(),
  },
  "fail-job": {
    schedule: "* * * * *",
    handler: vi.fn(),
  },
};
