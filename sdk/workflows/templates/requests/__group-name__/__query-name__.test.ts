import { describe, it, expect } from "vitest";
import { __queryName____GroupName__Query } from "./__query-name__.ts";
import { __serviceName__ServiceFakeHandlers } from "../../fakes.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { useQuery } from "@tanstack/vue-query";
// TODO: Import mock data to set up test state
// import { mock__GroupName__ } from "./mocks.ts";

describe("__queryName____GroupName__", () => {
  setupMockServer(__serviceName__ServiceFakeHandlers);

  // TODO: Make sure the fake data gets returned, and unskip this test
  it.skip("TODO", async () => {
    const [query, app] = withVueQuery(() =>
      useQuery(__queryName____GroupName__Query({})),
    );

    await query.refetch();
    expect(query.data).toBeDefined();

    app.unmount();
  });
});
