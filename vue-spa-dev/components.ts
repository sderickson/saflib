import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component, Plugin } from "vue";
import { beforeAll, afterAll, afterEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { setupServer } from "msw/node";
import { HttpHandler } from "msw";
/**
 * Creates a Vuetify instance for testing
 * @returns A Vuetify instance
 */
function createTestVuetify() {
  return createVuetify({
    components,
    directives,
  });
}

/**
 * Mock implementation of ResizeObserver for testing
 */
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * Sets up ResizeObserver mock for tests
 * Should be called in beforeAll
 */
function setupResizeObserverMock() {
  // We need to check if ResizeObserver exists to avoid overriding it if it's already defined
  if (typeof global.ResizeObserver === "undefined") {
    global.ResizeObserver = ResizeObserverMock;
    global.location = {
      href: "http://localhost",
    } as Location;
  }
}

/**
 * Tears down ResizeObserver mock after tests
 * Should be called in afterAll
 */
function teardownResizeObserverMock() {
  // Only delete if it's our mock implementation
  if (global.ResizeObserver === ResizeObserverMock) {
    // @ts-expect-error - ResizeObserver is not defined in the test environment
    delete global.ResizeObserver;
  }
}

/**
 * Deprecated - use useResizeObserverMock instead
 */
export function withResizeObserverMock(callback: () => void) {
  beforeAll(() => {
    setupResizeObserverMock();
  });

  callback();

  afterAll(() => {
    teardownResizeObserverMock();
  });
}

/**
 * Use this instead of withResizeObserverMock - you don't have to wrap your tests in a function
 */
export const useResizeObserverMock = () => {
  setupResizeObserverMock();

  afterAll(() => {
    teardownResizeObserverMock();
  });
};

/**
 * Helper function to mount a component with Vuetify
 * @param component - The component to mount
 * @param options - Mount options
 * @returns The mounted component wrapper
 */

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [],
});

interface MountWithPluginsOptions {
  router?: Plugin;
}

export function mountWithVuetify(
  component: Component,
  options: ComponentMountingOptions<Component> = {},
  pluginOptions: MountWithPluginsOptions = {},
) {
  const vuetify = createTestVuetify();
  // To suppress warnings, provide your own router
  const router =
    pluginOptions.router ||
    createRouter({
      history: createMemoryHistory(),
      routes: [],
    });

  return mount(component, {
    ...options,
    global: {
      plugins: [vuetify, router, VueQueryPlugin],
      ...(options.global || {}),
    },
  });
}

// This is the new name. Should refactor off "mountWithVuetify"
export const mountWithPlugins = mountWithVuetify;

// For when you need to wait for a condition to be true, probably because of mocked networking
export async function waitFor<T>(check: () => T) {
  let countdown = 10;
  let result: T | null = null;
  while (countdown > 0) {
    result = check();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
    countdown--;
  }
  return result;
}

export function setupMockServer(handlers: HttpHandler[]) {
  const server = setupServer(...handlers);

  // Start server before all tests
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  // Reset handlers between tests
  afterEach(() => server.resetHandlers());

  // Clean up after all tests
  afterAll(() => server.close());

  return server;
}
