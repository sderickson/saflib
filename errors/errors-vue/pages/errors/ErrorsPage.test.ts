import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import type { ErrorsResponseBody } from "@saflib/errors-spec";
import ErrorsPage from "./ErrorsPage.vue";
import { mountTestApp } from "../../test-app.ts";

type ListReportedErrorsResponse =
  ErrorsResponseBody["listReportedErrors"][200];

const mockErrors: ListReportedErrorsResponse = {
  reported_errors: [
    {
      id: 1,
      kind: "client",
      message: "Vue render failed",
      source: "web-admin",
      timestamp: "2026-01-01T00:00:00.000Z",
      metadata: {},
      stack: "Error: Vue render failed",
    },
    {
      id: 2,
      kind: "csp-violation",
      message: "Content-Security-Policy violation",
      source: "browser",
      timestamp: "2026-01-01T00:00:01.000Z",
      metadata: { cspReport: { "violated-directive": "img-src" } },
    },
    {
      id: 3,
      kind: "test",
      message: "Intentional admin test error id=abc",
      source: "init",
      timestamp: "2026-01-01T00:00:02.000Z",
      metadata: { level: "error" },
    },
  ],
};

const handlers = [
  http.get("http://api.localhost:3000/admin/errors", () => {
    return HttpResponse.json(mockErrors);
  }),
];

describe("ErrorsPage", () => {
  stubGlobals();
  setupMockServer(handlers);

  it("renders unified client, CSP, and test errors", async () => {
    const wrapper = mountTestApp(ErrorsPage, {
      props: {},
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Vue render failed");
    });
    expect(wrapper.text()).toContain("csp-violation");
    expect(wrapper.text()).toContain("Intentional admin test error");
    expect(wrapper.text()).toContain("Errors");
  });
});
