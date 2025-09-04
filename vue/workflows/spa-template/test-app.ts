import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { router } from "./router.ts";
import { templateFileStrings } from "./strings.ts";
import { identityServiceMockHandlers } from "@saflib/auth/mocks";

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
) => {
  return mountWithPlugins(Component, options, {
    router,
    i18nMessages: {
      ...templateFileStrings,
    },
  });
};

// TODO: import and add here any other mock handlers from sdk packages this SPA depends on
export const testAppHandlers = [...identityServiceMockHandlers];
