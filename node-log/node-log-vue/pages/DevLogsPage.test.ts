import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import type { DevLogResponseBody } from "@saflib/node-log-spec";
import DevLogsPage from "./DevLogsPage.vue";
import { mountTestApp } from "../test-app";

type ListDevLogsResponse = DevLogResponseBody["listDevLogs"][200];

const mockLogs: ListDevLogsResponse = {
  logs: [
    {
      id: 1,
      level: "info",
      message: "server started",
      timestamp: "2026-01-01T00:00:00.000Z",
      subsystem_name: "api.http",
      operation_name: "boot",
    },
    {
      id: 2,
      level: "warn",
      message: "slow query",
      timestamp: "2026-01-01T00:00:01.000Z",
      meta: { ms: 1200 },
    },
  ],
};

vi.mock("@saflib/node-log-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@saflib/node-log-sdk")>();
  return {
    ...actual,
    useStreamDevLogs: () => ({
      logs: ref(mockLogs.logs),
      status: ref("live" as const),
      errorMessage: ref(""),
      reconnect: vi.fn(),
      clearLocal: vi.fn(),
    }),
  };
});

const handlers = [
  http.get("http://api.localhost:3000/dev/logs", () => {
    return HttpResponse.json(mockLogs);
  }),
];

describe("DevLogsPage", () => {
  beforeEach(() => {
    stubGlobals();
    setupMockServer(handlers);
  });

  it("renders log entries from the list endpoint", async () => {
    const wrapper = mountTestApp(DevLogsPage, {
      props: {},
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("server started");
    });
    expect(wrapper.text()).toContain("slow query");
    expect(wrapper.text()).toContain("Server Logs");
  });

  it("filters logs by search text", async () => {
    const wrapper = mountTestApp(DevLogsPage, {
      props: {},
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("server started");
    });

    const filter = wrapper.find('input[type="search"]');
    await filter.setValue("slow");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("slow query");
      expect(wrapper.text()).not.toContain("server started");
    });
  });
});
