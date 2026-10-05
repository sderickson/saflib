import { describe, it, expect, vi } from "vitest";
import {
  registerActiveAgentProcess,
  unregisterActiveAgentProcess,
  cancelActiveAgentProcess,
} from "./registry.ts";

describe("agent process registry", () => {
  it("returns false when nothing is registered for a run", () => {
    expect(cancelActiveAgentProcess("no-such-run")).toBe(false);
  });

  it("kills the registered handle and returns true", () => {
    const kill = vi.fn();
    registerActiveAgentProcess("run-1", { kill });

    expect(cancelActiveAgentProcess("run-1")).toBe(true);
    expect(kill).toHaveBeenCalledOnce();
  });

  it("returns false again after unregistering", () => {
    const kill = vi.fn();
    registerActiveAgentProcess("run-2", { kill });
    unregisterActiveAgentProcess("run-2");

    expect(cancelActiveAgentProcess("run-2")).toBe(false);
    expect(kill).not.toHaveBeenCalled();
  });

  it("a later registration for the same runId replaces the earlier one", () => {
    const firstKill = vi.fn();
    const secondKill = vi.fn();
    registerActiveAgentProcess("run-3", { kill: firstKill });
    registerActiveAgentProcess("run-3", { kill: secondKill });

    expect(cancelActiveAgentProcess("run-3")).toBe(true);
    expect(firstKill).not.toHaveBeenCalled();
    expect(secondKill).toHaveBeenCalledOnce();
  });
});
