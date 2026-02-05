import { __serviceName__Handler } from "../../typed-fake.ts";

// TODO: If this is a list endpoint, create a list of stubs here and export them.

export const __queryName____GroupName__Handler = __serviceName__Handler({
  verb: "get",
  path: "/__group-name__/__query-name__",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    return [];
  },
});
