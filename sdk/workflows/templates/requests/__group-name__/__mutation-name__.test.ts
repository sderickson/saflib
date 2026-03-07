import { afterEach, describe, it, expect } from "vitest";
import { use__MutationName____GroupName__Mutation } from "./__mutation-name__.ts";
import { __serviceName__ServiceFakeHandlers } from "../../fakes.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
// @ts-expect-error TODO: use mock data
import { mock__GroupName__, resetMocks } from "./mocks.ts";

describe("__mutationName____GroupName__", () => {
  setupMockServer(__serviceName__ServiceFakeHandlers);
  afterEach(resetMocks);

  // BEGIN ONCE WORKFLOW AREA instructions FOR sdk/add-mutation IF upload
  /*
  For file-upload mutations, create a stub file and pass it to the mutation:

  const mockFile = new File(["test,data\n1,2"], "test.csv", { type: "text/csv" });
  await mutation.mutateAsync(mockFile);  // or mutateAsync({ file: mockFile }) if your mutation takes an object

  Then assert on mutation.data.value (e.g. expect(mutation.data.value?.id).toBe("...")).
  */
  // END WORKFLOW AREA

  // BEGIN ONCE WORKFLOW AREA instructions FOR sdk/add-mutation IF download
  /*
  For download mutations, call the mutation and assert on the returned blob/arrayBuffer
  (e.g. expect(result instanceof Blob).toBe(true), or expect(new Uint8Array(await result.arrayBuffer()).length).toBeGreaterThan(0)).
  */
  // END WORKFLOW AREA

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
