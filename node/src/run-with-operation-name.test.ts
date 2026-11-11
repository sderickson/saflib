import { describe, expect, it } from "vitest";
import { safContextStorage } from "./context.ts";
import { runWithOperationName } from "./reporters.ts";
import type { SafContext } from "./types.ts";

const early: SafContext = {
  requestId: "r1",
  serviceName: "svc",
  subsystemName: "http",
  operationName: "unknown-operation",
};

describe("runWithOperationName", () => {
  it("relabels the current request context for the callback only", () => {
    safContextStorage.run(early, () => {
      const inside = runWithOperationName("putAnswers", () =>
        safContextStorage.getStore(),
      );
      expect(inside).toMatchObject({
        requestId: "r1",
        operationName: "putAnswers",
      });
      expect(safContextStorage.getStore()?.operationName).toBe(
        "unknown-operation",
      );
    });
  });

  it("carries the label through async work", async () => {
    await safContextStorage.run(early, async () => {
      const name = await runWithOperationName("putAnswers", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return safContextStorage.getStore()?.operationName;
      });
      expect(name).toBe("putAnswers");
    });
  });

  it("just runs the callback without a context or a name", () => {
    expect(
      runWithOperationName("op", () => safContextStorage.getStore()),
    ).toBeUndefined();
    safContextStorage.run(early, () => {
      expect(
        runWithOperationName(undefined, () => safContextStorage.getStore()),
      ).toBe(early);
    });
  });
});
