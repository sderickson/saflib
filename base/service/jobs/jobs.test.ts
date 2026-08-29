import { describe, expect, it } from "vitest";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import {
  TIMEOUT_CEILING_MS,
  validateCronTriggerKeys,
  validateJobsStartup,
} from "@saflib/jobs";
import { jsonSpec } from "@saflib/base-spec";
import { baseJobs } from "@saflib/base-cron";
import {
  baseJobOperations,
  baseTriggerMap,
  getBaseJobsSqlitePath,
  runBaseJobs,
} from "./jobs.ts";

const validationSpec: OpenAPIV3.DocumentV3 = {
  openapi: "3.0.0",
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
};

describe("baseTriggerMap / baseJobOperations", () => {
  it("defines the demo chain contract", () => {
    expect(baseTriggerMap.startJobsDemo).toEqual(["jobsDemoStepB"]);
    expect(baseTriggerMap.jobsDemoStepB).toEqual(["jobsDemoStepC"]);
    expect(baseTriggerMap["cron:jobsDemoKick"]).toEqual(["jobsDemoStepB"]);
    // Template stub for cron/add-job (golden product keeps placeholders registered).
    expect(baseTriggerMap["cron:__targetName__"]).toEqual(["jobsDemoStepB"]);
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

describe("getBaseJobsSqlitePath", () => {
  it("uses jobs/data/jobs-db-{DEPLOYMENT_NAME}.sqlite", () => {
    const sqlitePath = getBaseJobsSqlitePath();
    expect(sqlitePath).toMatch(/jobs[/\\]data[/\\]jobs-db-.+\.sqlite$/);
  });
});

describe("runBaseJobs", () => {
  it("is defined", () => {
    expect(runBaseJobs).toBeDefined();
  });
});
