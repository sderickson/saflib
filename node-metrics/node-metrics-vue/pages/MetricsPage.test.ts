import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { stubGlobals } from "@saflib/vue/testing";
import type { MetricsResponseBody } from "@saflib/node-metrics-spec";
import MetricsPage from "./MetricsPage.vue";
import { mountTestApp } from "../test-app";

type SnapshotResponse = MetricsResponseBody["getMetricsSnapshot"][200];

const mockSnapshot: SnapshotResponse = {
  metrics: [
    {
      name: "demo_requests_total",
      type: "counter",
      help: "Demo counter",
      labels: { route: "home" },
      value: 3,
    },
    {
      name: "http_request_duration_seconds",
      type: "histogram",
      labels: { method: "GET" },
      buckets: [
        { le: "0.1", count: 2 },
        { le: "+Inf", count: 4 },
      ],
      sum: 0.5,
      count: 4,
    },
  ],
};

vi.mock("@saflib/node-metrics-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@saflib/node-metrics-sdk")>();
  return {
    ...actual,
    useGetMetricsSnapshot: () => ({
      data: ref(mockSnapshot),
      error: ref(null),
      isLoading: ref(false),
      refetch: vi.fn(),
    }),
  };
});

describe("MetricsPage", () => {
  beforeEach(() => {
    stubGlobals();
  });

  it("renders metric rows from the snapshot endpoint", async () => {
    const wrapper = mountTestApp(MetricsPage, {
      props: {},
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("demo_requests_total");
    });
    expect(wrapper.text()).toContain("Metrics");
    expect(wrapper.text()).toContain("http_request_duration_seconds");
    expect(wrapper.text()).toContain("method: GET");
    expect(wrapper.text()).toContain("≤ 0.1");
  });

  it("filters metrics by selected name", async () => {
    const wrapper = mountTestApp(MetricsPage, {
      props: {},
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("demo_requests_total");
    });

    const selects = wrapper.findAllComponents({ name: "VSelect" });
    await selects[0]?.vm.$emit("update:modelValue", "demo_requests_total");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("demo_requests_total");
      expect(wrapper.text()).not.toContain("http_request_duration_seconds");
    });
  });
});
