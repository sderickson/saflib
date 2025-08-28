import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import TemplateFileAsync from "./TemplateFileAsync.vue";
import { template_file_page as strings } from "./TemplateFile.strings.ts";
// TODO: Fix this import to point to the actual one for this package
import { mountTestApp } from "../spa-template/test-app.ts";

describe("TemplateFile", () => {
  stubGlobals();

  const getExampleHeader = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  it("should render the example strings", async () => {
    const wrapper = mountTestApp(TemplateFileAsync);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getExampleHeader(wrapper).exists());
    expect(getExampleHeader(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
  });
});
