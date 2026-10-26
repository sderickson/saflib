import { describe, it, expect, vi, onTestFinished } from "vitest";
import { getSafReporters } from "@saflib/node";
import { enqueueInBackground } from "./enqueue.ts";

describe("enqueueInBackground", () => {
  function spyOnLogError() {
    const spy = vi.spyOn(getSafReporters(), "logError").mockImplementation(() => {});
    onTestFinished(() => spy.mockRestore());
    return spy;
  }

  it("reports a failed enqueue instead of leaving the rejection unhandled", async () => {
    const logError = spyOnLogError();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    onTestFinished(() => {
      process.off("unhandledRejection", unhandled);
    });

    enqueueInBackground(() => Promise.reject(new Error("jobs socket gone")), "refresh stats");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(unhandled).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({ message: "jobs socket gone" }), {
      level: "warning",
      extra: { description: "refresh stats" },
    });
  });

  it("reports a synchronous throw too", () => {
    const logError = spyOnLogError();
    enqueueInBackground(() => {
      throw new Error("no auth context");
    }, "refresh stats");
    expect(logError).toHaveBeenCalledOnce();
  });

  it("reports nothing when the enqueue succeeds", async () => {
    const logError = spyOnLogError();
    enqueueInBackground(() => Promise.resolve({}), "refresh stats");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(logError).not.toHaveBeenCalled();
  });
});
