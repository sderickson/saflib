import { __serviceName__Handler } from "../../typed-fake.ts";

// BEGIN WORKFLOW AREA query-fake FOR sdk/add-query
// TODO: If this is a list endpoint, create a list of stubs here and export them.

export const __targetName____GroupName__Handler = __serviceName__Handler({
  verb: "get",
  path: "/__group-name__/__target-name__",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    return [];
  },
});
// END WORKFLOW AREA
// BEGIN WORKFLOW AREA mutation-fake FOR sdk/add-mutation
// TODO: Import the store from the list fake and update it accordingly.

export const __targetName____GroupName__Handler = __serviceName__Handler({
  verb: "post",
  path: "/__group-name__/__target-name__",
  status: 200,
  // @ts-expect-error TODO: update verb, path, status, and handler to match the endpoint
  handler: async (req) => {
    return {};
  },
});
// END WORKFLOW AREA
