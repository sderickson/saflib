import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLogger,
  addSimpleStreamTransport,
  removeAllSimpleStreamTransports,
} from "./logger.ts";

describe("Logger", () => {
  let logSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logSpy = vi.fn();
    addSimpleStreamTransport(logSpy);
  });

  afterEach(() => {
    removeAllSimpleStreamTransports();
    vi.clearAllMocks();
  });

  it("should log a message through the console transport when a child logger is used", () => {
    const testReqId = "test-req-123";
    const testMessage = "This is a test message";

    const logger = createLogger(testReqId);
    logger.info(testMessage);

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(testMessage));
  });

  it("should include reqId in the formatted output", () => {
    const testReqId = "req-id";
    const testMessage = "Format test";
    const logger = createLogger(testReqId);
    logger.info(testMessage);

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(testReqId));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(testMessage));
  });
});
