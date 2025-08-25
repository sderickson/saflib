import { expect, test, describe, beforeEach, afterEach } from "vitest";
import { setupContext } from "./index.js";
import { getSafContext, getSafReporters } from "@saflib/node";

describe("setupContext", () => {
  beforeEach(() => {
    // Clear any existing context
    (globalThis as any).__SAF_CONTEXT__ = undefined;
    (globalThis as any).__SAF_REPORTERS__ = undefined;
  });

  afterEach(() => {
    // Clean up after tests
    (globalThis as any).__SAF_CONTEXT__ = undefined;
    (globalThis as any).__SAF_REPORTERS__ = undefined;
  });

  test("sets up context with default values", () => {
    setupContext();

    const context = getSafContext();
    expect(context.serviceName).toBe("cli");
    expect(context.subsystemName).toBe("cli");
    expect(context.operationName).toBe(process.argv[2]);
    expect(context.requestId).toBeDefined();
  });

  test("sets up context with custom values", () => {
    setupContext({
      serviceName: "test-service",
      operationName: "test-operation",
      subsystemName: "test",
      silentLogging: true,
    });

    const context = getSafContext();
    expect(context.serviceName).toBe("test-service");
    expect(context.subsystemName).toBe("test");
    expect(context.operationName).toBe("test-operation");
    expect(context.requestId).toBeDefined();
  });

  test("sets up reporters", () => {
    setupContext();

    const reporters = getSafReporters();
    expect(reporters.log).toBeDefined();
    expect(reporters.logError).toBeDefined();
  });

  test("uses silent logging when specified", () => {
    setupContext({ silentLogging: true });

    const reporters = getSafReporters();
    expect(reporters.log).toBeDefined();
    expect(reporters.logError).toBeDefined();
  });
});
