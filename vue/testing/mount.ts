import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component, Plugin } from "vue";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { QueryClient } from "@tanstack/vue-query";
import { createI18n } from "vue-i18n";
import type { I18nMessages } from "../src/strings.ts";

/**
 * Options for the `mountWithPlugins` function.
 */
export interface MountWithPluginsOptions {
  router?: Plugin;
  i18nMessages?: I18nMessages;
}

/**
 * Mount a Vue component with plugins. Handles plugins like vuetify, router, and i18n. Uses `mount` under the hood.
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

  // To suppress warnings, provide your own router
  const router =
    pluginOptions.router ||
    createRouter({
      history: createMemoryHistory(),
      routes: [],
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
