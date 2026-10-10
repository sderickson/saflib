import { describe, it, expect } from "vitest";
import { isRunAdvancingForDisplay } from "./run-client-advancing.ts";

describe("isRunAdvancingForDisplay", () => {
  it("uses server is_advancing", () => {
    expect(
      isRunAdvancingForDisplay("r1", true, {
        advancePending: false,
      }),
    ).toBe(true);
  });

  it("treats orchestrator advance pending as advancing for the active run", () => {
    expect(
      isRunAdvancingForDisplay("r1", false, {
        activeRunId: "r1",
        advancePending: true,
      }),
    ).toBe(true);
    expect(
      isRunAdvancingForDisplay("r2", false, {
        activeRunId: "r1",
        advancePending: true,
      }),
    ).toBe(false);
  });

  it("treats in-flight agent message as advancing for that run", () => {
    expect(
      isRunAdvancingForDisplay("r1", false, {
        advancePending: false,
        agentMessagePendingRunId: "r1",
      }),
    ).toBe(true);
  });
});
