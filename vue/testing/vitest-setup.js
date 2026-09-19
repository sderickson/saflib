// Stubs for browser APIs not available in jsdom.
// This setup file is referenced by vitest-config.js and runs before each test file.

import { addErrorCollector } from "@saflib/node";
import { installLocalStorageStub } from "@saflib/vitest/local-storage-stub";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";

installLocalStorageStub();
addErrorCollector(() => {});

// jsdom's File/Blob lack undici's internal `_buffer`, so FormData uploads via
// openapi-fetch/fetch throw. Prefer Node's implementations for multipart tests.
if (typeof NodeFile === "function") {
  globalThis.File = NodeFile;
}
if (typeof NodeBlob === "function") {
  globalThis.Blob = NodeBlob;
}

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const first = args[0];
  if (
    typeof first === "string" &&
    (first.includes("router.resolve() was passed an invalid location") ||
      first.includes("No match found for location with path"))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Vuetify reads `window.navigator.maxTouchPoints` at module load (globals.ts).
// Some CI workers briefly have `window` without a usable `navigator`.
if (typeof globalThis.navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", {
    value: { maxTouchPoints: 0 },
    configurable: true,
  });
} else if (typeof globalThis.navigator.maxTouchPoints !== "number") {
  Object.defineProperty(globalThis.navigator, "maxTouchPoints", {
    value: 0,
    configurable: true,
  });
}
