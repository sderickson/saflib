import { describe, it, expect } from "vitest";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { withVueQuery } from "@saflib/sdk/testing";
import { http, HttpResponse } from "msw";
import type { MetricsResponseBody } from "@saflib/node-metrics-spec";
import { useGetMetricsSnapshot } from "./get-metrics-snapshot.ts";

type SnapshotResponse = MetricsResponseBody["getMetricsSnapshot"][200];

const mockSnapshot: SnapshotResponse = {
  metrics: [
    {
      name: "demo_up",
      type: "gauge",
      labels: {},
      value: 1,
    },
  ],
};

describe("useGetMetricsSnapshot", () => {
  setupMockServer([
    http.get("http://api.localhost:3000/admin/metrics/snapshot", () =>
      HttpResponse.json(mockSnapshot),
    ),
  ]);

  it("fetches the metrics snapshot", async () => {
    const [query, app] = withVueQuery(() => useGetMetricsSnapshot());
    await query.refetch();
    expect(query.data.value?.metrics).toEqual(mockSnapshot.metrics);
    app.unmount();
  });
});
