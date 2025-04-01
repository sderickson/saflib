import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component, Plugin } from "vue";
import { beforeAll, afterAll, afterEach, vi, expect } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { setupServer } from "msw/node";
import { HttpHandler } from "msw";

// GLOBAL MOCK HELPERS -----------------

export const stubGlobals = () => {
  stubGlobalsSetup();

  afterAll(() => {
    stubGlobalsTeardown();
  });
};

/**
 * Mock implementation of ResizeObserver for testing
 */
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubGlobalsSetup() {
  vi.stubGlobal("location", {
    href: "http://localhost",
  });
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
}

function stubGlobalsTeardown() {
  vi.unstubAllGlobals();
}

// MOUNT HELPERS -----------------

export interface MountWithPluginsOptions {
  router?: Plugin;
}

export function mountWithPlugins(
  component: Component,
  options: ComponentMountingOptions<Component> = {},
  pluginOptions: MountWithPluginsOptions = {},
) {
  const vuetify = createVuetify({
    components,
    directives,
  });

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

// NETWORKING MOCK HELPERS -----------------

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
