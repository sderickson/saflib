import { secretsHandler } from "../../typed-fake.ts";

export const serviceTokenStubs = [
  {
    id: "token-1",
    service_name: "test-service-1",
    service_version: "1.0.0",
    approved: false,
    approved_by: null,
    approved_at: null,
    requested_at: 1640995200000,
    access_count: 0,
  },
  {
    id: "token-2",
    service_name: "test-service-2",
    service_version: "2.0.0",
    approved: true,
    approved_by: "admin@example.com",
    approved_at: 1640995300000,
    requested_at: 1640995200000,
    access_count: 5,
  },
  {
    id: "token-3",
    service_name: "test-service-1",
    service_version: "1.1.0",
    approved: false,
    approved_by: null,
    approved_at: null,
    requested_at: 1640995200000,
    access_count: 0,
  },
];

export const listServiceTokensHandler = secretsHandler({
  verb: "get",
  path: "/service-tokens",
  status: 200,
  handler: async ({ query }) => {
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const approved = query?.approved;
    const serviceName = query?.service_name;

    let tokens = [...serviceTokenStubs];

    // Filter by approved status if provided
    if (approved !== undefined) {
      const isApproved = approved === "true";
      tokens = tokens.filter((t) => t.approved === isApproved);
    }

    // Filter by service name if provided
    if (serviceName) {
      tokens = tokens.filter((t) => t.service_name === serviceName);
    }

    return tokens.slice(0, limit);
  },
});
