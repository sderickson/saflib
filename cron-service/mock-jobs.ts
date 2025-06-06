import { JobsMap } from "./src/types.ts";
import { vi } from "vitest";

export const mockJobHandler = vi.fn();
export const mockMinuteJobHandler = vi.fn();

export const mockJobs: JobsMap = {
  "every-second-job": {
    schedule: "* * * * * *",
    handler: mockJobHandler,
    enabled: true,
    timeoutSeconds: 2,
  },
  "every-minute-job": {
    schedule: "0 * * * * *",
    handler: mockMinuteJobHandler,
    enabled: true,
    timeoutSeconds: 2,
  },
  "disabled-job": {
    schedule: "* * * * * *",
    handler: vi.fn(),
    enabled: false,
  },
  "timeout-default-job": {
    schedule: "0 * * * * *",
    handler: vi.fn().mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(11 * 1000);
    }),
    enabled: true,
  },
  "new-job": {
    schedule: "* * * * *",
    handler: vi.fn(),
    enabled: true,
  },
  "fail-job": {
    schedule: "* * * * *",
    handler: vi.fn(),
    enabled: true,
  },
};
