import { afterEach, describe, expect, it } from "vitest";
import {
  _resetShutdownForTests,
  onShutdown,
  shutdown,
} from "./shutdown.ts";

afterEach(() => _resetShutdownForTests());

describe("shutdown", () => {
  it("runs every step together and waits for them", async () => {
    const order: string[] = [];
    onShutdown("slow", async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push("slow");
    });
    onShutdown("fast", () => {
      order.push("fast");
    });
    await shutdown("test", { exit: false });
    expect(order).toEqual(["fast", "slow"]);
  });

  it("keeps going when a step throws, and runs only once", async () => {
    let runs = 0;
    onShutdown("broken", () => {
      throw new Error("boom");
    });
    onShutdown("counted", () => {
      runs += 1;
    });
    await Promise.all([
      shutdown("test", { exit: false }),
      shutdown("again", { exit: false }),
    ]);
    expect(runs).toBe(1);
  });

  it("gives up after the timeout", async () => {
    onShutdown("stuck", () => new Promise(() => {}));
    const startedAt = Date.now();
    await shutdown("test", { exit: false, timeoutMs: 30 });
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });
});
