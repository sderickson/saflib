import { secretsHandler } from "../../typed-fake.ts";
import { secretStubs } from "./list.fake.ts";

export const updateSecretsHandler = secretsHandler({
  verb: "put",
  path: "/secrets/{id}",
  status: 200,
  handler: async ({ body, params }) => {
    const index = secretStubs.findIndex((stub) => stub.id === params.id);
    if (index !== -1) {
      // Update the existing secret
      secretStubs[index] = {
        ...secretStubs[index],
        description: body.description || secretStubs[index].description,
        is_active:
          body.is_active !== undefined
            ? body.is_active
            : secretStubs[index].is_active,
        updated_at: Date.now(),
      };
      console.log("secretStubs after update", secretStubs);
      return secretStubs[index];
    }

    // If not found, return error-like response
    throw new Error("Secret not found");
  },
});
