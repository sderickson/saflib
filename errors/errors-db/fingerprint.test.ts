import { describe, expect, it } from "vitest";
import { computeFingerprint, errorNameFromStack, inAppFrames } from "./fingerprint.ts";

const stackA = `TypeError: Cannot read properties of undefined (reading 'title')
    at renderRecipe (/app/recipes/service/http/routes/get-recipe.ts:41:17)
    at handler (/app/saflib/express/src/handler.ts:12:5)
    at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)
    at node:internal/process/task_queues:105:5`;
// Same code path after an unrelated edit shifted line numbers.
const stackB = stackA.replace(":41:17", ":44:9").replace(":12:5", ":13:5");

describe("fingerprints", () => {
  it("keeps our frames, drops library and runtime frames and line numbers", () => {
    expect(inAppFrames(stackA)).toEqual([
      "renderRecipe http/routes/get-recipe.ts",
      "handler express/src/handler.ts",
    ]);
  });

  it("groups the same stack across line-number changes", () => {
    const fp = (stack: string) =>
      computeFingerprint({ serviceName: "recipes", stack, errorName: "TypeError", message: "x" });
    expect(fp(stackA)).toBe(fp(stackB));
    expect(fp(stackA)).not.toBe(
      computeFingerprint({ serviceName: "hub", stack: stackA, errorName: "TypeError", message: "x" }),
    );
  });

  it("strips content hashes from bundled browser files", () => {
    const v1 = `Error: boom\n    at onClick (https://app.example.com/assets/index-B2xQ9z1a.js:1:2345)`;
    const v2 = `Error: boom\n    at onClick (https://app.example.com/assets/index-Zz88YyQq.js:1:999)`;
    expect(inAppFrames(v1)).toEqual(["onClick assets/index.js"]);
    expect(computeFingerprint({ serviceName: null, stack: v1, message: "boom" })).toBe(
      computeFingerprint({ serviceName: null, stack: v2, message: "boom" }),
    );
  });

  it("falls back to message shape, and lets an explicit fingerprint win", () => {
    const a = computeFingerprint({ serviceName: "s", message: "rate limited for token 12" });
    const b = computeFingerprint({ serviceName: "s", message: "rate limited for token 99" });
    expect(a).toBe(b);
    const c = computeFingerprint({ serviceName: "s", message: "different", fingerprint: "jobs.dead:x", stack: stackA });
    const d = computeFingerprint({ serviceName: "s", message: "other", fingerprint: "jobs.dead:x" });
    expect(c).toBe(d);
  });

  it("reads the error name from a stack string", () => {
    expect(errorNameFromStack(stackA)).toBe("TypeError");
    expect(errorNameFromStack("boom")).toBeUndefined();
  });
});
