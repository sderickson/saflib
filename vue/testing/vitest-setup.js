// Stubs for browser APIs not available in jsdom.
// This setup file is referenced by vitest-config.js and runs before each test file.

import { installLocalStorageStub } from "@saflib/vitest/local-storage-stub";

installLocalStorageStub();
// Do not import `@saflib/node` or `node:*` here — Vitest 5 runs setup through
// Vite's client pipeline (jsdom), which breaks on Node built-ins. Multipart
// upload tests that need Node File/Blob should use `environment: "node"` or a
// dedicated setup file.

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
