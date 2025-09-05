import { afterAll, vi } from "vitest";

/**
 * Call during test setup to stub browser globals like ResizeObserver, matchMedia, location, and visualViewport.
 */
export const stubGlobals = () => {
  stubGlobalsSetup();

  afterAll(() => {
    stubGlobalsTeardown();
  });
};

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const matchMediaMock = (): MediaQueryList => {
  return {
    matches: false,
    media: "",
    onchange: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    addListener: () => {},
    removeListener: () => {},
  };
};

let scrollToOriginal = window.scrollTo;

function stubGlobalsSetup() {
  vi.stubGlobal("location", {
    href: "http://localhost",
  });
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("matchMedia", matchMediaMock);
  vi.stubGlobal("visualViewport", {
    width: 1000,
    height: 1000,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
  window.scrollTo = vi.fn();
}

function stubGlobalsTeardown() {
  vi.unstubAllGlobals();
  window.scrollTo = scrollToOriginal;
}
