import { secretsHandler } from "../../typed-fake.ts";
import { secretStubs } from "./list.fake.ts";

export const deleteSecretsHandler = secretsHandler({
  verb: "delete",
  path: "/secrets/{id}",
  status: 200,
  handler: async ({ params }) => {
    const index = secretStubs.findIndex((stub) => stub.id === params.id);
    if (index !== -1) {
      secretStubs.splice(index, 1);
    }
    return {
      message: "Secret deleted successfully",
    };
  },
});
