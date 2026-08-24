import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { stubGlobals } from "@saflib/vue/testing";
import type { ErrorsResponseBody } from "@saflib/errors-spec";
import ErrorsPage from "./ErrorsPage.vue";
import { mountTestApp } from "../test-app";

type ListReportedErrorsResponse =
  ErrorsResponseBody["listReportedErrors"][200];

const mockErrors: ListReportedErrorsResponse = {
  reportedErrors: [
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

vi.mock("@saflib/errors-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@saflib/errors-sdk")>();
  return {
    ...actual,
    useListReportedErrors: () => ({
      data: ref(mockErrors),
      error: ref(null),
      isLoading: ref(false),
      refetch: vi.fn(),
    }),
  };
});

describe("ErrorsPage", () => {
  beforeEach(() => {
    stubGlobals();
  });

  it("renders unified client, CSP, and test errors", async () => {
    const wrapper = mountTestApp(ErrorsPage, {
      props: { subdomain: "test" },
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Vue render failed");
    });
    expect(wrapper.text()).toContain("csp-violation");
    expect(wrapper.text()).toContain("Intentional admin test error");
    expect(wrapper.text()).toContain("Errors");
  });
});
