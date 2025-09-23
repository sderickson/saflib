import { __serviceName__Handler } from "../../typed-fake.ts";

export const __targetName____GroupName__Handler = __serviceName__Handler({
  verb: "get",
  path: "/__group-name__/__target-name__",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    return [];
  },
});
