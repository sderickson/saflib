import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { stubGlobals } from "@saflib/vue/testing";
import DiagnosticsAsync from "./DiagnosticsAsync.vue";
import { mountTestApp } from "../test-app.ts";

describe("DiagnosticsAsync", () => {
  stubGlobals();

  it("shows the error smoke tests", async () => {
    const wrapper = mountTestApp(DiagnosticsAsync);
    await flushPromises();
    await vi.waitUntil(() => wrapper.find("h1").exists());
    expect(wrapper.find("h1").text()).toBe("Diagnostics");
    expect(wrapper.text()).toContain("test backend error");
  });
});
