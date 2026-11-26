import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import { createRouter, createMemoryHistory } from "vue-router";
import ShortId from "./ShortId.vue";
import { stubGlobals } from "../testing/index.ts";
import { configureIdLinks } from "../src/id-links.ts";

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/:p(.*)*", component: { template: "<div/>" } }] });
const mountId = (prefix: string) =>
  mount(ShortId, { props: { id: "req-123", prefix }, global: { plugins: [createVuetify(), router] }, attachTo: document.body });

describe("ShortId links", () => {
  stubGlobals();
  afterEach(() => configureIdLinks({}));

  it("offers configured links for its prefix on hover", async () => {
    configureIdLinks({ r: (id) => [{ label: "Server logs", to: `/ops-logs?id=${id}` }] });
    const wrapper = mountId("r");
    expect(wrapper.find(".short-id--linked").exists()).toBe(true);
    await wrapper.find("[data-test=short-id]").trigger("mouseenter");
    await vi.waitFor(() => expect(document.querySelector("[data-test=short-id-link]")?.getAttribute("href")).toBe("/ops-logs?id=req-123"), { timeout: 2000 });
    wrapper.unmount();
  });

  it("stays a plain copy button without links", () => {
    const wrapper = mountId("x");
    expect(wrapper.find(".short-id--linked").exists()).toBe(false);
    wrapper.unmount();
  });
});
