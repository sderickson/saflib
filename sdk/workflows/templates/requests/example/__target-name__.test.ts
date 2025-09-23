import { describe, it, expect } from "vitest";
import { __targetName____GroupName__Query } from "./__target-name__.ts";
import { __serviceName__ServiceFakeHandlers } from "../../fakes.ts";
import { setupMockServer, withVueQuery } from "@saflib/sdk/testing";
import { useQuery } from "@tanstack/vue-query";

describe("__targetName____GroupName__", () => {
  setupMockServer(__serviceName__ServiceFakeHandlers);

  // TODO: Make sure the fake data gets returned, and unskip this test
  it.skip("TODO", async () => {
    const [query, app] = withVueQuery(() =>
      useQuery(__targetName____GroupName__Query({})),
    );

    await query.refetch();
    expect(query.data).toBeDefined();

    app.unmount();
  });
});
