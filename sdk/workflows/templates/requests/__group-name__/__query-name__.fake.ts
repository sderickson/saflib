import { __serviceName__Handler } from "../../typed-fake.ts";

// @ts-expect-error TODO: use mock data
import { mock__GroupName__ } from "./mocks.ts";

export const __queryName____GroupName__Handler = __serviceName__Handler({
  verb: "get",
  path: "/__group-name__/__query-name__",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    return [];
  },
});
