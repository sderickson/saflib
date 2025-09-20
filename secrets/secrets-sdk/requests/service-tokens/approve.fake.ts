import { secretsHandler } from "../../typed-fake.ts";

export const approveServiceTokensHandler = secretsHandler({
  verb: "post",
  path: "/service-tokens/{id}/approve",
  status: 200,
  handler: async ({ body }) => {
    return {
      id: "token-1", // For now, hardcode the ID since path params aren't working as expected
      service_name: "test-service-1",
      token_hash: "test-hash-1-very-long-hash-value",
      service_version: "1.0.0",
      approved: body.approved,
      approved_by: body.approved_by,
      approved_at: Date.now(),
      requested_at: 1640995200000,
      access_count: 0,
    };
  },
});
