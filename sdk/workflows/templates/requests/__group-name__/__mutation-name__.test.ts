import { describe, it, expect } from "vitest";
import { use__MutationName____GroupName__Mutation } from "./__mutation-name__.ts";
import { __serviceName__ServiceFakeHandlers } from "../../fakes.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("__mutationName____GroupName__", () => {
  setupMockServer(__serviceName__ServiceFakeHandlers);

  // TODO: Update to call the mutation with correct arguments and verify the response
  it.skip("TODO: should succeed", async () => {
    const [mutation, app] = withVueQuery(() => use__MutationName____GroupName__Mutation());

    // TODO: update the argument to match the mutation's expected input
    const result = await mutation.mutateAsync({} as never);

    expect(result).toBeDefined();

    app.unmount();
  });

  // TODO: Test cache invalidation - verify that related queries are refreshed after mutation
  it.skip("TODO: should invalidate cache", async () => {
    // TODO: set up a query, run the mutation, refetch the query, and verify the data changed
  });
});
