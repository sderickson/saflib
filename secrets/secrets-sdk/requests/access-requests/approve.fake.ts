import { secretsHandler } from "../../typed-fake.ts";
import { accessRequestStubs } from "./list.fake.ts";

export const approveAccessRequestsHandler = secretsHandler({
  verb: "post",
  path: "/access-requests/{id}/approve",
  status: 200,
  handler: async ({ body, params }) => {
    const index = accessRequestStubs.findIndex((stub) => stub.id === params.id);
    if (index !== -1) {
      // Update the existing access request
      accessRequestStubs[index] = {
        ...accessRequestStubs[index],
        status: body.approved ? ("granted" as const) : ("denied" as const),
        granted_by: "admin@example.com", // Fake identity-provided email
        granted_at: Date.now(),
      };
      return accessRequestStubs[index];
    }

    // If not found, return error-like response
    throw new Error("Access request not found");
  },
});
