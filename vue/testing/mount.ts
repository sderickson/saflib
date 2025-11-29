import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { QueryClient } from "@tanstack/vue-query";
import { createI18n } from "vue-i18n";
import type { CreateVueAppInstanceOptions } from "../src/app.ts";

/**
 * Options for the `mountWithPlugins` function.
 */
export interface MountWithPluginsOptions extends CreateVueAppInstanceOptions {}

/**
 * Mount a Vue component with plugins. Handles plugins like vuetify, router, and i18n. Uses `mount` under the hood.
 *
 * This function uses the same app creation logic as `createVueApp` to ensure consistency between tests and production.
 */
export function mountWithPlugins(
  component: Component,
  options: ComponentMountingOptions<Component> = {},
  pluginOptions: MountWithPluginsOptions = {},
) {
  const vuetify = createVuetify({
    components,
    directives,
  });

  const router =
    pluginOptions.router ||
    createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/",
          component,
        },
      ],
    });

  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const i18n = createI18n({
    locale: "en",
    legacy: false,
    messages: { en: pluginOptions.i18nMessages ?? {} },
  });

  return mount(component, {
    ...options,
    global: {
      plugins: [vuetify, router, [VueQueryPlugin, { queryClient }], i18n],
      ...(options.global || {}),
    },
  });
}
