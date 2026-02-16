// Stubs for browser APIs not available in jsdom.
// This setup file is referenced by vitest-config.js and runs before each test file.

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
