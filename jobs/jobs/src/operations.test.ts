import { describe, expect, it } from "vitest";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { TIMEOUT_CEILING_MS } from "./constants.ts";
import { buildOperationMap, validateJobsStartup } from "./operations.ts";

const sampleSpec: OpenAPIV3.DocumentV3 = {
  openapi: "3.0.0",
  info: { title: "test", version: "1.0.0" },
  paths: {
    "/jobs-demo/start": {
      post: {
        operationId: "startJobsDemo",
        tags: ["jobs-demo"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/jobs-demo/step-b": {
      post: {
        operationId: "jobsDemoStepB",
        tags: ["jobs-demo", "background"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/jobs-demo/step-c": {
      post: {
        operationId: "jobsDemoStepC",
        tags: ["background"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

describe("buildOperationMap", () => {
  it("maps operationId to method, path template, and background flag", () => {
    const map = buildOperationMap(sampleSpec);

    expect(map.get("startJobsDemo")).toEqual({
      method: "POST",
      pathTemplate: "/jobs-demo/start",
      isBackground: false,
    });
    expect(map.get("jobsDemoStepB")).toEqual({
      method: "POST",
      pathTemplate: "/jobs-demo/step-b",
      isBackground: true,
    });
    expect(map.get("jobsDemoStepC")?.isBackground).toBe(true);
  });
});

describe("validateJobsStartup", () => {
  it("accepts a valid trigger map and operation config", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          startJobsDemo: ["jobsDemoStepB"],
          jobsDemoStepB: ["jobsDemoStepC"],
        },
        operationConfig: {
          jobsDemoStepB: { timeoutMs: 30_000, maxAttempts: 5 },
        },
        operations: sampleSpec,
      }),
    ).not.toThrow();
  });

  it("throws for unknown trigger-map keys and targets", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          unknownCaller: ["jobsDemoStepB"],
          startJobsDemo: ["unknownTarget"],
        },
        operations: sampleSpec,
      }),
    ).toThrow(/unknownCaller[\s\S]*unknownTarget/);
  });

  it("throws when a trigger-map target lacks the background tag", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          startJobsDemo: ["startJobsDemo"],
        },
        operations: sampleSpec,
      }),
    ).toThrow(/missing the "background" tag/);
  });

  it("throws when timeout overrides exceed the ceiling", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          startJobsDemo: ["jobsDemoStepB"],
        },
        operationConfig: {
          jobsDemoStepB: { timeoutMs: TIMEOUT_CEILING_MS + 1 },
        },
        operations: sampleSpec,
      }),
    ).toThrow(/exceeds ceiling/);
  });

  it("throws for unknown operationConfig keys", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {},
        operationConfig: {
          doesNotExist: { timeoutMs: 1_000 },
        },
        operations: sampleSpec,
      }),
    ).toThrow(/operationConfig key "doesNotExist"/);
  });
});
