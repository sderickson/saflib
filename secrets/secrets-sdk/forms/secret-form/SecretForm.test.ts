import { describe, it, expect } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import SecretForm from "./SecretForm.vue";
import { secret_form_strings as strings } from "./SecretForm.strings.ts";
import { mountTestApp } from "../../test-app.ts";

describe("SecretForm", () => {
  stubGlobals();

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  it("should render the component", async () => {
    const wrapper = mountTestApp(SecretForm, {
      props: {
        items: [],
      },
    });

    // Check that the component renders with the expected strings
    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });
});
