import { AsyncLocalStorage } from "async_hooks";
import type { SafContext, SafContextWithAuth } from "./types.ts";
import crypto from "crypto";
import { typedEnv } from "@saflib/env";

export const testContext: SafContext = {
  requestId: "test-id",
  serviceName: "test",
  subsystemName: "test",
  operationName: "test",
};

export const safContextStorage = new AsyncLocalStorage<SafContext>();

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
export const setServiceName = (name: string) => {
  serviceName = name;
};

export const getServiceName = (): string => {
  if (typedEnv.NODE_ENV === "test") {
    return "test";
  }
  if (!serviceName) {
    throw new Error("Service name is not set");
  }
  return serviceName;
};
