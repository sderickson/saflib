import { describe, it, expect } from "vitest";
// BEGIN WORKFLOW AREA query-test-imports FOR sdk/add-query
import { __targetName____GroupName__Query } from "./__target-name__.ts";
// END WORKFLOW AREA
// BEGIN WORKFLOW AREA mutation-test-imports FOR sdk/add-mutation
import { use__TargetName____GroupName__Mutation } from "./__target-name__.ts";
// END WORKFLOW AREA
import { __serviceName__ServiceFakeHandlers } from "../../fakes.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
// BEGIN WORKFLOW AREA query-test-use-query-import FOR sdk/add-query
import { useQuery } from "@tanstack/vue-query";
// END WORKFLOW AREA

describe("__targetName____GroupName__", () => {
  setupMockServer(__serviceName__ServiceFakeHandlers);

// BEGIN WORKFLOW AREA query-test-body FOR sdk/add-query
  // TODO: Make sure the fake data gets returned, and unskip this test
  it.skip("TODO", async () => {
    const [query, app] = withVueQuery(() =>
      useQuery(__targetName____GroupName__Query({})),
    );

    await query.refetch();
    expect(query.data).toBeDefined();

    app.unmount();
  });
// END WORKFLOW AREA
// BEGIN WORKFLOW AREA mutation-test-body FOR sdk/add-mutation
  // TODO: Update to call the mutation with correct arguments and verify the response
  it.skip("TODO: should succeed", async () => {
    const [mutation, app] = withVueQuery(() => use__TargetName____GroupName__Mutation());

    // TODO: update the argument to match the mutation's expected input
    const result = await mutation.mutateAsync({} as never);

    expect(result).toBeDefined();

    app.unmount();
  });

  // TODO: Test cache invalidation - verify that related queries are refreshed after mutation
  it.skip("TODO: should invalidate cache", async () => {
    // TODO: set up a query, run the mutation, refetch the query, and verify the data changed
  });
// END WORKFLOW AREA
});
