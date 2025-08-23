import { describe, it, expect } from "vitest";
import { createChain } from "./chain.ts";
import type { ComposerFunctionOptions } from "../xstate.ts";

describe("createChain", () => {
  it("should create a chain with proper initial state and state transitions", () => {
    // Mock composer functions
    const mockComposer1 = ({
      stateName,
      nextStateName,
      message,
    }: { message: string } & ComposerFunctionOptions) => ({
      [stateName]: {
        entry: `log: ${message}`,
        on: {
          continue: {
            target: nextStateName,
          },
        },
      },
    });

    const mockComposer2 = ({
      stateName,
      nextStateName,
      value,
    }: { value: number } & ComposerFunctionOptions) => ({
      [stateName]: {
        entry: `setValue: ${value}`,
        on: {
          next: {
            target: nextStateName,
          },
        },
      },
    });

    const result = createChain([
      [mockComposer1, { message: "first step" }],
      [mockComposer2, { value: 42 }],
    ]);

    expect(result.initial).toBe("step1");
    expect(result.states).toHaveProperty("done");
    expect(result.states.done).toEqual({ type: "final" });
    expect(result.states).toHaveProperty("step1");
    expect(result.states).toHaveProperty("step2");

    // Verify the chain: step1 -> step2 -> done
    expect(result.states.step1.on.continue.target).toBe("step2");
    expect(result.states.step2.on.next.target).toBe("done");
  });

  it("should throw error for empty composer array", () => {
    expect(() => createChain([])).toThrow(
      "At least one composer function is required",
    );
  });

  it("should work with a single composer", () => {
    const singleComposer = ({
      stateName,
      nextStateName,
    }: ComposerFunctionOptions) => ({
      [stateName]: {
        entry: "single step",
        on: {
          finish: {
            target: nextStateName,
          },
        },
      },
    });

    const result = createChain([[singleComposer, {}]]);

    expect(result.initial).toBe("step1");
    expect(result.states.step1.on.finish.target).toBe("done");
  });
});
