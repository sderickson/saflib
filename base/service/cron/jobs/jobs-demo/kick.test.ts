import { describe, expect, it } from "vitest";
import { jobsDemoKickConfig } from "./kick.ts";

describe("jobsDemoKickConfig", () => {
  it("enqueues jobsDemoStepB without a handler", () => {
    expect(jobsDemoKickConfig.schedule).toBeTruthy();
    expect(jobsDemoKickConfig.enqueue.operationId).toBe("jobsDemoStepB");
    expect(jobsDemoKickConfig).not.toHaveProperty("handler");
  });
});
