import { secretsHandler } from "../../typed-fake.ts";
import { serviceTokenStubs } from "./list.fake.ts";

export const approveServiceTokensHandler = secretsHandler({
  verb: "post",
  path: "/service-tokens/{id}/approve",
  status: 200,
  handler: async ({ body, params }) => {
    const index = serviceTokenStubs.findIndex((stub) => stub.id === params.id);
    if (index !== -1) {
      // Update the existing service token
      serviceTokenStubs[index] = {
        ...serviceTokenStubs[index],
        approved: body.approved,
        approved_by: "admin@example.com", // Fake identity-provided email
        approved_at: Date.now(),
      };
      return serviceTokenStubs[index];
    }

    // If not found, return error-like response
    throw new Error("Service token not found");
  },
});
