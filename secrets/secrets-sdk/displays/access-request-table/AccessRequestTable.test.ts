import { describe, it, expect } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import AccessRequestTable from "./AccessRequestTable.vue";
import { access_request_table_strings as strings } from "./AccessRequestTable.strings.ts";
import { mountTestApp } from "../../test-app.ts";
import { accessRequestStubs } from "../../requests/access-requests/list.fake.ts";

describe("AccessRequestTable", () => {
  stubGlobals();

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  it("should render the component", async () => {
    const wrapper = mountTestApp(AccessRequestTable, {
      props: {
        accessRequest: accessRequestStubs[0],
      },
    });

    // Check that the component renders with the expected strings
    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });
});
