import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import type { AnalyticsResponseBody } from "@saflib/analytics-spec";
import ProductEventsPage from "./ProductEventsPage.vue";
import { mountTestApp } from "../../test-app.ts";

type ListProductEventsResponse =
  AnalyticsResponseBody["listProductEvents"][200];

const mockEvents: ListProductEventsResponse = {
  product_events: [
    {
      id: 1,
      name: "login",
      source: "client",
      timestamp: "2026-01-01T00:00:00.000Z",
      payload: {
        event: "login",
        client: "web-auth",
        context: { method: "email" },
      },
    },
    {
      id: 2,
      name: "server_boot",
      source: "server",
      timestamp: "2026-01-01T00:00:01.000Z",
      payload: { event: "server_boot" },
    },
  ],
};

const handlers = [
  http.get("http://api.localhost:3000/admin/product-events", () => {
    return HttpResponse.json(mockEvents);
  }),
];

describe("ProductEventsPage", () => {
  stubGlobals();
  setupMockServer(handlers);

  it("renders client and server events from the list endpoint", async () => {
    const wrapper = mountTestApp(ProductEventsPage, {
      props: {},
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("login");
    });
    expect(wrapper.text()).toContain("server_boot");
    expect(wrapper.text()).toContain("client");
    expect(wrapper.text()).toContain("server");
    expect(wrapper.text()).toContain("Product events");
  });
});
