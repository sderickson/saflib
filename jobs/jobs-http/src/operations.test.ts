import { describe, expect, it } from "vitest";
import { asOpenApiDocument } from "@saflib/openapi";
import { TIMEOUT_CEILING_MS } from "./constants.ts";
import {
  buildOperationMap,
  cronTriggerKey,
  isCronTriggerKey,
  validateCronTriggerKeys,
  validateJobsStartup,
} from "./operations.ts";

const sampleSpec = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "test", version: "1.0.0" },
  paths: {
    "/jobs-demo/start": {
      post: {
        operationId: "startJobsDemo",
        security: [{ session: ["site-admin"] }],
        responses: { "200": { description: "ok" } },
      },
    },
    "/jobs-demo/step-b": {
      post: {
        operationId: "jobsDemoStepB",
        tags: ["background"],
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
    "/maintenance/purge": {
      post: {
        operationId: "purgeClaudeFilesMaintenance",
        tags: ["background"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
});

describe("buildOperationMap", () => {
  it("maps operation_id to method, path template, and background flag", () => {
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

  it("merges multiple specs into one map", () => {
    const other = asOpenApiDocument({
      openapi: "3.1.0",
      info: { title: "other", version: "1.0.0" },
      paths: {
        "/billing/push": {
          post: {
            operationId: "pushToStripeMatterFinalizations",
            tags: ["background"],
            responses: { "200": { description: "ok" } },
          },
        },
      },
    });

    const map = buildOperationMap([sampleSpec, other]);
    expect(map.get("pushToStripeMatterFinalizations")?.isBackground).toBe(true);
    expect(map.get("jobsDemoStepB")?.isBackground).toBe(true);
  });

  it("rejects duplicate operationId across specs", () => {
    const duplicate = asOpenApiDocument({
      openapi: "3.1.0",
      info: { title: "dup", version: "1.0.0" },
      paths: {
        "/other/start": {
          post: {
            operationId: "startJobsDemo",
            tags: ["background"],
            responses: { "200": { description: "ok" } },
          },
        },
      },
    });

    expect(() => buildOperationMap([sampleSpec, duplicate])).toThrow(
      /Duplicate operationId "startJobsDemo"/,
    );
  });
});

describe("cron trigger keys", () => {
  it("detects and builds cron: keys", () => {
    expect(isCronTriggerKey("cron:purgeClaudeFiles")).toBe(true);
    expect(isCronTriggerKey("purgeClaudeFiles")).toBe(false);
    expect(cronTriggerKey("purgeClaudeFiles")).toBe("cron:purgeClaudeFiles");
  });

  it("validateJobsStartup accepts cron: keys that are not operationIds", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          "cron:purgeClaudeFiles": ["purgeClaudeFilesMaintenance"],
          startJobsDemo: ["jobsDemoStepB"],
        },
        operations: sampleSpec,
      }),
    ).not.toThrow();
  });

  it("validateJobsStartup still requires cron: targets to be background ops", () => {
    expect(() =>
      validateJobsStartup({
        triggerMap: {
          "cron:purgeClaudeFiles": ["startJobsDemo"],
        },
        operations: sampleSpec,
      }),
    ).toThrow(/missing the "background" tag/);
  });

  it("validateCronTriggerKeys accepts matching JobsMap names", () => {
    expect(() =>
      validateCronTriggerKeys(
        {
          "cron:purgeClaudeFiles": ["purgeClaudeFilesMaintenance"],
          "cron:recoverySweep": ["runRecoverySweep"],
        },
        ["purgeClaudeFiles", "recoverySweep"],
      ),
    ).not.toThrow();
  });

  it("validateCronTriggerKeys rejects orphan cron: keys and missing jobs", () => {
    expect(() =>
      validateCronTriggerKeys(
        {
          "cron:purgeClaudeFiles": ["purgeClaudeFilesMaintenance"],
          "cron:unknownJob": ["purgeClaudeFilesMaintenance"],
        },
        ["purgeClaudeFiles", "recoverySweep"],
      ),
    ).toThrow(/unknownJob[\s\S]*recoverySweep/);
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
