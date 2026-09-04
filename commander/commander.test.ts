import { expect, test, describe, beforeEach, afterEach } from "vitest";
import { setupContext, getCliContext, getCliReporters } from "./index.ts";

describe("setupContext", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  test("sets up context with default values", () => {
    setupContext(
      {
        serviceName: "cli",
      },
      () => {
        const context = getCliContext();
        expect(context.serviceName).toBe("cli");
        expect(context.subsystemName).toBe("cli");
        expect(context.operationName).toBe(process.argv[2] ?? "help");
        expect(context.requestId).toBeDefined();
      },
    );
  });

  test("sets up context with custom values", () => {
    setupContext(
      {
        serviceName: "test-service",
      },
      () => {
        const context = getCliContext();
        expect(context.serviceName).toBe("test-service");
        expect(context.subsystemName).toBe("cli");
        expect(context.operationName).toBe(process.argv[2] ?? "help");
        expect(context.requestId).toBeDefined();
      },
    );
  });

  test("sets up reporters", () => {
    setupContext(
      {
        serviceName: "cli",
      },
      () => {
        const reporters = getCliReporters();
        expect(reporters.log).toBeDefined();
        expect(reporters.logError).toBeDefined();
      },
    );
  });

  test("uses silent logging when specified", () => {
    setupContext(
      {
        serviceName: "cli",
        silentLogging: true,
      },
      () => {
        const reporters = getCliReporters();
        expect(reporters.log).toBeDefined();
        expect(reporters.logError).toBeDefined();
      },
    );
  });
});

