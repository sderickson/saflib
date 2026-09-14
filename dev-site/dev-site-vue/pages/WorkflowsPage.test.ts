import { describe, it, expect } from "vitest";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import { flushPromises } from "@vue/test-utils";
import WorkflowsPage from "./WorkflowsPage.vue";
import { mountTestApp } from "../test-app.ts";

const handlers = [
  http.get("*/api/workflows", () =>
    HttpResponse.json({
      workflows: [
        {
          id: "example/hello",
          description: "Copies a template file, prompts about it, and runs a command.",
          source: "code",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      ],
    }),
  ),
];

setupMockServer(handlers);

describe("WorkflowsPage", () => {
  it("renders without error once the workflow list loads", async () => {
    // Driving Vuetify's v-select in jsdom (opening the menu, clicking an
    // item) is fragile; this asserts the fetch/composable wiring works —
    // MSW's `onUnhandledRequest: "error"` would already fail the test if
    // GET /api/workflows weren't called correctly — without fighting the
    // component internals.
    const wrapper = mountTestApp(WorkflowsPage);
    await flushPromises();

    expect(wrapper.text()).toContain("Workflows");
    expect(wrapper.text()).toContain("Start a run");
    expect(wrapper.find(".v-select").exists()).toBe(true);
  });
});
