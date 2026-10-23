import { spawn } from "node:child_process";
import { describe, it, expect, vi } from "vitest";
import {
  registerActiveAgentProcess,
  unregisterActiveAgentProcess,
  cancelActiveAgentProcess,
  trackAgentProcess,
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

describe("trackAgentProcess", () => {
  function spawnDetached(script: string) {
    return spawn("sh", ["-c", script], { detached: true, stdio: "ignore" });
  }

  function exited(child: ReturnType<typeof spawn>) {
    return new Promise<void>((resolve) => child.once("close", () => resolve()));
  }

  it("stops the process group when the run is cancelled", async () => {
    // The shell's child `sleep` stands in for a tool call the agent spawned.
    const child = spawnDetached("sleep 30 & wait");
    const onStopping = vi.fn();
    const tracked = trackAgentProcess("track-1", child, onStopping);

    expect(cancelActiveAgentProcess("track-1")).toBe(true);
    await exited(child);
    expect(onStopping).toHaveBeenCalledOnce();
    expect(tracked.wasCancelled()).toBe(true);
    expect(cancelActiveAgentProcess("track-1")).toBe(false);
  });

  it("escalates to SIGKILL when the agent ignores SIGTERM", async () => {
    const child = spawn("sh", ["-c", 'trap "" TERM; echo ready; sleep 30 & wait'], {
      detached: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    trackAgentProcess("track-2", child, () => {});
    // Cancel only once the trap is installed, or SIGTERM wins the race.
    await new Promise((resolve) => child.stdout!.once("data", resolve));
    cancelActiveAgentProcess("track-2");
    await exited(child);
    expect(child.signalCode).toBe("SIGKILL");
  }, 10_000);

  it("unregisters when the agent exits on its own", async () => {
    const child = spawnDetached("exit 0");
    const tracked = trackAgentProcess("track-3", child, () => {});
    await exited(child);
    expect(cancelActiveAgentProcess("track-3")).toBe(false);
    expect(tracked.wasCancelled()).toBe(false);
  });
});
