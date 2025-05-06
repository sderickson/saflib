import { describe, it, expect } from "vitest";
import {
  HandledDatabaseError,
  UnhandledDatabaseError,
  queryWrapper,
} from "./errors.ts";

class TestDatabaseError extends HandledDatabaseError {
  constructor(message: string) {
    super(message);
    this.name = "TestDatabaseError";
  }
}

describe("Error handling", () => {
  describe("HandledDatabaseError", () => {
    it("should create a handled error with correct name and message", () => {
      const error = new TestDatabaseError("Test error message");
      expect(error.name).toBe("TestDatabaseError");
      expect(error.message).toBe("Test error message");
      expect(error).toBeInstanceOf(HandledDatabaseError);
    });
  });

  describe("UnhandledDatabaseError", () => {
    it("should create error with generic message", () => {
      const error = new UnhandledDatabaseError();
      expect(error.message).toBe(
        "A database library did not catch and handle an error. Check logs.",
      );
      expect(error.name).toBe("UnhandledDatabaseError");
    });
  });

  describe("queryWrapper", () => {
    it("should pass through successful query results", async () => {
      const wrappedQuery = queryWrapper(async () => "success");
      await expect(wrappedQuery()).resolves.toBe("success");
    });

    it("should pass through handled errors", async () => {
      const testError = new TestDatabaseError("Test error");
      const wrappedQuery = queryWrapper(async () => {
        throw testError;
      });
      await expect(wrappedQuery()).rejects.toThrow(testError);
    });

    it("should wrap unhandled errors", async () => {
      const originalError = new Error("Something went wrong");
      const wrappedQuery = queryWrapper(async () => {
        throw originalError;
      });
      await expect(wrappedQuery()).rejects.toThrow(UnhandledDatabaseError);
      await expect(wrappedQuery()).rejects.toThrow(
        "A database library did not catch and handle an error. Check logs.",
      );
    });

    it("should handle query with parameters", async () => {
      const wrappedQuery = queryWrapper(
        async (a: number, b: string) => `${a}-${b}`,
      );
      await expect(wrappedQuery(1, "test")).resolves.toBe("1-test");
    });
  });
});
