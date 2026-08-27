// @ts-nocheck — scaffold placeholders until sdk/add-query or sdk/add-mutation copies this file.
import { afterEach, describe, it, expect } from "vitest";
import { __queryName____GroupName__Query } from "./__query-name__.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { useQuery } from "@tanstack/vue-query";
import { setupScopedMockServer } from "#testing.ts";
import { __queryName____GroupName__Handler } from "./__query-name__.fake.ts";
// @ts-expect-error TODO: use mock data
import { mock__GroupName__, resetMocks } from "./mocks.ts";

describe("__queryName____GroupName__", () => {
  setupScopedMockServer([__queryName____GroupName__Handler]);
  afterEach(resetMocks);

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
