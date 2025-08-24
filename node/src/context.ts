import { AsyncLocalStorage } from "async_hooks";
import type { SafContext, SafContextWithAuth } from "./types.ts";
import crypto from "crypto";
import { typedEnv } from "@saflib/env";

/**
 * Context provided during testing.
 */
export const testContext: SafContext = {
  requestId: "test-id",
  serviceName: "test",
  subsystemName: "test",
  operationName: "test",
};

/**
 * Storage for SafContext.
 */
export const safContextStorage = new AsyncLocalStorage<SafContext>();

/**
 * Convenience function for getting SafContext store. Errors if not found,
 * returns testContext if in test mode.
 */
export const getSafContext = (): SafContext => {
  const store = safContextStorage.getStore();
  if (!store && typedEnv.NODE_ENV === "test") {
    return testContext;
  }
  if (!store) {
    throw new Error("SafContext not found");
  }
  return store;
};

/**
 * Convenience function for getting SafContext store with auth. Errors if either
 * the store is not found, or auth is not included.
 */
export const getSafContextWithAuth = (): SafContextWithAuth => {
  const store = safContextStorage.getStore();
  if (!store) {
    throw new Error("SafContext not found");
  }
  if (!store.auth) {
    throw new Error("Auth not found");
  }
  return store as SafContextWithAuth;
};

/**
 * Generates a request ID. Only necessary for "requests" which are not initiated by proxy servers,
 * such as for cron or async jobs.
 */
export function generateRequestId(): string {
  // Generate 16 random bytes
  const randomBytes = crypto.randomBytes(16);

  // Set version (4) and variant bits according to RFC 4122
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // version 4
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // variant 1

  // Convert to hex string with proper formatting
  return [
    randomBytes.toString("hex", 0, 4),
    randomBytes.toString("hex", 4, 6),
    randomBytes.toString("hex", 6, 8),
    randomBytes.toString("hex", 8, 10),
    randomBytes.toString("hex", 10, 16),
  ].join("-");
}

let serviceName: string | undefined = undefined;

/**
 * Sets the service name. Should be called as soon as the process starts. This is
 * provided in SafContext and to instrumentation.
 */
export const setServiceName = (name: string) => {
  serviceName = name;
};

/**
 * Getter for service name.
 */
export const getServiceName = (): string => {
  if (typedEnv.NODE_ENV === "test") {
    return "test";
  }
  if (!serviceName) {
    throw new Error("Service name is not set");
  }
  return serviceName;
};
