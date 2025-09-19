import { secretsHandler } from "../../typed-fake.ts";

export const listSecretsHandler = secretsHandler({
  verb: "get",
  path: "/secrets",
  status: 200,
  handler: async ({ query }) => {
    type query = typeof query;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    return [
      {
        id: "secret-1",
        name: "database-password",
        description: "Main database password",
        masked_value: "db_pass***",
        created_at: 1640995200000,
        updated_at: 1640995200000,
        is_active: true,
      },
      {
        id: "secret-2",
        name: "api-key",
        description: "External API key",
        masked_value: "api_key***",
        created_at: 1640995200000,
        updated_at: 1640995200000,
        is_active: true,
      },
    ].slice(0, limit);
  },
});
