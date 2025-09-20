import { secretsHandler } from "../../typed-fake.ts";

export const listAccessRequestsHandler = secretsHandler({
  verb: "get",
  path: "/access-requests",
  status: 200,
  handler: async ({ query }) => {
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const status = query?.status;
    const serviceName = query?.service_name;

    let requests = [
      {
        id: "request-1",
        secret_id: "secret-1",
        secret_name: "database-password",
        service_name: "test-service-1",
        status: "pending" as const,
        requested_at: 1640995200000,
        granted_by: null,
        granted_at: null,
        access_count: 0,
      },
      {
        id: "request-2",
        secret_id: "secret-2",
        secret_name: "api-key",
        service_name: "test-service-2",
        status: "granted" as const,
        requested_at: 1640995200000,
        granted_by: "admin@example.com",
        granted_at: 1640995300000,
        access_count: 5,
      },
      {
        id: "request-3",
        secret_id: "secret-1",
        secret_name: "database-password",
        service_name: "test-service-1",
        status: "denied" as const,
        requested_at: 1640995200000,
        granted_by: "admin@example.com",
        granted_at: 1640995400000,
        access_count: 0,
      },
    ];

    // Filter by status if provided
    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    // Filter by service name if provided
    if (serviceName) {
      requests = requests.filter((r) => r.service_name === serviceName);
    }

    return requests.slice(0, limit);
  },
});
