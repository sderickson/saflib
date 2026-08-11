// Stubs for browser APIs not available in jsdom.
// This setup file is referenced by vitest-config.js and runs before each test file.

import { addErrorCollector } from "@saflib/node";
import { installLocalStorageStub } from "@saflib/vitest/local-storage-stub";

installLocalStorageStub();
addErrorCollector(() => {});

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
