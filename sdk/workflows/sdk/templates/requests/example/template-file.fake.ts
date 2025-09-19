import { templateFileHandler } from "../../typed-fake.ts";

export const __extendedName__Handler = templateFileHandler({
  verb: "get",
  path: "/__resource-name__/__operation-name__",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    return [];
  },
});
