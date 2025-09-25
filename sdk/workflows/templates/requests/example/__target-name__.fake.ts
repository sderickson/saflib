import { __serviceName__Handler } from "../../typed-fake.ts";

// TODO: If this is a list endpoint, create a list of stubs here and export them.

export const __targetName____GroupName__Handler = __serviceName__Handler({
  verb: "get",
  path: "/__group-name__/__target-name__",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    // TODO: If this is an unsafe request (POST, PUT, PATCH, DELETE), then try to update the stubs
    // exported in the "list" endpoint. Don't error if the stub is not found, though, silently fail in that case.
    return [];
  },
});
