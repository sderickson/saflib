import { describe, expect, it } from "vitest";
import { asOpenApiDocument } from "@saflib/openapi";
import {
  TIMEOUT_CEILING_MS,
  validateCronTriggerKeys,
  validateJobsStartup,
} from "@saflib/jobs-http";
import { jsonSpec } from "@saflib/base-spec";
import { baseJobs } from "@saflib/base-cron";
import {
  baseJobOperations,
  baseTriggerMap,
  runBaseJobs,
} from "./jobs.ts";

const validationSpec = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "base-jobs-test", version: "1.0.0" },
  paths: {
    "/test/start": {
      post: {
        operationId: "testJobStart",
        tags: [],
        responses: { "200": { description: "ok" } },
      },
    },
    "/test/step-b": {
      post: {
        operationId: "testJobStepB",
        tags: ["background"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/test/step-c": {
      post: {
        operationId: "testJobStepC",
        tags: ["background"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
});

describe("baseTriggerMap / baseJobOperations", () => {
  it("defines the demo chain contract", () => {
    expect(baseTriggerMap.startJobsDemo).toEqual(["jobsDemoStepB"]);
    expect(baseTriggerMap.jobsDemoStepB).toEqual(["jobsDemoStepC"]);
    expect(baseTriggerMap["cron:jobsDemoKick"]).toEqual(["jobsDemoStepB"]);
    // BEGIN WORKFLOW AREA cron-trigger-map-assert FOR cron/add-job
    // Template stub for cron/add-job (golden product keeps placeholders registered).
    expect(baseTriggerMap["cron:__targetName__"]).toEqual(["jobsDemoStepB"]);
    // END WORKFLOW AREA
  });

  it("passes startup validation against the regenerated base OpenAPI spec", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: baseTriggerMap,
        operationConfig: baseJobOperations,
        operations: jsonSpec,
      }),
    ).not.toThrow();
  });

  it("validates cron: trigger keys against baseJobs", () => {
    expect(() =>
      validateCronTriggerKeys(baseTriggerMap, Object.keys(baseJobs)),
    ).not.toThrow();
  });
});

describe("startup validation crashes on bad map entries", () => {
  it("throws for unknown operation ids", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          unknownCaller: ["testJobStepB"],
          testJobStart: ["unknownTarget"],
        },
        operations: validationSpec,
      }),
    ).toThrow(/unknownCaller[\s\S]*unknownTarget/);
  });

  it("throws when a trigger-map target lacks the background tag", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          testJobStart: ["testJobStart"],
        },
        operations: validationSpec,
      }),
    ).toThrow(/missing the "background" tag/);
  });

  it("throws when timeout overrides exceed the ceiling", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          testJobStart: ["testJobStepB"],
          testJobStepB: ["testJobStepC"],
        },
        operationConfig: {
          testJobStepB: { timeoutMs: TIMEOUT_CEILING_MS + 1 },
        },
        operations: validationSpec,
      }),
    ).toThrow(/exceeds ceiling/);
  });
});

describe("runBaseJobs", () => {
  it("is defined", () => {
    expect(runBaseJobs).toBeDefined();
  });
});
