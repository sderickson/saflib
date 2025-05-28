import { describe, it, expect } from "vitest";
import { createChain } from "./chain.ts";
import type { FactoryFunctionOptions } from "./xstate.ts";

describe("createChain", () => {
  it("should create a chain with proper initial state and state transitions", () => {
    // Mock factory functions
    const mockFactory1 = ({ stateName, nextStateName, message }: { message: string } & FactoryFunctionOptions) => ({
      [stateName]: {
        entry: `log: ${message}`,
        on: {
          continue: {
            target: nextStateName,
          },
        },
      },
    });

    const mockFactory2 = ({ stateName, nextStateName, value }: { value: number } & FactoryFunctionOptions) => ({
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
      [mockFactory1, { message: "first step" }],
      [mockFactory2, { value: 42 }],
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

  it("should throw error for empty factory array", () => {
    expect(() => createChain([])).toThrow("At least one factory function is required");
  });

  it("should work with a single factory", () => {
    const singleFactory = ({ stateName, nextStateName }: FactoryFunctionOptions) => ({
      [stateName]: {
        entry: "single step",
        on: {
          finish: {
            target: nextStateName,
          },
        },
      },
    });

    const result = createChain([[singleFactory, {}]]);

    expect(result.initial).toBe("step1");
    expect(result.states.step1.on.finish.target).toBe("done");
  });
}); 