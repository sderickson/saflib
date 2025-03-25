import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component, Plugin } from "vue";
import { beforeAll, afterAll } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
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
 * Helper function to setup and teardown ResizeObserver mock in a describe block
 * @param callback - The test suite function
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
      plugins: [vuetify, router],
      ...(options.global || {}),
    },
  });
}

// This is the new name. Should refactor off "mountWithVuetify"
export const mountWithPlugins = mountWithVuetify;
