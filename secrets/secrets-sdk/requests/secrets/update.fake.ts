import { secretsHandler } from "../../typed-fake.ts";

export const updateSecretsHandler = secretsHandler({
  verb: "put",
  path: "/secrets/{id}",
  status: 200,
  handler: async ({ body }) => {
    return {
      id: "secret-1", // For now, hardcode the ID since path params aren't working as expected
      name: "updated-secret",
      description: body.description || "Updated secret description",
      masked_value: "updated_secret***",
      created_at: 1640995200000,
      updated_at: Date.now(),
      is_active: body.is_active !== undefined ? body.is_active : true,
    };
  },
});
