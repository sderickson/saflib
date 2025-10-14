import { describe, it, expect } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import __TargetName__ from "./__TargetName__.vue";
import { __target_name___strings as strings } from "./__TargetName__.strings.ts";
import { mountTestApp } from "../../test-app.ts";

describe("__TargetName__", () => {
  stubGlobals();

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  it("should render the component", async () => {
    const wrapper = mountTestApp(__TargetName__, {
      props: {
        items: [],
      },
    });

    // Check that the component renders with the expected strings
    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });
});
