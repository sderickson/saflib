import { describe, it, expect, vi } from "vitest";
import { stepSkipIf } from "./conditional-step.ts";
import type { WorkflowContext } from "./types.ts";

function fakeCtx(): WorkflowContext {
  return {
    runId: "run-1",
    workflowId: "test/workflow",
    stepIndex: 0,
    dbKey: Symbol("db") as any,
    mode: "run",
    cwd: "/tmp",
    originalWorkingDirectory: "/tmp",
    copiedFiles: {},
    isResume: false,
    log: vi.fn(),
  };
}

describe("stepSkipIf", () => {
  it("runs the wrapped step normally when the condition is false", async () => {
    const fn = vi.fn().mockResolvedValue({ status: "success" });
    const stepDef = stepSkipIf<{ value: number }, { flag: boolean }>(
      ({ context }) => !context.flag,
      "test-kind",
      fn,
      () => ({ value: 42 }),
    );

    const input = stepDef.input({ context: { flag: true } });
    expect(input).toEqual({ value: 42 });

    const outcome = await stepDef.run(input, fakeCtx());
    expect(outcome).toEqual({ status: "success" });
    expect(fn).toHaveBeenCalledWith({ value: 42 }, expect.anything());
  });

  it("skips the wrapped step (no-op success) when the condition is true", async () => {
    const fn = vi.fn().mockResolvedValue({ status: "success" });
    const stepDef = stepSkipIf<{ value: number }, { flag: boolean }>(
      ({ context }) => !context.flag,
      "test-kind",
      fn,
      () => ({ value: 42 }),
    );

    const input = stepDef.input({ context: { flag: false } });
    const outcome = await stepDef.run(input, fakeCtx());

    expect(outcome).toEqual({ status: "success" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("preserves the step's kind", () => {
    const stepDef = stepSkipIf<unknown, unknown>(
      () => true,
      "command",
      vi.fn(),
      () => ({}),
    );
    expect(stepDef.kind).toBe("command");
  });
});
