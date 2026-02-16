import { __serviceName__Handler } from "../../typed-fake.ts";

// TODO: Import the shared mock data array from ./mocks.ts and use it in the handler.
// If this is a list endpoint, define the mock array in ./mocks.ts and read from it here.
// If this is a get/detail endpoint, find the item in the mock array by ID.

export const __queryName____GroupName__Handler = __serviceName__Handler({
  verb: "get",
  path: "/__group-name__/__query-name__",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    return [];
  },
});
