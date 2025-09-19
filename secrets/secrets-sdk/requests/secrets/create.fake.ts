import { secretsHandler } from "../../typed-fake.ts";

export const createSecretsHandler = secretsHandler({
  verb: "post",
  path: "/secrets",
  status: 201,
  handler: async ({ body }) => {
    return {
      id: "secret-new",
      name: body.name,
      description: body.description,
      masked_value: "new_secret***",
      created_at: Date.now(),
      updated_at: Date.now(),
      is_active: true,
    };
  },
});
