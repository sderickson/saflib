import { __serviceName__Handler } from "../../typed-fake.ts";

export const __mutationName____GroupName__Handler = __serviceName__Handler({
  verb: "post",
  path: "/__group-name__/__mutation-name__",
  status: 200,
  // @ts-expect-error TODO: update verb, path, status, and handler to match the endpoint
  handler: async (req) => {
    return {};
  },
});
