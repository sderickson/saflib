import { secretsHandler } from "../../typed-fake.ts";

export const approveAccessRequestsHandler = secretsHandler({
  verb: "post",
  path: "/access-requests/{id}/approve",
  status: 200,
  handler: async ({ body }) => {
    return {
      id: "request-1", // For now, hardcode the ID since path params aren't working as expected
      secret_id: "secret-1",
      secret_name: "database-password",
      service_name: "test-service-1",
      status: body.approved ? ("granted" as const) : ("denied" as const),
      requested_at: 1640995200000,
      granted_by: "admin@example.com", // Fake identity-provided email
      granted_at: Date.now(),
      access_count: 0,
    };
  },
});
