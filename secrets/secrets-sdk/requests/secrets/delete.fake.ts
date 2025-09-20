import { secretsHandler } from "../../typed-fake.ts";

export const deleteSecretsHandler = secretsHandler({
  verb: "delete",
  path: "/secrets/{id}",
  status: 200,
  handler: async () => {
    return {
      message: "Secret deleted successfully",
    };
  },
});
