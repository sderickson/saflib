import { exampleHandler } from "../../typed-fake.ts";

export const listSecretsHandler = exampleHandler({
  verb: "get",
  path: "/secrets/list",
  status: 200,
  // @ts-expect-error TODO: replace with actual response data
  handler: async () => {
    return [];
  },
});
