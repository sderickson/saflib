import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, consoleTransport } from "./logger.ts";

describe("Logger", () => {
  let logSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create a spy function to attach to the transport
    logSpy = vi.fn();
    // Attach the spy to the 'logged' event
    consoleTransport.on("logged", logSpy);
  });

  afterEach(() => {
    // Remove the listener after each test to avoid interference
    consoleTransport.removeListener("logged", logSpy);
    vi.clearAllMocks(); // Clear mocks
  });

  it("should log a message through the console transport when a child logger is used", () => {
    const testReqId = "test-req-123";
    const testMessage = "This is a test message";

    // Create a child logger
    const logger = createLogger(testReqId);

    // Log a message
    logger.info(testMessage);

    // Assert that the spy function was called
    expect(logSpy).toHaveBeenCalled();

    // Optional: Assert that it was called exactly once
    expect(logSpy).toHaveBeenCalledTimes(1);

    // Optional: Assert specific properties of the logged info
    // Note: The exact structure of the 'info' object depends on winston internals and formatters
    // This checks if the message and reqId were passed through
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(testMessage),
        reqId: testReqId,
        level: "info",
      }),
    );
  });

  // it("should include reqId in the formatted output", () => {
  //   const testReqId = "req-id-for-format";
  //   const testMessage = "Format test";
  //   const logger = createLogger(testReqId);

  //   logger.info(testMessage);

  //   expect(logSpy).toHaveBeenCalled();
  //   const loggedInfo = logSpy.mock.calls[0][0]; // Get the info object passed to the spy

  //   // Access the formatted message using the internal symbol
  //   const formattedMessage =
  //     loggedInfo[Symbol.for("message") as unknown as string];

  //   expect(formattedMessage).toContain(`<${testReqId}>`);
  //   expect(formattedMessage).toContain(`[info]: ${testMessage}`);
  // });
});
